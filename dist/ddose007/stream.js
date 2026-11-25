// @vega-provider ddose007
// @vega-version 1.0.3
"use strict";
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

// providers/ddose007/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);

// providers/ddose007/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://ddose007.co";
var BASE_CACHE_KEY = "ddose007_baseUrlCacheV4";
var LEARNED_KEY = "ddose007_learnedDomainV2";
var CANDIDATE_MIRRORS = [
  "https://ddose007.co",
  "https://ddose007.cc"
];
var memoryCache = { url: "", expiresAt: 0 };
async function isHealthyMirror(axios, mirror) {
  try {
    const res = await axios.get(mirror, {
      timeout: 4500,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      maxRedirects: 3
    });
    if (res.status >= 200 && res.status < 400) {
      const dataStr = typeof res.data === "string" ? res.data : "";
      if (!dataStr.includes("Just a moment...") && !dataStr.includes("cf-mitigated") && !res.headers?.["cf-mitigated"]) {
        return true;
      }
    }
  } catch (e) {
  }
  return false;
}
async function probeMirrors(axios, mirrors) {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  for (const mirror of mirrors) {
    const ok = await isHealthyMirror(axios, mirror);
    if (ok) return mirror.replace(/\/+$/, "");
  }
  return null;
}
async function getBaseUrl(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const clean = custom.trim().replace(/\/+$/, "");
        if (clean !== DEFAULT_BASE_URL && !clean.includes("ddose007.cc") && !clean.includes("instavipclub")) {
          return clean;
        }
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (memoryCache.url && now < memoryCache.expiresAt) {
    return memoryCache.url;
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached = typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > now) {
          memoryCache.url = String(cached.url).replace(/\/+$/, "");
          memoryCache.expiresAt = cached.expiresAt;
          return memoryCache.url;
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get(LEARNED_KEY);
      if (learned && typeof learned === "string" && learned.startsWith("http") && !learned.includes("instavipclub")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  let githubMirrors = CANDIDATE_MIRRORS;
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3e3 });
      if (res.data && res.data.ddose007) {
        const entry = res.data.ddose007;
        if (Array.isArray(entry.mirrors) && entry.mirrors.length > 0) {
          githubMirrors = entry.mirrors;
        }
        if (entry.url && entry.url.startsWith("http")) {
          const cleanUrl = entry.url.replace(/\/+$/, "");
          if (await isHealthyMirror(axios, cleanUrl)) {
            memoryCache.url = cleanUrl;
            memoryCache.expiresAt = now + 18e5;
            if (kvStore && typeof kvStore.set === "function") {
              try {
                await kvStore.set(
                  BASE_CACHE_KEY,
                  JSON.stringify({ url: cleanUrl, expiresAt: now + 18e5 })
                );
              } catch (e) {
              }
            }
            return cleanUrl;
          }
        }
      }
    } catch (e) {
    }
  }
  if (axios) {
    const probed = await probeMirrors(axios, githubMirrors);
    if (probed) {
      memoryCache.url = probed;
      memoryCache.expiresAt = now + 18e5;
      if (kvStore && typeof kvStore.set === "function") {
        try {
          await kvStore.set(LEARNED_KEY, probed);
          await kvStore.set(
            BASE_CACHE_KEY,
            JSON.stringify({ url: probed, expiresAt: now + 18e5 })
          );
        } catch (e) {
        }
      }
      return probed;
    }
  }
  return DEFAULT_BASE_URL;
}

// providers/ddose007/stream.ts
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
async function getStream(linkOrOptions, typeArg, signalArg, providerContextArg, isDownloadArg) {
  let link = "";
  let signal = null;
  let providerContext = null;
  let isDownload = false;
  if (linkOrOptions && typeof linkOrOptions === "object" && ("providerContext" in linkOrOptions || "link" in linkOrOptions)) {
    link = linkOrOptions.link || "";
    signal = linkOrOptions.signal || null;
    providerContext = linkOrOptions.providerContext || null;
    isDownload = Boolean(linkOrOptions.isDownload);
  } else {
    link = linkOrOptions || "";
    signal = signalArg || null;
    providerContext = providerContextArg || null;
    isDownload = Boolean(isDownloadArg);
  }
  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;
  if (!axios || !cheerio || !link) return [];
  const baseUrl = await getBaseUrl(kvStore, axios);
  try {
    const pageRes = await axios.get(link, {
      timeout: 8e3,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: baseUrl,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
    const pageHtml = String(pageRes.data || "");
    const $ = cheerio.load(pageHtml);
    const streams = [];
    const headers = {
      Referer: `${baseUrl}/`,
      "User-Agent": USER_AGENT
    };
    let directUrl = $('meta[itemprop="contentURL"]').attr("content") || "";
    if (!directUrl) {
      $("source").each((_, el) => {
        const src = $(el).attr("src") || "";
        if (src && (src.includes(".mp4") || src.includes(".m3u8")) && !directUrl) {
          directUrl = src;
        }
      });
    }
    if (!directUrl) {
      const pvtMatch = pageHtml.match(
        /https?:\/\/[a-zA-Z0-9_.-]*(?:pvtcdn\.com|ddose007)[^\s"'<>]+\.mp4/i
      );
      if (pvtMatch) directUrl = pvtMatch[0];
    }
    if (!directUrl) {
      const anyMp4 = pageHtml.match(
        /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i
      );
      if (anyMp4) directUrl = anyMp4[0];
    }
    if (directUrl) {
      const isM3u8 = directUrl.includes(".m3u8");
      streams.push({
        server: "Ddose Direct High Speed (1080p)",
        link: directUrl,
        type: isM3u8 ? "m3u8" : "mp4",
        quality: "1080",
        headers
      });
      return streams;
    }
    return [];
  } catch (e) {
    return [];
  }
}
