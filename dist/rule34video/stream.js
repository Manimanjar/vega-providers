// @vega-provider rule34video
// @vega-version 1.4
"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://rule34video.com";
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
    var cachedEntry = memoryCache.data["rule34video"];
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
        var entry = res.data["rule34video"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
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

async function resolveDirectUrl(url, axios, defaultHeaders) {
  if (typeof fetch === "function") {
    try {
      var controller =
        typeof AbortController === "function" ? new AbortController() : null;
      var timeoutId = controller
        ? setTimeout(function () {
            controller.abort();
          }, 3500)
        : null;
      var res = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        headers: {
          "User-Agent": defaultHeaders["User-Agent"] || "Mozilla/5.0",
          Referer: defaultHeaders["Referer"] || "https://rule34video.com/",
        },
        signal: controller ? controller.signal : undefined,
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (res && res.status >= 300 && res.status < 400) {
        var loc = res.headers.get("location");
        if (loc && loc.startsWith("http")) return loc;
      }
    } catch (e) {}
  }
  if (axios && typeof axios.head === "function") {
    try {
      var aRes = await axios.head(url, {
        headers: defaultHeaders,
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        },
        timeout: 3500,
      });
      if (aRes && aRes.headers && aRes.headers.location) {
        var aLoc = aRes.headers.location;
        if (aLoc && aLoc.startsWith("http")) return aLoc;
      }
    } catch (e) {
      if (e.response && e.response.headers && e.response.headers.location) {
        var eLoc = e.response.headers.location;
        if (eLoc && eLoc.startsWith("http")) return eLoc;
      }
    }
  }
  return url;
}

var getStream = async function (params) {
  var link = params.link;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  var videoPageUrl = link.startsWith("http")
    ? link
    : baseUrl + (link.startsWith("/") ? "" : "/") + link;

  var defaultHeaders = Object.assign({}, commonHeaders, {
    Referer: baseUrl + "/",
    Origin: baseUrl,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  });

  try {
    var res = await axios.get(videoPageUrl, {
      headers: defaultHeaders,
      signal: signal,
      maxRedirects: 5,
    });
    var html = res.data;
    var streams = [];
    var addedUrls = new Set();
    var seenQualities = new Set();
    var rawVariants = [];

    // 1. Direct flashvars (fastest direct CDN streams)
    var flashVarUrls = [...html.matchAll(/video_(?:alt_)?url\d*:\s*['"](https?:\/\/[^'"]+)['"]/g)];
    var flashVarLabels = [...html.matchAll(/video_(?:alt_)?url\d*_text:\s*['"]([^'"]+)['"]/g)];

    for (var i = 0; i < flashVarUrls.length; i++) {
      var u = flashVarUrls[i][1];
      var lbl = flashVarLabels[i] ? flashVarLabels[i][1] : "";

      if (!u || addedUrls.has(u)) continue;

      var qual = "720";
      var rank = 720;
      var label = "Direct 720p HD (High Speed CDN)";

      if (lbl.includes("4k") || u.includes("2160p") || u.includes("_4k")) {
        qual = "2160";
        rank = 2160;
        label = "Direct 4K Ultra HD (High Speed CDN)";
      } else if (lbl.includes("1080") || u.includes("1080p")) {
        qual = "1080";
        rank = 1080;
        label = "Direct 1080p Full HD (High Speed CDN)";
      } else if (lbl.includes("720") || u.includes("720p")) {
        qual = "720";
        rank = 720;
        label = "Direct 720p HD (High Speed CDN)";
      } else if (lbl.includes("480") || u.includes("480p")) {
        qual = "480";
        rank = 480;
        label = "Direct 480p SD (High Speed CDN)";
      } else if (lbl.includes("360") || u.includes("360p") || u.includes("_360")) {
        qual = "360";
        rank = 360;
        label = "Direct 360p (High Speed CDN)";
      }

      if (seenQualities.has(qual)) continue;
      seenQualities.add(qual);
      addedUrls.add(u);
      rawVariants.push({ label: label, url: u, quality: qual, rank: rank });
    }

    // 2. Fallback to download links only for missing qualities
    var $ = cheerio.load(html);
    $("a.tag_item_download, a[href*='download=true']").each(function (_, el) {
      var href = $(el).attr("href");
      var text = $(el).text().trim();
      if (!href || addedUrls.has(href)) return;

      var qual = "720";
      var rank = 720;
      var label = "Direct 720p HD (High Speed CDN)";

      if (text.includes("2160") || href.includes("2160p") || href.includes("_4k")) {
        qual = "2160";
        rank = 2160;
        label = "Direct 4K Ultra HD (High Speed CDN)";
      } else if (text.includes("1080") || href.includes("1080p")) {
        qual = "1080";
        rank = 1080;
        label = "Direct 1080p Full HD (High Speed CDN)";
      } else if (text.includes("720") || href.includes("720p")) {
        qual = "720";
        rank = 720;
        label = "Direct 720p HD (High Speed CDN)";
      } else if (text.includes("480") || href.includes("480p")) {
        qual = "480";
        rank = 480;
        label = "Direct 480p SD (High Speed CDN)";
      } else if (text.includes("360") || href.includes("360p") || href.includes("_360")) {
        qual = "360";
        rank = 360;
        label = "Direct 360p (High Speed CDN)";
      }

      if (seenQualities.has(qual)) return;
      seenQualities.add(qual);
      addedUrls.add(href);
      rawVariants.push({ label: label, url: href, quality: qual, rank: rank });
    });

    rawVariants.sort(function (a, b) {
      return b.rank - a.rank;
    });

    // Resolve direct CDN links in parallel to completely eliminate DDoS-guard 302 hop latency
    await Promise.all(
      rawVariants.map(async function (item) {
        try {
          var direct = await resolveDirectUrl(item.url, axios, defaultHeaders);
          if (direct && direct.startsWith("http")) {
            item.url = direct;
          }
        } catch (e) {}
      })
    );

    var streamHeaders = {
      Referer: baseUrl + "/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    for (var k = 0; k < rawVariants.length; k++) {
      var v = rawVariants[k];
      streams.push({
        server: v.label,
        link: v.url,
        type: "mp4",
        quality: v.quality,
        headers: streamHeaders,
      });
    }

    return streams;
  } catch (err) {
    console.error("Rule34Video stream extraction error:", err && err.message ? err.message : err);
    return [];
  }
};

exports.getStream = getStream;
