import { Post, ProviderContext } from "../types";
import config from "../categories.config.json";

"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.xvideos.com";
var memoryCache = { data: null, expiresAt: 0 };
// Persistent base-URL cache key (kvStore survives sandbox re-evaluation;
// module-level memoryCache does not, so without this every category
// fetch paid a ~350ms urls.json round-trip before it even started).
var BASE_CACHE_KEY = "xvideos_baseUrlCacheV1";

function formatDuration(totalSeconds) {
  var s = Math.max(0, Math.floor(totalSeconds || 0));
  if (!s) return "";
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  var mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" + mm : mm) + ":" + String(sec).padStart(2, "0");
}
// NOTE: no module-global seen-video set. Dedup is per-page inside
// parseVideoGrid. A global set made every refresh / category switch
// return 0 posts once a video had been seen once (black screen).

async function getBase(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        var cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {}
  }

  var now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    var cachedEntry = memoryCache.data["xvideos"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  // Persistent cache: Vega re-evaluates the module per invoke, so the
  // in-memory cache above is usually empty. kvStore is local and fast.
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        var cached =
          typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > Date.now()) {
          return String(cached.url).replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 2500 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        var entry = res.data["xvideos"];
        if (entry && entry.url) {
          var cleanEntry = entry.url.replace(/\/+$/, "");
          if (kvStore && typeof kvStore.set === "function") {
            try {
              await kvStore.set(
                BASE_CACHE_KEY,
                JSON.stringify({ url: cleanEntry, expiresAt: now + 3600000 })
              );
            } catch (e) {}
          }
          return cleanEntry;
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      var learned = await kvStore.get("xvideos_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

function updateLearnedDomain(res, baseUrl, kvStore) {
  try {
    var finalUrl =
      (res && res.request && (res.request.responseURL || (res.request.res && res.request.res.responseUrl))) ||
      (res && res.config && res.config.url);
    if (finalUrl && typeof finalUrl === "string") {
      var parsed = new URL(finalUrl);
      var origin = parsed.origin;
      if (origin && origin !== baseUrl && kvStore && typeof kvStore.set === "function") {
        kvStore.set("xvideos_learnedDomain", origin);
      }
    }
  } catch (e) {}
}

// Natural, case-insensitive title comparison ("Part 2" before "Part 10").
// Implemented by hand so it behaves the same in every JS engine Vega's
// sandbox may use, without relying on localeCompare options.
function compareTitle(a, b) {
  var ax = String(a).toLowerCase().split(/(\d+)/);
  var bx = String(b).toLowerCase().split(/(\d+)/);
  for (var i = 0; i < Math.max(ax.length, bx.length); i++) {
    if (ax[i] === undefined) return -1;
    if (bx[i] === undefined) return 1;
    if (ax[i] === bx[i]) continue;
    var an = Number(ax[i]);
    var bn = Number(bx[i]);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    return ax[i] < bx[i] ? -1 : 1;
  }
  return 0;
}

function interleavePosts(groups) {
  var result = [];
  var maxLength = groups.reduce(function (max, group) {
    return Math.max(max, group.length);
  }, 0);

  for (var i = 0; i < maxLength; i++) {
    for (var g = 0; g < groups.length; g++) {
      if (groups[g][i]) {
        result.push(groups[g][i]);
      }
    }
  }

  var seen = new Set();
  return result.filter(function (post) {
    if (!post || !post.link) {
      return false;
    }
    if (seen.has(post.link)) {
      return false;
    }
    seen.add(post.link);
    return true;
  });
}

async function parseVideoGrid(options) {
  var url = options.url;
  var baseUrl = options.baseUrl;
  var axios = options.axios;
  var cheerio = options.cheerio;
  var commonHeaders = options.commonHeaders;
  var signal = options.signal;
  var kvStore = options.kvStore;

  try {
    var res = await axios.get(url, {
      timeout: 12000,
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl + "/",
        Origin: baseUrl,
        Accept: "*/*",
      }),
      signal: signal,
      maxRedirects: 5,
    });

    updateLearnedDomain(res, baseUrl, kvStore);

    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];
    var seenVideoIds = new Set();

    $(".thumb-block").each(function (_, element) {
      var $el = $(element);
      var titleLink = $el.find("p.title a, .thumb-under p.title a, .title a").first();
      var rawTitle = titleLink.attr("title") || "";
      if (!rawTitle) {
        var cloned = titleLink.clone();
        cloned.find("span").remove();
        rawTitle = cloned.text().trim();
      }

      var rawHref =
        titleLink.attr("href") ||
        $el.find(".thumb-inside a").first().attr("href") ||
        $el.find("a").first().attr("href") ||
        "";

      if (!rawHref) return;

      if (!rawTitle || /^(?:1080p?|720p?|480p?|4k|hd|cc|sd)(?:\s*(?:cc|hd))*$/i.test(rawTitle.trim())) {
        var parts = rawHref.split("/").filter(Boolean);
        var slug = parts[parts.length - 1] || "";
        rawTitle = decodeURIComponent(slug.replace(/[_-]+/g, " "));
      }

      var idMatch = rawHref.match(/\/video(?:\.([a-zA-Z0-9_-]+)|\/([0-9]+))/i);
      var videoId = idMatch ? (idMatch[1] || idMatch[2]) : rawHref;

      if (seenVideoIds.has(videoId)) {
        return;
      }
      seenVideoIds.add(videoId);

      var img = $el.find("img").first();
      var image =
        img.attr("data-src") ||
        img.attr("data-srcset") ||
        img.attr("src") ||
        "";

      var duration = $el.find(".duration, .video-duration").first().text().trim();
      var durationSec = 0;
      if (duration) {
        var minMatch = duration.match(/(\d+)\s*min/i);
        var secMatch = duration.match(/(\d+)\s*sec/i);
        var hourMatch = duration.match(/(\d+)\s*h/i);
        if (hourMatch) durationSec += parseInt(hourMatch[1], 10) * 3600;
        if (minMatch) durationSec += parseInt(minMatch[1], 10) * 60;
        if (secMatch) durationSec += parseInt(secMatch[1], 10);
      }
      var hdTag = $el.find(".video-hd-mark").first().text().trim();
      // Vega's card shows only ONE badge (cornerTag wins over tag), so
      // the duration was invisible whenever a quality tag existed.
      // Combine them: "14:00 • 1080P" keeps both in the one badge.
      var durationText = formatDuration(durationSec) || duration || undefined;
      var cornerTag = durationText
        ? hdTag
          ? durationText + " • " + hdTag
          : durationText
        : hdTag || undefined;

      var absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image: image,
        tag: durationText,
        _dur: durationSec,
        cornerTag: cornerTag,
      });
    });

    // Alphabetical by title, so parts of the same clip sit together
    // instead of roaming through the pool (was: longest first).
    posts.sort(function (a, b) {
      return compareTitle(a.title || "", b.title || "");
    });
    return posts;
  } catch (err) {
    console.error("XVideos posts error:", err && err.message ? err.message : err);
    return [];
  }
}

