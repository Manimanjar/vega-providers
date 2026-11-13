import { Post, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://www.xvideos.com";
let memoryCache = { data: null as any, expiresAt: 0 };

// Global deduplication cache to ensure videos are never repeated across categories
const seenVideoIds = new Set<string>();

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

function updateLearnedDomain(res: any, baseUrl: string, kvStore: any) {
  try {
    const finalUrl =
      res?.request?.responseURL ||
      res?.request?.res?.responseUrl ||
      res?.config?.url;
    if (finalUrl && typeof finalUrl === "string") {
      const parsed = new URL(finalUrl);
      const origin = parsed.origin;
      if (origin && origin !== baseUrl && kvStore && typeof kvStore.set === "function") {
        kvStore.set("xvideos_learnedDomain", origin);
      }
    }
  } catch (e) {}
}

export const getPosts = async function ({
  filter,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);

  let targetUrl = "";

  if (filter === "/?home=1" || filter === "/") {
    // Fresh homepage videos on every refresh (rotate seed/page index 0-7)
    if (page === 1) {
      const randomSeed = Math.floor(Math.random() * 8);
      targetUrl = `${baseUrl}/?k=&p=${randomSeed}&_t=${Date.now()}`;
    } else {
      targetUrl = `${baseUrl}/?k=&p=${page - 1}`;
    }
  } else if (filter.startsWith("/c/")) {
    const cleanFilter = filter.replace(/\/+$/, "");
    if (page === 1) {
      targetUrl = `${baseUrl}${cleanFilter}/`;
    } else {
      targetUrl = `${baseUrl}${cleanFilter}/${page - 1}/`;
    }
  } else if (filter.includes("?")) {
    const pageIndex = Math.max(0, page - 1);
    targetUrl = `${baseUrl}${filter}&p=${pageIndex}`;
  } else {
    const pageIndex = Math.max(0, page - 1);
    targetUrl = pageIndex > 0 ? `${baseUrl}${filter}${pageIndex}/` : `${baseUrl}${filter}`;
  }

  return parseVideoGrid({
    url: targetUrl,
    baseUrl,
    axios,
    cheerio,
    commonHeaders,
    signal,
    kvStore,
  });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  const pageIndex = Math.max(0, page - 1);
  const targetUrl = `${baseUrl}/?k=${encodeURIComponent(searchQuery)}&p=${pageIndex}`;

  return parseVideoGrid({
    url: targetUrl,
    baseUrl,
    axios,
    cheerio,
    commonHeaders,
    signal,
    kvStore,
  });
};

async function parseVideoGrid({
  url,
  baseUrl,
  axios,
  cheerio,
  commonHeaders,
  signal,
  kvStore,
}: {
  url: string;
  baseUrl: string;
  axios: any;
  cheerio: any;
  commonHeaders: any;
  signal: AbortSignal;
  kvStore: any;
}): Promise<Post[]> {
  try {
    const res = await axios.get(url, {
      headers: {
        ...commonHeaders,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl,
      },
      signal,
      maxRedirects: 5,
    });

    updateLearnedDomain(res, baseUrl, kvStore);

    const html = res.data;
    const $ = cheerio.load(html);
    const posts: Post[] = [];

    // Clear deduplication cache if it grows too large
    if (seenVideoIds.size > 3000) {
      seenVideoIds.clear();
    }

    $(".thumb-block").each((_, element) => {
      const $el = $(element);
      const titleLink = $el.find(".title a, .thumb-inside a").first();
      const rawTitle =
        titleLink.attr("title") ||
        titleLink.text().trim() ||
        $el.find(".title").text().trim();
      const rawHref =
        titleLink.attr("href") || $el.find("a").first().attr("href") || "";

      if (!rawTitle || !rawHref) return;

      // Extract unique video slug / ID to avoid repeating videos anywhere
      const idMatch = rawHref.match(/\/video(?:\.([a-zA-Z0-9_-]+)|\/([0-9]+))/i);
      const videoId = idMatch ? (idMatch[1] || idMatch[2]) : rawHref;

      if (seenVideoIds.has(videoId)) {
        return; // Skip duplicate video across all categories
      }
      seenVideoIds.add(videoId);

      const img = $el.find("img").first();
      const image =
        img.attr("data-src") ||
        img.attr("data-srcset") ||
        img.attr("src") ||
        "";

      const duration = $el.find(".duration, .video-duration").first().text().trim();
      const hdTag = $el.find(".video-hd-mark").first().text().trim();

      const absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : `${baseUrl}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image,
        tag: duration || undefined,
        cornerTag: hdTag || undefined,
      });
    });

    return posts;
  } catch (err: any) {
    console.error("XVideos posts error:", err?.message || err);
    return [];
  }
}
