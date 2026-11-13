import { Stream, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://www.xvideos.com";
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

  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 4000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        const entry = res.data["xvideos"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
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
  const videoPageUrl = link.startsWith("http")
    ? link
    : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  const defaultHeaders = {
    ...commonHeaders,
    Referer: baseUrl,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    const res = await axios.get(videoPageUrl, {
      headers: defaultHeaders,
      signal,
      maxRedirects: 5,
    });
    const html = res.data;
    const streams: Stream[] = [];

    // 1. Extract HLS URL and upgrade from hls_low.m3u8 to master hls.m3u8
    const hlsMatch = html.match(/html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (hlsMatch && hlsMatch[1]) {
      const rawHlsUrl = hlsMatch[1];
      const masterHlsUrl = rawHlsUrl.replace(/\/hls_low\.m3u8/i, "/hls.m3u8");
      const baseUrlDir = masterHlsUrl.substring(0, masterHlsUrl.lastIndexOf("/") + 1);

      try {
        // Fetch the master playlist to parse explicit 1080p, 4K, 720p streams
        const hlsRes = await axios.get(masterHlsUrl, {
          headers: defaultHeaders,
          timeout: 5000,
          signal,
        });
        const playlist = hlsRes.data;

        if (typeof playlist === "string" && playlist.includes("#EXTM3U")) {
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

          // Sort descending by bandwidth (4K -> 1440p -> 1080p -> 720p -> 480p)
          variants.sort((a, b) => b.bandwidth - a.bandwidth);

          for (const v of variants) {
            let label = `Direct ${v.name} (Full Bitrate)`;
            if (v.quality === "2160") label = "Direct 4K Ultra HD (2160p)";
            else if (v.quality === "1440") label = "Direct 2K QHD (1440p)";
            else if (v.quality === "1080") label = "Direct 1080p Full HD";
            else if (v.quality === "720") label = "Direct 720p HD";

            streams.push({
              server: label,
              link: v.url,
              type: "m3u8",
              quality: v.quality,
              headers: defaultHeaders,
            });
          }
        }
      } catch (err: any) {
        console.error("Master HLS fetch error:", err?.message || err);
      }

      // Add Master Adaptive HLS
      streams.push({
        server: "Auto Adaptive (Master HLS)",
        link: masterHlsUrl,
        type: "m3u8",
        quality: "auto",
        headers: defaultHeaders,
      });
    }

    // 2. High Quality MP4
    const highMatch = html.match(/html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (highMatch && highMatch[1]) {
      streams.push({
        server: "Direct MP4 (High)",
        link: highMatch[1],
        type: "mp4",
        quality: "720",
        headers: defaultHeaders,
      });
    }

    // 3. Low Quality MP4
    const lowMatch = html.match(/html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (lowMatch && lowMatch[1]) {
      streams.push({
        server: "Direct MP4 (Low)",
        link: lowMatch[1],
        type: "mp4",
        quality: "360",
        headers: defaultHeaders,
      });
    }

    if (isDownload) {
      streams.sort((a, b) => {
        if (a.type === "mp4" && b.type !== "mp4") return -1;
        if (a.type !== "mp4" && b.type === "mp4") return 1;
        return 0;
      });
    }

    return streams;
  } catch (err: any) {
    console.error("XVideos stream extraction error:", err?.message || err);
    return [];
  }
};
