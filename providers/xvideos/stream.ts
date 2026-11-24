import { Stream, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://www.xvideos.com";
const BASE_CACHE_KEY = "xvideos_baseUrlCacheV1";
let memoryCache = { data: null as any, expiresAt: 0 };

async function getBase(kvStore: any, axios: any): Promise<string> {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {}
  }

  const now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    const cachedEntry = memoryCache.data["xvideos"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached =
          typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > now) {
          return String(cached.url).replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        const entry = res.data["xvideos"];
        if (entry && entry.url) {
          const cleanEntry = entry.url.replace(/\/+$/, "");
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
      const learned = await kvStore.get("xvideos_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);

  let pathPart = link || "";
  if (pathPart.startsWith("http")) {
    try {
      const parsed = new URL(pathPart);
      pathPart = parsed.pathname + parsed.search;
    } catch (e) {}
  }
  if (!pathPart.startsWith("/")) {
    pathPart = "/" + pathPart;
  }

  const candidateBases = [
    baseUrl,
    "https://www.xvideos.com",
    "https://www.xvideos3.com",
    "https://www.xvideos2.com",
  ].filter((b, idx, arr) => b && arr.indexOf(b) === idx);

  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const streamHeaders = {
    "User-Agent": ua,
  };

  try {
    let html = "";
    let workingBase = baseUrl;

    for (const curBase of candidateBases) {
      const targetUrl = `${curBase}${pathPart}`;
      for (let retry = 0; retry < 2; retry++) {
        try {
          const res = await axios.get(targetUrl, {
            headers: {
              ...commonHeaders,
              Referer: `${curBase}/`,
              "User-Agent": ua,
            },
            signal,
            timeout: 8000,
            maxRedirects: 5,
          });
          if (typeof res.data === "string" && res.data.includes("html5player")) {
            html = res.data;
            workingBase = curBase;
            break;
          }
        } catch (e) {
          if (retry === 0) {
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      }
      if (html) break;
    }

    if (!html) return [];

    const pageHeaders = {
      ...commonHeaders,
      Referer: `${workingBase}/`,
      "User-Agent": ua,
    };

    const streams: Stream[] = [];

    // 1. High Speed Direct MP4 CDN streams
    const highMatch = html.match(
      /html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const lowMatch = html.match(
      /html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );

    // 2. Extract HLS Master & Variant streams
    const hlsMatch = html.match(
      /html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );

    let masterHlsUrl = "";
    const hlsVariants: Stream[] = [];

    if (hlsMatch && hlsMatch[1]) {
      const rawHlsUrl = hlsMatch[1];
      const upgradedHlsUrl = rawHlsUrl.replace(/\/hls_low\.m3u8/i, "/hls.m3u8");
      masterHlsUrl = upgradedHlsUrl;

      let playlist: string | null = null;
      for (const tryUrl of [upgradedHlsUrl, rawHlsUrl].filter((u, i, a) => u && a.indexOf(u) === i)) {
        try {
          const hlsRes = await axios.get(tryUrl, {
            headers: pageHeaders,
            timeout: 5000,
            signal,
          });
          if (typeof hlsRes.data === "string" && hlsRes.data.includes("#EXTM3U")) {
            playlist = hlsRes.data;
            masterHlsUrl = tryUrl;
            break;
          }
        } catch (e) {}
      }

      if (playlist) {
        const baseUrlDir = masterHlsUrl.substring(
          0,
          masterHlsUrl.lastIndexOf("/") + 1
        );
        const lines = playlist.split(/\r?\n/);
        const variants: {
          name: string;
          url: string;
          quality: string;
          bandwidth: number;
        }[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("#EXT-X-STREAM-INF:")) {
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && !nextLine.startsWith("#")) {
              const subUrl = nextLine.startsWith("http")
                ? nextLine
                : `${baseUrlDir}${nextLine}`;
              const nameMatch = line.match(/NAME="([^"]+)"/i);
              const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
              const bwMatch = line.match(/BANDWIDTH=(\d+)/i);

              const height = resMatch ? resMatch[2] : "";
              const qualityName = nameMatch
                ? nameMatch[1]
                : height
                ? `${height}p`
                : "HD";
              const qualNumber = qualityName.replace(/[^0-9]/g, "");
              const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;

              variants.push({
                name: qualityName,
                url: subUrl,
                quality: qualNumber || "1080",
                bandwidth,
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
            headers: streamHeaders,
          });
        }
      }
    }

    if (isDownload) {
      if (highMatch && highMatch[1]) {
        streams.push({
          server: "Direct MP4 (High Speed 60Mbps)",
          link: highMatch[1],
          type: "mp4",
          quality: "1080",
          headers: streamHeaders,
        });
      }
      if (lowMatch && lowMatch[1]) {
        streams.push({
          server: "Direct MP4 (Low)",
          link: lowMatch[1],
          type: "mp4",
          quality: "360",
          headers: streamHeaders,
        });
      }
      if (masterHlsUrl) {
        streams.push({
          server: "Auto Adaptive (Master HLS - High Speed)",
          link: masterHlsUrl,
          type: "m3u8",
          quality: "auto",
          headers: streamHeaders,
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
          headers: streamHeaders,
        });
      }
      if (highMatch && highMatch[1]) {
        streams.push({
          server: "Direct MP4 (High Speed 60Mbps)",
          link: highMatch[1],
          type: "mp4",
          quality: "1080",
          headers: streamHeaders,
        });
      }
      streams.push(...hlsVariants);
      if (lowMatch && lowMatch[1]) {
        streams.push({
          server: "Direct MP4 (Low)",
          link: lowMatch[1],
          type: "mp4",
          quality: "360",
          headers: streamHeaders,
        });
      }
    }

    return streams;
  } catch (err: any) {
    console.error("XVideos stream extraction error:", err?.message || err);
    return [];
  }
};
