// @vega-provider pornhub
// @vega-version 2.4.3
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

// providers/pornhub/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);
var DEFAULT_BASE_URL = "https://de.pornhub.com";
var BASE_CACHE_KEY = "pornhub_baseUrlCacheV1";
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
    try {
      const learned = await kvStore.get("pornhub_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached = typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > Date.now()) {
          return String(cached.url).replace(/\/+$/, "");
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
  return DEFAULT_BASE_URL;
}
function extractMediaDefinitions(html) {
  const marker = '"mediaDefinitions":';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return [];
  const bracketStart = html.indexOf("[", startIdx);
  if (bracketStart === -1) return [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;
  for (let i = bracketStart; i < html.length; i++) {
    const ch = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }
  if (endIdx !== -1) {
    const jsonStr = html.substring(bracketStart, endIdx + 1);
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
    }
  }
  return [];
}
var getStream = async function({
  link,
  type,
  signal,
  providerContext,
  isDownload
}) {
  const { axios, commonHeaders, kvStore } = providerContext;
  if (!link) return [];
  const baseUrl = await getBase(kvStore, axios);
  let pathPart = link;
  if (link.startsWith("http")) {
    try {
      const parsedUrl = new URL(link);
      pathPart = parsedUrl.pathname + parsedUrl.search;
    } catch (e) {
      pathPart = link;
    }
  }
  if (!pathPart.startsWith("/")) {
    pathPart = "/" + pathPart;
  }
  const candidateBases = [
    baseUrl,
    "https://www.pornhub.org",
    "https://de.pornhub.com",
    "https://www.pornhub.com",
    "https://rt.pornhub.com"
  ].filter((b, idx, arr) => b && arr.indexOf(b) === idx).slice(0, 4);
  const raceResult = await new Promise((resolve) => {
    let resolved = false;
    let pending = candidateBases.length;
    if (pending === 0) {
      resolve(null);
      return;
    }
    const attemptMirror = (curBase, attempt) => {
      if (resolved || signal?.aborted) {
        pending--;
        if (pending === 0 && !resolved) resolve(null);
        return;
      }
      const targetUrl = `${curBase}${pathPart}`;
      axios.get(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-CH-UA": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
          "Sec-CH-UA-Mobile": "?0",
          "Sec-CH-UA-Platform": '"Windows"',
          Referer: `${curBase}/`,
          Cookie: "platform=pc; bs=0"
        },
        signal,
        timeout: 5e3,
        maxRedirects: 5
      }).then((res) => {
        if (resolved) return;
        let effectiveOrigin2 = curBase;
        if (res.request && res.request.responseURL) {
          try {
            effectiveOrigin2 = new URL(res.request.responseURL).origin.replace(/\/+$/, "");
            if (effectiveOrigin2 && effectiveOrigin2.startsWith("http") && kvStore) {
              kvStore.set("pornhub_learnedDomain", effectiveOrigin2);
            }
          } catch (e) {
          }
        }
        const html = res.data || "";
        const defs2 = extractMediaDefinitions(html);
        if (defs2.length > 0) {
          resolved = true;
          resolve({ defs: defs2, effectiveOrigin: effectiveOrigin2 });
          return;
        }
        pending--;
        if (pending === 0 && !resolved) resolve(null);
      }).catch((err) => {
        if (resolved) return;
        const status = err?.response?.status;
        if (!signal?.aborted && !status && attempt < 4) {
          setTimeout(() => attemptMirror(curBase, attempt + 1), 80);
          return;
        }
        pending--;
        if (pending === 0 && !resolved) resolve(null);
      });
    };
    for (const curBase of candidateBases) {
      attemptMirror(curBase, 1);
    }
  });
  if (!raceResult) return [];
  const { defs, effectiveOrigin } = raceResult;
  const streamHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: `${effectiveOrigin}/`,
    Origin: effectiveOrigin
  };
  const streams = [];
  const seen = /* @__PURE__ */ new Set();
  const hlsDefs = defs.filter((d) => d && d.format === "hls" && d.videoUrl && !String(d.videoUrl).includes("hv-h.phncdn.com")).map((d) => ({
    quality: String(d.quality || d.height || "1080"),
    height: parseInt(d.height, 10) || parseInt(d.quality, 10) || 0,
    url: String(d.videoUrl).replace(/\\\//g, "/").replace(/&amp;/g, "&")
  })).sort((a, b) => b.height - a.height);
  const mp4Defs = defs.filter((d) => d && d.format === "mp4" && d.videoUrl && !String(d.videoUrl).includes("/video/get_media")).map((d) => ({
    quality: String(d.quality || d.height || "720"),
    height: parseInt(d.height, 10) || parseInt(d.quality, 10) || 0,
    url: String(d.videoUrl).replace(/\\\//g, "/").replace(/&amp;/g, "&")
  })).sort((a, b) => b.height - a.height);
  const pushStream = (server, url, streamType, q) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    streams.push({
      server,
      link: url,
      type: streamType,
      quality: q,
      headers: streamHeaders
    });
  };
  if (isDownload) {
    mp4Defs.forEach((v) => {
      pushStream(`Direct MP4 ${v.quality}p`, v.url, "mp4", v.quality);
    });
    hlsDefs.forEach((v) => {
      pushStream(`HLS ${v.quality}p`, v.url, "m3u8", v.quality);
    });
  } else {
    hlsDefs.forEach((v) => {
      pushStream(`HLS ${v.quality}p`, v.url, "m3u8", v.quality);
    });
    mp4Defs.forEach((v) => {
      pushStream(`Direct MP4 ${v.quality}p`, v.url, "mp4", v.quality);
    });
  }
  return streams;
};
