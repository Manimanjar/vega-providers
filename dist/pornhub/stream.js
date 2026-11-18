var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// providers/pornhub/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.pornhub.com";
var memoryCache = { data: null, expiresAt: 0 };
async function getBase(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    const cachedEntry = memoryCache.data["pornhub"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 4e3 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 36e5;
        const entry = res.data["pornhub"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("pornhub_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  return DEFAULT_BASE_URL;
}
var getStream = async function({
  link,
  type,
  signal,
  providerContext,
  isDownload
}) {
  const { axios, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  const videoPageUrl = link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
  const pageHeaders = {
    ...commonHeaders,
    Referer: baseUrl + "/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };
  const streamHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: baseUrl + "/"
  };
  try {
    const res = await axios.get(videoPageUrl, {
      headers: pageHeaders,
      signal,
      maxRedirects: 5
    });
    const html = res.data || "";
    const streams = [];
    var defs = [];
    var defMatch = html.match(/"mediaDefinitions"\s*:\s*(\[[\s\S]*?\]\s*,\s*"[^"]+"\s*:)/);
    if (!defMatch) {
      defMatch = html.match(/"mediaDefinitions"\s*:\s*(\[[^\]]*\])/);
    }
    if (defMatch && defMatch[1]) {
      try {
        var raw = defMatch[1].replace(/,\s*"[^"]+"\s*:.*$/, "");
        if (raw.charAt(raw.length - 1) !== "]") {
          var endIdx = raw.lastIndexOf("]");
          if (endIdx > 0) raw = raw.slice(0, endIdx + 1);
        }
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) defs = parsed;
      } catch (e) {
        defs = [];
      }
    }
    if (defs.length === 0) {
      var objRe = /\{\s*"group"\s*:\s*\d+\s*,\s*"height"\s*:\s*(\d+)[^}]*?"format"\s*:\s*"([^"]+)"[^}]*?"videoUrl"\s*:\s*"((?:[^"\\]|\\.)*)"[^}]*?"quality"\s*:\s*"(\d+)"/g;
      var m;
      while ((m = objRe.exec(html)) !== null) {
        defs.push({
          height: parseInt(m[1], 10) || 0,
          format: m[2],
          videoUrl: m[3].replace(/\\\//g, "/"),
          quality: m[4]
        });
      }
    }
    var mp4s = defs.filter(function(d) {
      return d && d.format === "mp4" && d.videoUrl;
    }).map(function(d) {
      return {
        quality: String(d.quality || d.height || "720"),
        url: String(d.videoUrl).replace(/\\\//g, "/").replace(/&amp;/g, "&"),
        height: parseInt(d.height, 10) || parseInt(d.quality, 10) || 0
      };
    });
    var hlsList = defs.filter(function(d) {
      return d && d.format === "hls" && d.videoUrl;
    }).map(function(d) {
      return {
        quality: String(d.quality || d.height || "1080"),
        url: String(d.videoUrl).replace(/\\\//g, "/").replace(/&amp;/g, "&"),
        height: parseInt(d.height, 10) || parseInt(d.quality, 10) || 0
      };
    });
    mp4s.sort(function(a, b) {
      return b.height - a.height;
    });
    hlsList.sort(function(a, b) {
      return b.height - a.height;
    });
    var seen = {};
    var pushStream = function(server, url, streamType, quality) {
      if (!url || seen[url]) return;
      seen[url] = true;
      streams.push({
        server,
        link: url,
        type: streamType,
        quality,
        headers: streamHeaders
      });
    };
    if (isDownload) {
      mp4s.forEach(function(v) {
        pushStream("Direct MP4 " + v.quality + "p", v.url, "mp4", v.quality);
      });
      hlsList.forEach(function(v) {
        pushStream("HLS " + v.quality + "p", v.url, "m3u8", v.quality);
      });
    } else {
      mp4s.forEach(function(v) {
        pushStream("Direct MP4 " + v.quality + "p", v.url, "mp4", v.quality);
      });
      hlsList.forEach(function(v) {
        pushStream("HLS " + v.quality + "p", v.url, "m3u8", v.quality);
      });
    }
    if (streams.length === 0) {
      var mp4Re = /https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/g;
      var mm;
      while ((mm = mp4Re.exec(html)) !== null) {
        var u = mm[0].replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (/phncdn\.com/.test(u)) {
          pushStream("Direct MP4", u, "mp4", "720");
          break;
        }
      }
    }
    return streams;
  } catch (err) {
    console.error("PornHub stream error:", err?.message || err);
    return [];
  }
};
