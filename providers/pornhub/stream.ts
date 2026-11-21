import { Stream, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://www.pornhub.com";
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
    const cachedEntry = memoryCache.data["pornhub"];
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
        const entry = res.data["pornhub"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("pornhub_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

function extractMediaDefinitions(html: string): any[] {
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
    } catch (e) {}
  }
  return [];
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
    "https://www.pornhub.com",
    baseUrl,
    "https://rt.pornhub.com",
    "https://de.pornhub.com",
    "https://www.pornhub.org",
    "https://www.pornhub.net",
  ].filter((b, idx, arr) => arr.indexOf(b) === idx);

  for (const curBase of candidateBases) {
    const targetUrl = `${curBase}${pathPart}`;
    for (let retry = 0; retry < 2; retry++) {
      try {
        const res = await axios.get(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-CH-UA": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            "Sec-CH-UA-Mobile": "?0",
            "Sec-CH-UA-Platform": '"Windows"',
            Referer: `${curBase}/`,
            Cookie: "platform=pc; bs=0",
          },
          signal,
          timeout: 9000,
          maxRedirects: 5,
        });

        let effectiveOrigin = curBase;
        if (res.request && res.request.responseURL) {
          try {
            effectiveOrigin = new URL(res.request.responseURL).origin.replace(/\/+$/, "");
            if (effectiveOrigin && effectiveOrigin.startsWith("http") && kvStore) {
              kvStore.set("pornhub_learnedDomain", effectiveOrigin);
            }
          } catch (e) {}
        }

        const html = res.data || "";
        const defs = extractMediaDefinitions(html);
        if (defs.length === 0) continue;

      const streamHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${effectiveOrigin}/`,
        Origin: effectiveOrigin,
      };

      const streams: Stream[] = [];
      const seen = new Set<string>();

      const hlsDefs = defs
        .filter((d: any) => d && d.format === "hls" && d.videoUrl && !String(d.videoUrl).includes("hv-h.phncdn.com"))
        .map((d: any) => ({
          quality: String(d.quality || d.height || "1080"),
          height: parseInt(d.height, 10) || parseInt(d.quality, 10) || 0,
          url: String(d.videoUrl).replace(/\\\//g, "/").replace(/&amp;/g, "&"),
        }))
        .sort((a, b) => b.height - a.height);

      const mp4Defs = defs
        .filter((d: any) => d && d.format === "mp4" && d.videoUrl && !String(d.videoUrl).includes("/video/get_media"))
        .map((d: any) => ({
          quality: String(d.quality || d.height || "720"),
          height: parseInt(d.height, 10) || parseInt(d.quality, 10) || 0,
          url: String(d.videoUrl).replace(/\\\//g, "/").replace(/&amp;/g, "&"),
        }))
        .sort((a, b) => b.height - a.height);

      const pushStream = (server: string, url: string, streamType: "m3u8" | "mp4", q: any) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        streams.push({
          server,
          link: url,
          type: streamType,
          quality: q,
          headers: streamHeaders,
        });
      };

      if (isDownload) {
        // Downloads prefer direct MP4 files first, then HLS
        mp4Defs.forEach((v) => {
          pushStream(`Direct MP4 ${v.quality}p`, v.url, "mp4", v.quality);
        });
        hlsDefs.forEach((v) => {
          pushStream(`HLS ${v.quality}p`, v.url, "m3u8", v.quality);
        });
      } else {
        // Playback: HLS master playlists are native adaptive streaming, followed by direct MP4
        hlsDefs.forEach((v) => {
          pushStream(`HLS ${v.quality}p`, v.url, "m3u8", v.quality);
        });
        mp4Defs.forEach((v) => {
          pushStream(`Direct MP4 ${v.quality}p`, v.url, "mp4", v.quality);
        });
      }

      if (streams.length > 0) {
        return streams;
      }
    } catch (e) {
      if (retry === 0) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }
}

  return [];
};
