import { Post, ProviderContext } from "../types";

"use strict";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://filmyfly.kred";
const SEARCH_API_ENDPOINT = "https://webfind.filmyflydla.space";
const BASE_CACHE_KEY = "filmyfly_baseUrlCacheV1";

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
    const cachedEntry = memoryCache.data["filmyfly"];
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
        if (cached && cached.url && cached.expiresAt > Date.now()) {
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
        const entry = res.data["filmyfly"];
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
      const learned = await kvStore.get("filmyfly_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

function extractYearOrQuality(title: string): string {
  if (!title) return "";
  const yearMatch = title.match(/\b(202\d|201\d|199\d)\b/);
  const qualMatch = title.match(/\b(2160p|1080p|720p|480p|4K|HD|HEVC|WEB-DL|BluRay|HQCam)\b/i);
  if (yearMatch && qualMatch) return `${yearMatch[1]} • ${qualMatch[1].toUpperCase()}`;
  if (yearMatch) return yearMatch[1];
  if (qualMatch) return qualMatch[1].toUpperCase();
  return "";
}

function slug(title: string): string {
  const s = String(title || "")
    .replace(/[()]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s !== "" ? s : "item";
}

function parseCards($, containerSelector: string, baseUrl: string): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();

  $(containerSelector).each((_: any, el: any) => {
    const $el = $(el);
    const linkEl = $el.find("a.row-thumb-link").first();
    const titleLinkEl = $el.find("a[href*='/movie/']").last();
    let link = linkEl.attr("href") || titleLinkEl.attr("href") || "";
    if (!link) return;

    if (!link.startsWith("http")) {
      link = `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
    }

    if (seen.has(link)) return;
    seen.add(link);

    const imgEl = $el.find("img.row-thumb").first();
    let image = imgEl.attr("src") || "";
    if (image.startsWith("//")) image = "https:" + image;

    let title =
      $el.find(".row-title").first().text().trim() ||
      imgEl.attr("alt") ||
      titleLinkEl.text().trim() ||
      "Untitled";

    const tag = $el.find(".row-badge").first().text().trim() || undefined;
    const cornerTag = extractYearOrQuality(title) || undefined;

    posts.push({
      title,
      link,
      image,
      tag,
      cornerTag,
    });
  });

  return posts;
}

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter?: string;
  page: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  const curPage = Math.max(1, page || 1);

  // Genre filter route (via fast Search API)
  if (filter && filter.startsWith("genre:")) {
    const genre = filter.replace("genre:", "").trim();
    return getSearchPosts({
      searchQuery: genre,
      page: curPage,
      signal,
      providerContext,
    });
  }

  // Determine target URL
  let targetUrl = `${baseUrl}/`;
  let isTrending = filter === "trending";

  if (isTrending) {
    if (curPage > 1) return []; // Trending is single page on homepage
    targetUrl = `${baseUrl}/`;
  } else if (!filter || filter === "latest") {
    targetUrl = curPage > 1 ? `${baseUrl}/?page=${curPage}` : `${baseUrl}/`;
  } else if (filter.startsWith("/")) {
    targetUrl = curPage > 1 ? `${baseUrl}${filter}?page=${curPage}` : `${baseUrl}${filter}`;
  } else {
    targetUrl = curPage > 1 ? `${baseUrl}/${filter}?page=${curPage}` : `${baseUrl}/${filter}`;
  }

  try {
    const res = await axios.get(targetUrl, {
      headers: {
        ...commonHeaders,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${baseUrl}/`,
      },
      signal,
      timeout: 10000,
    });

    // Check runtime redirect learning
    if (res.request && res.request.responseURL) {
      try {
        const u = new URL(res.request.responseURL);
        const origin = u.origin;
        if (origin && origin !== baseUrl && origin.startsWith("http")) {
          kvStore?.set("filmyfly_learnedDomain", origin);
        }
      } catch (e) {}
    }

    const html = res.data || "";
    const $ = cheerio.load(html);

    if (isTrending) {
      // Find trending section only
      const trendingCards: Post[] = [];
      let inTrending = false;

      $("main > *").each((_: any, el: any) => {
        const text = $(el).text();
        if (text.includes("Trending Movies & Web Series")) {
          inTrending = true;
          return;
        }
        if (text.includes("Latest Movies") || text.includes("Select Category")) {
          inTrending = false;
          return;
        }
        if (inTrending && $(el).hasClass("A10")) {
          const parsed = parseCards($, el, baseUrl);
          if (parsed.length > 0) trendingCards.push(parsed[0]);
        }
      });

      if (trendingCards.length > 0) return trendingCards;
    }

    // Default: return all .A10 cards
    return parseCards($, ".A10", baseUrl);
  } catch (err: any) {
    console.error("FilmyFly getPosts error:", err?.message || err);
    return [];
  }
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  const curPage = Math.max(1, page || 1);
  const query = (searchQuery || "").trim();

  if (!query) return [];

  // 1. Try High-Speed Search API (Pure JSON)
  try {
    const apiUrl = `${SEARCH_API_ENDPOINT}/search?q=${encodeURIComponent(
      query
    )}&page=${curPage}&per_page=20`;

    const res = await axios.get(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${baseUrl}/`,
      },
      signal,
      timeout: 8000,
    });

    if (res.data && Array.isArray(res.data.results)) {
      const posts: Post[] = res.data.results.map((item: any) => {
        const itemSlug = slug(item.title);
        const link = `${baseUrl}/movie/${encodeURIComponent(
          item.filmyfly || ""
        )}/${encodeURIComponent(itemSlug)}.html`;

        let image = item.poster || "";
        if (image.startsWith("//")) image = "https:" + image;

        return {
          title: item.title || "Untitled",
          link,
          image,
          tag: item.foldern || undefined,
          cornerTag: extractYearOrQuality(item.title) || undefined,
        };
      });

      if (posts.length > 0) return posts;
    }
  } catch (apiErr: any) {
    // API failed or returned 404/network issue, fallback to web HTML scrape below
  }

  // 2. Fallback: Scrape HTML Search Page
  try {
    const searchUrl = `${baseUrl}/search.html?search=${encodeURIComponent(
      query
    )}&page=${curPage}`;

    const res = await axios.get(searchUrl, {
      headers: {
        ...commonHeaders,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${baseUrl}/`,
      },
      signal,
      timeout: 10000,
    });

    const html = res.data || "";
    const $ = cheerio.load(html);
    return parseCards($, ".A10", baseUrl);
  } catch (err: any) {
    console.error("FilmyFly search fallback error:", err?.message || err);
    return [];
  }
};
