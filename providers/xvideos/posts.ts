import { Post, ProviderContext } from "../types";
import config from "../categories.config.json";

"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.xvideos.com";
var memoryCache = { data: null, expiresAt: 0 };
var seenVideoIds = new Set();

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

  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 4000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        var entry = res.data["xvideos"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
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

function fisherYatesShuffle(list) {
  var arr = list.slice();
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
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

    if (seenVideoIds.size > 3000) {
      seenVideoIds.clear();
    }

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

      var absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image: image,
        tag: duration || undefined,
        _dur: durationSec,
        cornerTag: hdTag || undefined,
      });
    });

    posts.sort(function (a, b) {
      return (b._dur || 0) - (a._dur || 0);
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
    var randomPage = Math.floor(Math.random() * 35) + 1;
    var randomUrl = baseUrl + "/?k=&p=" + randomPage + "&_t=" + Date.now();
    var posts = await parseVideoGrid({
      url: randomUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
    return fisherYatesShuffle(posts);
  }

  if (category && category.mode === "multi_query") {
    var queries = Array.isArray(category.xvideosQueries) ? category.xvideosQueries : [];
    if (queries.length === 0) {
      return [];
    }

    var queryResults = await Promise.all(
      queries.map(function (query) {
        var pageIndex = Math.max(0, page - 1);
        var targetUrl = baseUrl + "/?k=" + encodeURIComponent(query) + "&p=" + pageIndex;
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

    return interleavePosts(queryResults);
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

  if (filter === "/?home=1" || filter === "/") {
    if (page === 1) {
      var randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = baseUrl + "/?k=&p=" + randomSeed + "&_t=" + Date.now();
    } else {
      var pageIndex = Math.max(0, page - 1);
      targetUrl = baseUrl + "/?k=&p=" + pageIndex;
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