function getCategory(filter) {
  return config.categories.find(function (category) {
    return category.filter === filter;
  });
}

export const getPosts = async function (params) {
  var filter = params.filter;
  var page = params.page;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  var category = getCategory(filter);

  if (category && category.mode === "keep_existing") {
    var pNum = page > 1 ? page - 1 : 0;
    var fUrl =
      pNum > 0
        ? baseUrl + "/?k=family&sort=length&p=" + pNum
        : baseUrl + "/?k=family&sort=length";
    return parseVideoGrid({
      url: fUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  if (category && category.mode === "random_feed") {
    // FIX (black screen): XVideos returns HTTP 500 for an empty search
    // "/?k=&p=<n>" on every page (verified live 2026-11-17). The plain
    // homepage "/" and "/new/<n>/" both return 200, so the random
    // Homepage feed now uses /new/<random>/ instead.
    var randomPage = Math.floor(Math.random() * 35) + 1;
    var randomUrl = baseUrl + "/new/" + randomPage + "/?_t=" + Date.now();
    var posts = await parseVideoGrid({
      url: randomUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
    // The page itself is random on every refresh; within it the
    // videos are alphabetical so parts of a clip stay together.
    return posts;
  }

  if (category && category.mode === "multi_query") {
    var queries = Array.isArray(category.xvideosQueries) ? category.xvideosQueries : [];
    if (queries.length === 0) {
      return [];
    }

    var queryResults = await Promise.all(
      queries.map(function (query) {
        var pageIndex = Math.max(0, page - 1);
        // Config queries use "+" as a space ("big+sister"). Encoding it
        // raw turns it into %2B (a literal plus), so XVideos found
        // nothing. Turn "+" into a space before encoding.
        var targetUrl =
          baseUrl +
          "/?k=" +
          encodeURIComponent(String(query).replace(/\+/g, " ")) +
          "&p=" +
          pageIndex;
        return parseVideoGrid({
          url: targetUrl,
          baseUrl: baseUrl,
          axios: axios,
          cheerio: cheerio,
          commonHeaders: commonHeaders,
          signal: signal,
          kvStore: kvStore,
        });
      })
    );

    // Cap the merged list: 7 queries return ~150-180 posts, but Vega
    // only shows the first rows and page 2 fetches the next page anyway.
    // Shipping all of them made the sandbox-bridge transfer and the
    // app's list work much heavier on every scroll/category load.
    // Sort the merged list alphabetically (interleaving alone would
    // scatter parts of the same clip again) and then cap it.
    var merged = interleavePosts(queryResults);
    merged.sort(function (a, b) {
      return compareTitle(a.title || "", b.title || "");
    });
    return merged.slice(0, 60);
  }

  if (filter === "/family/" || filter === "/family") {
    var pNum = page > 1 ? page - 1 : 0;
    var fUrl =
      pNum > 0
        ? baseUrl + "/?k=family&sort=length&p=" + pNum
        : baseUrl + "/?k=family&sort=length";
    return parseVideoGrid({
      url: fUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  // Fallback for old / cached filters ("/", "/?home=1", "4K", "Trending",
  // "/c/...", "/tags/..."). targetUrl MUST be declared: in ESM strict
  // mode assigning to an undeclared variable throws ReferenceError and
  // getPosts rejects, so the provider showed a black screen.
  var targetUrl;
  if (filter === "/?home=1" || filter === "/") {
    if (page === 1) {
      var randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = baseUrl + "/new/" + randomSeed + "/?_t=" + Date.now();
    } else {
      var pageIndex = Math.max(0, page - 1);
      targetUrl = baseUrl + "/new/" + (pageIndex + 1) + "/";
    }
  } else if (filter.startsWith("/c/")) {
    var cleanFilter = filter.replace(/\/+$/, "");
    if (page === 1) {
      targetUrl = baseUrl + cleanFilter + "/";
    } else {
      targetUrl = baseUrl + cleanFilter + "/" + (page - 1) + "/";
    }
  } else if (filter.includes("?")) {
    var pageIndex = Math.max(0, page - 1);
    targetUrl = baseUrl + filter + "&p=" + pageIndex;
  } else {
    var pageIndex = Math.max(0, page - 1);
    targetUrl = pageIndex > 0 ? baseUrl + filter + pageIndex + "/" : baseUrl + filter;
  }

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
  });
};

export const getSearchPosts = async function (params) {
  var searchQuery = params.searchQuery;
  var page = params.page;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  var pageIndex = Math.max(0, page - 1);
  var targetUrl = baseUrl + "/?k=" + encodeURIComponent(searchQuery) + "&p=" + pageIndex;

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
  });
};
