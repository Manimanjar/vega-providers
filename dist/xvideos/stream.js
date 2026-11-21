// @vega-provider xvideos
// @vega-version 2.4.0
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

// providers/xvideos/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.xvideos.com";
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
    const cachedEntry = memoryCache.data["xvideos"];
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
        const entry = res.data["xvideos"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("xvideos_learnedDomain");
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
    Referer: baseUrl,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };
  const streamHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };
  try {
    const res = await axios.get(videoPageUrl, {
      headers: pageHeaders,
      signal,
      maxRedirects: 5
    });
    const html = res.data;
    const streams = [];
    const highMatch = html.match(
      /html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const lowMatch = html.match(
      /html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const hlsMatch = html.match(
      /html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    let masterHlsUrl = "";
    const hlsVariants = [];
    if (hlsMatch && hlsMatch[1]) {
      const rawHlsUrl = hlsMatch[1];
      masterHlsUrl = rawHlsUrl.replace(/\/hls_low\.m3u8/i, "/hls.m3u8");
      const baseUrlDir = masterHlsUrl.substring(
        0,
        masterHlsUrl.lastIndexOf("/") + 1
      );
      try {
        const hlsRes = await axios.get(masterHlsUrl, {
          headers: pageHeaders,
          timeout: 5e3,
          signal
        });
        const playlist = hlsRes.data;
        if (typeof playlist === "string" && playlist.includes("#EXTM3U")) {
          const lines = playlist.split(/\r?\n/);
          const variants = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("#EXT-X-STREAM-INF:")) {
              const nextLine = lines[i + 1]?.trim();
              if (nextLine && !nextLine.startsWith("#")) {
                const subUrl = nextLine.startsWith("http") ? nextLine : `${baseUrlDir}${nextLine}`;
                const nameMatch = line.match(/NAME="([^"]+)"/i);
                const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
                const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
                const height = resMatch ? resMatch[2] : "";
                const qualityName = nameMatch ? nameMatch[1] : height ? `${height}p` : "HD";
                const qualNumber = qualityName.replace(/[^0-9]/g, "");
                const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
                variants.push({
                  name: qualityName,
                  url: subUrl,
                  quality: qualNumber || "1080",
                  bandwidth
                });
              }
            }
          }
          variants.sort((a, b) => b.bandwidth - a.bandwidth);
          for (const v of variants) {
            let label = `Direct ${v.name} (HLS Full Bitrate)`;
            if (v.quality === "2160") label = "Direct 4K Ultra HD (HLS)";
            else if (v.quality === "1440") label = "Direct 2K QHD (HLS)";
            else if (v.quality === "1080") label = "Direct 1080p Full HD (HLS)";
            else if (v.quality === "720") label = "Direct 720p HD (HLS)";
            hlsVariants.push({
              server: label,
              link: v.url,
              type: "m3u8",
              quality: v.quality,
              headers: streamHeaders
            });
          }
        }
      } catch (err) {
        console.error("Master HLS fetch error:", err?.message || err);
      }
    }
    if (isDownload) {
      if (highMatch && highMatch[1]) {
        streams.push({
          server: "Direct MP4 (High Speed 60Mbps)",
          link: highMatch[1],
          type: "mp4",
          quality: "1080",
          headers: streamHeaders
        });
      }
      if (lowMatch && lowMatch[1]) {
        streams.push({
          server: "Direct MP4 (Low)",
          link: lowMatch[1],
          type: "mp4",
          quality: "360",
          headers: streamHeaders
        });
      }
      if (masterHlsUrl) {
        streams.push({
          server: "Auto Adaptive (Master HLS - High Speed)",
          link: masterHlsUrl,
          type: "m3u8",
          quality: "auto",
          headers: streamHeaders
        });
      }
      streams.push(...hlsVariants);
    } else {
      if (masterHlsUrl) {
        streams.push({
          server: "Auto Adaptive (Master HLS - High Speed)",
          link: masterHlsUrl,
          type: "m3u8",
          quality: "auto",
          headers: streamHeaders
        });
      }
      if (highMatch && highMatch[1]) {
        streams.push({
          server: "Direct MP4 (High Speed 60Mbps)",
          link: highMatch[1],
          type: "mp4",
          quality: "1080",
          headers: streamHeaders
        });
      }
      streams.push(...hlsVariants);
      if (lowMatch && lowMatch[1]) {
        streams.push({
          server: "Direct MP4 (Low)",
          link: lowMatch[1],
          type: "mp4",
          quality: "360",
          headers: streamHeaders
        });
      }
    }
    return streams;
  } catch (err) {
    console.error("XVideos stream extraction error:", err?.message || err);
    return [];
  }
};
