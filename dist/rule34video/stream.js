// @vega-provider rule34video
// @vega-version 1.2

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://rule34video.com";
let memoryCache = { data: null, expiresAt: 0 };

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

const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
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
    const streams = [];
    const addedUrls = new Set();
    const rawVariants = [];

    // 1. Extract download sheet links (e.g. MP4 2160p, MP4 1080p, MP4 720p)
    const $ = cheerio.load(html);
    $("a.tag_item_download, a[href*='download=true'], a[href*='.mp4']").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (!href || addedUrls.has(href)) return;

      let qual = "720";
      let rank = 720;
      let label = "Direct 720p HD";

      if (text.includes("2160") || href.includes("2160p") || href.includes("_4k")) {
        qual = "2160";
        rank = 2160;
        label = "Direct 4K Ultra HD (2160p)";
      } else if (text.includes("1080") || href.includes("1080p")) {
        qual = "1080";
        rank = 1080;
        label = "Direct 1080p Full HD";
      } else if (text.includes("720") || href.includes("720p")) {
        qual = "720";
        rank = 720;
        label = "Direct 720p HD";
      } else if (text.includes("480") || href.includes("480p")) {
        qual = "480";
        rank = 480;
        label = "Direct 480p SD";
      } else if (text.includes("360") || href.includes("360p") || href.includes("_360")) {
        qual = "360";
        rank = 360;
        label = "Direct 360p";
      }

      addedUrls.add(href);
      rawVariants.push({ label, url: href, quality: qual, rank });
    });

    // 2. Extract flashvars from player script
    const flashVarUrls = [...html.matchAll(/video_(?:alt_)?url\d*:\s*['"](https?:\/\/[^'"]+)['"]/g)];
    const flashVarLabels = [...html.matchAll(/video_(?:alt_)?url\d*_text:\s*['"]([^'"]+)['"]/g)];

    for (let i = 0; i < flashVarUrls.length; i++) {
      const u = flashVarUrls[i][1];
      const lbl = flashVarLabels[i] ? flashVarLabels[i][1] : "";

      if (!u || addedUrls.has(u)) continue;

      let qual = "720";
      let rank = 720;
      let label = "Direct 720p HD";

      if (lbl.includes("4k") || u.includes("2160p") || u.includes("_4k")) {
        qual = "2160";
        rank = 2160;
        label = "Direct 4K Ultra HD (2160p)";
      } else if (lbl.includes("1080") || u.includes("1080p")) {
        qual = "1080";
        rank = 1080;
        label = "Direct 1080p Full HD";
      } else if (lbl.includes("720") || u.includes("720p")) {
        qual = "720";
        rank = 720;
        label = "Direct 720p HD";
      } else if (lbl.includes("480") || u.includes("480p")) {
        qual = "480";
        rank = 480;
        label = "Direct 480p SD";
      } else if (lbl.includes("360") || u.includes("360p") || u.includes("_360")) {
        qual = "360";
        rank = 360;
        label = "Direct 360p";
      }

      addedUrls.add(u);
      rawVariants.push({ label, url: u, quality: qual, rank });
    }

    // Sort descending by rank (4K -> 1080p -> 720p -> 480p -> 360p)
    rawVariants.sort((a, b) => b.rank - a.rank);

    for (const v of rawVariants) {
      streams.push({
        server: v.label,
        link: v.url,
        type: "mp4",
        quality: v.quality,
        headers: defaultHeaders,
      });
    }

    return streams;
  } catch (err) {
    console.error("Rule34Video stream extraction error:", err?.message || err);
    return [];
  }
};

module.exports = { getStream };
