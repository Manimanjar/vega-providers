import { Stream, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://rule34video.com";
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
    const cachedEntry = memoryCache.data["rule34video"];
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
        const entry = res.data["rule34video"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("rule34video_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

async function resolveDirectUrl(
  url: string,
  axios: any,
  defaultHeaders: any
): Promise<string> {
  if (typeof fetch === "function") {
    try {
      const controller =
        typeof AbortController === "function" ? new AbortController() : null;
      const timeoutId = controller
        ? setTimeout(() => controller.abort(), 3500)
        : null;
      const res = await fetch(url, {
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
        const loc = res.headers.get("location");
        if (loc && loc.startsWith("http")) return loc;
      }
    } catch (e) {}
  }
  if (axios && typeof axios.head === "function") {
    try {
      const aRes = await axios.head(url, {
        headers: defaultHeaders,
        maxRedirects: 0,
        validateStatus: (status: number) => status >= 200 && status < 400,
        timeout: 3500,
      });
      if (aRes && aRes.headers && aRes.headers.location) {
        const aLoc = aRes.headers.location;
        if (aLoc && aLoc.startsWith("http")) return aLoc;
      }
    } catch (e: any) {
      if (e.response && e.response.headers && e.response.headers.location) {
        const eLoc = e.response.headers.location;
        if (eLoc && eLoc.startsWith("http")) return eLoc;
      }
    }
  }
  return url;
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
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  const videoPageUrl = link.startsWith("http")
    ? link
    : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  const defaultHeaders = {
    ...commonHeaders,
    Referer: baseUrl + "/",
    Origin: baseUrl,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    const res = await axios.get(videoPageUrl, {
      headers: defaultHeaders,
      signal,
      maxRedirects: 5,
    });
    const html = res.data;
    const streams: Stream[] = [];
    const addedUrls = new Set<string>();
    const seenQualities = new Set<string>();
    const rawVariants: { label: string; url: string; quality: string; rank: number }[] = [];

    // 1. Direct flashvars (fastest direct CDN streams)
    const flashVarUrls = [...html.matchAll(/video_(?:alt_)?url\d*:\s*['"](https?:\/\/[^'"]+)['"]/g)];
    const flashVarLabels = [...html.matchAll(/video_(?:alt_)?url\d*_text:\s*['"]([^'"]+)['"]/g)];

    for (let i = 0; i < flashVarUrls.length; i++) {
      const u = flashVarUrls[i][1];
      const lbl = flashVarLabels[i] ? flashVarLabels[i][1] : "";

      if (!u || addedUrls.has(u)) continue;

      let qual = "720";
      let rank = 720;
      let label = "Direct 720p HD (High Speed CDN)";

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
      rawVariants.push({ label, url: u, quality: qual, rank });
    }

    // 2. Fallback to download links only for missing qualities
    const $ = cheerio.load(html);
    $("a.tag_item_download, a[href*='download=true']").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (!href || addedUrls.has(href)) return;

      let qual = "720";
      let rank = 720;
      let label = "Direct 720p HD (High Speed CDN)";

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
      rawVariants.push({ label, url: href, quality: qual, rank });
    });

    rawVariants.sort((a, b) => b.rank - a.rank);

    // Resolve direct CDN links in parallel to completely eliminate DDoS-guard 302 hop latency
    await Promise.all(
      rawVariants.map(async (item) => {
        try {
          const direct = await resolveDirectUrl(item.url, axios, defaultHeaders);
          if (direct && direct.startsWith("http")) {
            item.url = direct;
          }
        } catch (e) {}
      })
    );

    const streamHeaders = {
      Referer: baseUrl + "/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    for (const v of rawVariants) {
      streams.push({
        server: v.label,
        link: v.url,
        type: "mp4",
        quality: v.quality,
        headers: streamHeaders,
      });
    }

    return streams;
  } catch (err: any) {
    console.error("Rule34Video stream extraction error:", err?.message || err);
    return [];
  }
};
