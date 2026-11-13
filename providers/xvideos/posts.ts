import { Post, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://www.xvideos.com";
let memoryCache = { data: null as any, expiresAt: 0 };

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
        Referer: baseUrl + "/",
        Origin: baseUrl,
        Accept: "*/*",
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

    $(".thumb-block").each((_, element) => {
      const $el = $(element);
      const titleLink = $el.find("p.title a, .thumb-under p.title a, .title a").first();
      let rawTitle = titleLink.attr("title") || "";
      if (!rawTitle) {
        const cloned = titleLink.clone();
        cloned.find("span").remove();
        rawTitle = cloned.text().trim();
      }

      const rawHref =
        titleLink.attr("href") || $el.find(".thumb-inside a").first().attr("href") || $el.find("a").first().attr("href") || "";

      if (!rawHref) return;

      if (!rawTitle || /^(?:1080p?|720p?|480p?|4k|hd|cc|sd)(?:\s*(?:cc|hd))*$/i.test(rawTitle.trim())) {
        const parts = rawHref.split("/").filter(Boolean);
        const slug = parts[parts.length - 1] || "";
        rawTitle = decodeURIComponent(slug.replace(/[_-]+/g, " "));
      }

      const idMatch = rawHref.match(/\/video(?:\.([a-zA-Z0-9_-]+)|\/([0-9]+))/i);
      const videoId = idMatch ? (idMatch[1] || idMatch[2]) : rawHref;

      if (seenVideoIds.has(videoId)) {
        return;
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
    if (page === 1) {
      const randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = `${baseUrl}/?k=&p=${randomSeed}&_t=${Date.now()}`;
    } else {
      const pageIndex = Math.max(0, page - 1);
      targetUrl = `${baseUrl}/?k=&p=${pageIndex}`;
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
