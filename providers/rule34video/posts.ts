import { Post, ProviderContext } from "../types";
import config from "../categories.config.json";

"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://rule34video.com";
var memoryCache = { data: null, expiresAt: 0 };
// Persistent base-URL cache key (kvStore survives sandbox re-evaluation;
// module-level memoryCache does not, so without this every category
// fetch paid a ~350ms urls.json round-trip before it even started).
var BASE_CACHE_KEY = "rule34video_baseUrlCacheV1";

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
    var cachedEntry = memoryCache.data["rule34video"];
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
        var entry = res.data["rule34video"];
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
      var learned = await kvStore.get("rule34video_learnedDomain");
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
        kvStore.set("rule34video_learnedDomain", origin);
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
    var idMatch = post.link.match(/\/video\/([0-9]+)/i);
    var key = idMatch ? idMatch[1] : post.link;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
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
  var requireVideo = options.requireVideo;

  try {
    var res = await axios.get(url, {
      timeout: 12000,
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl + "/",
      }),
      signal: signal,
      maxRedirects: 5,
    });

    updateLearnedDomain(res, baseUrl, kvStore);

    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];
    var seenVideoIds = new Set();

    $(".item.thumb, [data-video-card-id]").each(function (_, element) {
      var $el = $(element);
      var linkEl = $el.find("a.th, a[href*=\"/video/\"]").first();
      var rawHref = linkEl.attr("href") || "";
      var rawTitle =
        linkEl.attr("title") ||
        $el.find("img.thumb").attr("alt") ||
        linkEl.text().trim();

      if (!rawTitle || !rawHref) return;

      if (requireVideo && !/\/video\/|animated|\\.mp4(?:$|[?#])/i.test(rawHref + " " + rawTitle)) {
        return;
      }

      var idMatch = rawHref.match(/\/video\/([0-9]+)/i);
      var videoId = idMatch ? idMatch[1] : rawHref;

      if (seenVideoIds.has(videoId)) {
        return;
      }
      seenVideoIds.add(videoId);

      var img = $el.find("img.thumb, img").first();
      var image =
        img.attr("data-rd-jpg") ||
        img.attr("data-src") ||
        img.attr("src") ||
        "";

      var duration = $el.find(".time").first().text().trim();
      var durationSec = 0;
      if (duration) {
        var dParts = duration.split(":").map(function (part) {
          return parseInt(part, 10) || 0;
        });
        if (dParts.length === 3) {
          durationSec = dParts[0] * 3600 + dParts[1] * 60 + dParts[2];
        } else if (dParts.length === 2) {
          durationSec = dParts[0] * 60 + dParts[1];
        } else if (dParts.length === 1) {
          durationSec = dParts[0];
        }
      }

      if (durationSec > 0 && durationSec < 120) {
        return;
      }

      var isHd = $el.find(".quality").length > 0;
      // Vega's card shows only ONE badge (cornerTag wins over tag), so
      // the duration was invisible whenever HD existed. Combine them:
      // "2:17 • HD" keeps both in the one badge.
      var durationText = formatDuration(durationSec) || duration || undefined;
      var cornerTag = durationText
        ? isHd
          ? durationText + " • HD"
          : durationText
        : isHd
          ? "HD"
          : undefined;

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
    console.error("Rule34Video posts error:", err && err.message ? err.message : err);
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
    var familyUrl =
      page > 1
        ? baseUrl + "/search/family/" + page + "/"
        : baseUrl + "/search/family/";
    return parseVideoGrid({
      url: familyUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  if (category && category.mode === "random_feed") {
    var randomPage = Math.floor(Math.random() * 35) + 1;
    var randomUrl = baseUrl + "/" + randomPage + "/?_t=" + Date.now();
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
    var tags = Array.isArray(category.rule34Tags) ? category.rule34Tags : [];
    if (tags.length === 0) {
      return [];
    }

    var tagResults = await Promise.all(
      tags.map(function (tag) {
        var cleanTag = encodeURIComponent(String(tag).trim().replace(/\s+/g, "-"));
        var searchUrl =
          page > 1
            ? baseUrl + "/search/" + cleanTag + "/" + page + "/"
            : baseUrl + "/search/" + cleanTag + "/";
        return parseVideoGrid({
          url: searchUrl,
          baseUrl: baseUrl,
          axios: axios,
          cheerio: cheerio,
          commonHeaders: commonHeaders,
          signal: signal,
          kvStore: kvStore,
          requireVideo: true,
        });
      })
    );

    // Cap the merged list: 7 tags return ~40-70 posts, and page 2
    // fetches the next page anyway. Shipping all of them made the
    // sandbox-bridge transfer and the app's list work heavier on
    // every scroll/category load.
    // Sort the merged list alphabetically (interleaving alone would
    // scatter parts of the same clip again) and then cap it.
    var merged = interleavePosts(tagResults);
    merged.sort(function (a, b) {
      return compareTitle(a.title || "", b.title || "");
    });
    return merged.slice(0, 60);
  }

  if (filter === "/family/" || filter === "/family") {
    var familyUrl =
      page > 1
        ? baseUrl + "/search/family/" + page + "/"
        : baseUrl + "/search/family/";
    return parseVideoGrid({
      url: familyUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  // Fallback for old / cached filters. targetUrl MUST be declared: in
  // ESM strict mode assigning to an undeclared variable throws
  // ReferenceError and getPosts rejects, so the provider showed a
  // black screen.
  var targetUrl;
  if (filter === "/?home=1" || filter === "/") {
    if (page === 1) {
      var randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = randomSeed > 1 ? baseUrl + "/" + randomSeed + "/?_t=" + Date.now() : baseUrl + "/?_t=" + Date.now();
    } else {
      targetUrl = baseUrl + "/" + page + "/";
    }
  } else if (filter.startsWith("/search/")) {
    var cleanSearch = filter.replace(/\/+$/, "");
    targetUrl = page > 1 ? baseUrl + cleanSearch + "/" + page + "/" : baseUrl + cleanSearch + "/";
  } else if (filter.startsWith("/tags/")) {
    if (filter.includes("?")) {
      targetUrl = page > 1 ? baseUrl + filter + "&from=" + page : baseUrl + filter;
    } else {
      var cleanTag = filter.replace(/\/+$/, "");
      targetUrl = page > 1 ? baseUrl + cleanTag + "/" + page + "/" : baseUrl + cleanTag + "/";
    }
  } else if (filter.includes("?")) {
    targetUrl = page > 1 ? baseUrl + filter + "&from=" + page : baseUrl + filter;
  } else {
    targetUrl = page > 1 ? baseUrl + filter + page + "/" : baseUrl + filter;
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
  var cleanQuery = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-"));
  var targetUrl =
    page > 1
      ? baseUrl + "/search/" + cleanQuery + "/" + page + "/"
      : baseUrl + "/search/" + cleanQuery + "/";

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
    requireVideo: true,
  });
};
