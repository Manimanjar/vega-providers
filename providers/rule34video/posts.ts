import { Post, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://rule34video.com";
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
        kvStore.set("rule34video_learnedDomain", origin);
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
    // Fresh homepage videos on every refresh (rotate seed / page index)
    if (page === 1) {
      const randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = randomSeed > 1 ? `${baseUrl}/${randomSeed}/?_t=${Date.now()}` : `${baseUrl}/?_t=${Date.now()}`;
    } else {
      targetUrl = `${baseUrl}/${page}/`;
    }
  } else if (filter.startsWith("/search/")) {
    const cleanSearch = filter.replace(/\/+$/, "");
    targetUrl = page > 1 ? `${baseUrl}${cleanSearch}/${page}/` : `${baseUrl}${cleanSearch}/`;
  } else if (filter.startsWith("/tags/")) {
    if (filter.includes("?")) {
      targetUrl = page > 1 ? `${baseUrl}${filter}&from=${page}` : `${baseUrl}${filter}`;
    } else {
      const cleanTag = filter.replace(/\/+$/, "");
      targetUrl = page > 1 ? `${baseUrl}${cleanTag}/${page}/` : `${baseUrl}${cleanTag}/`;
    }
  } else if (filter.includes("?")) {
    targetUrl = page > 1 ? `${baseUrl}${filter}&from=${page}` : `${baseUrl}${filter}`;
  } else {
    targetUrl = page > 1 ? `${baseUrl}${filter}${page}/` : `${baseUrl}${filter}`;
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
  const cleanQuery = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-"));
  const targetUrl = page > 1 ? `${baseUrl}/search/${cleanQuery}/${page}/` : `${baseUrl}/search/${cleanQuery}/`;

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

    if (seenVideoIds.size > 3000) {
      seenVideoIds.clear();
    }

    $(".item.thumb, [data-video-card-id]").each((_, element) => {
      const $el = $(element);
      const linkEl = $el.find("a.th, a[href*='/video/']").first();
      const rawHref = linkEl.attr("href") || "";
      const rawTitle = linkEl.attr("title") || $el.find("img.thumb").attr("alt") || linkEl.text().trim();

      if (!rawTitle || !rawHref) return;

      const idMatch = rawHref.match(/\/video\/([0-9]+)/i);
      const videoId = idMatch ? idMatch[1] : rawHref;

      // Deduplicate across all categories
      if (seenVideoIds.has(videoId)) {
        return;
      }
      seenVideoIds.add(videoId);

      const img = $el.find("img.thumb, img").first();
      const image =
        img.attr("data-rd-jpg") ||
        img.attr("data-src") ||
        img.attr("src") ||
        "";

      const duration = $el.find(".time").first().text().trim();
      const isHd = $el.find(".quality").length > 0;
      const cornerTag = isHd ? "HD" : undefined;

      const absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : `${baseUrl}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image,
        tag: duration || undefined,
        cornerTag,
      });
    });

    return posts;
  } catch (err: any) {
    console.error("Rule34Video posts error:", err?.message || err);
    return [];
  }
}
