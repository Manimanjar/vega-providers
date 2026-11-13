// @vega-provider xvideos
// @vega-version 1.1
"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.xvideos.com";
var memoryCache = { data: null, expiresAt: 0 };

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

var getStream = async function (params) {
  var link = params.link;
  var signal = params.signal;
  var providerContext = params.providerContext;
  var isDownload = params.isDownload;

  var axios = providerContext.axios;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  var videoPageUrl = link.startsWith("http")
    ? link
    : baseUrl + (link.startsWith("/") ? "" : "/") + link;

  var defaultHeaders = Object.assign({}, commonHeaders, {
    Referer: baseUrl,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  try {
    var res = await axios.get(videoPageUrl, {
      headers: defaultHeaders,
      signal: signal,
      maxRedirects: 5,
    });

    updateLearnedDomain(res, baseUrl, kvStore);

    var html = res.data;
    var streams = [];

    // 1. HLS Adaptive Stream (.m3u8)
    var hlsMatch = html.match(
      /html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    if (hlsMatch && hlsMatch[1]) {
      streams.push({
        server: "HLS Adaptive (Best)",
        link: hlsMatch[1],
        type: "m3u8",
        quality: "auto",
        headers: {
          Referer: baseUrl,
          "User-Agent": defaultHeaders["User-Agent"],
        },
      });
    }

    // 2. High Quality Direct MP4
    var highMatch = html.match(
      /html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    if (highMatch && highMatch[1]) {
      streams.push({
        server: "Direct MP4 (High)",
        link: highMatch[1],
        type: "mp4",
        quality: "720",
        headers: {
          Referer: baseUrl,
          "User-Agent": defaultHeaders["User-Agent"],
        },
      });
    }

    // 3. Low Quality Direct MP4
    var lowMatch = html.match(
      /html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    if (lowMatch && lowMatch[1]) {
      streams.push({
        server: "Direct MP4 (Low)",
        link: lowMatch[1],
        type: "mp4",
        quality: "360",
        headers: {
          Referer: baseUrl,
          "User-Agent": defaultHeaders["User-Agent"],
        },
      });
    }

    if (isDownload) {
      streams.sort(function (a, b) {
        if (a.type === "mp4" && b.type !== "mp4") return -1;
        if (a.type !== "mp4" && b.type === "mp4") return 1;
        return 0;
      });
    }

    return streams;
  } catch (err) {
    console.error("XVideos stream extraction error:", err && err.message ? err.message : err);
    return [];
  }
};

exports.getStream = getStream;
