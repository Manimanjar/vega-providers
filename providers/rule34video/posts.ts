import { Post, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://rule34video.com";
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

async function parseTagsCatalogue(options: {
  url: string;
  baseUrl: string;
  axios: any;
  cheerio: any;
  commonHeaders: any;
  signal?: AbortSignal;
  kvStore: any;
}): Promise<Post[]> {
  const { url, baseUrl, axios, cheerio, commonHeaders, signal, kvStore } = options;
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
    const seenTags = new Set<string>();

    // First collect category cards with custom images if available
    $("a[href*='/categories/'], a[href*='/tags/']").each((_, el) => {
      const $el = $(el);
      const rawHref = $el.attr("href") || "";
      let tagText = $el.text().trim();
      const img = $el.find("img").attr("src") || "";

      if (!rawHref || rawHref === "/tags/" || rawHref === "/categories/") return;
      if (rawHref.includes("terms") || rawHref.includes("privacy") || rawHref.includes("login")) return;

      const slugMatch = rawHref.match(/\/(?:tags|categories)\/([^/?#]+)/i);
      if (!slugMatch) return;
      const slug = slugMatch[1];
      if (seenTags.has(slug)) return;
      seenTags.add(slug);

      if (!tagText) {
        tagText = slug.replace(/-/g, " ");
      }

      const formattedTitle = tagText.charAt(0).toUpperCase() + tagText.slice(1);
      const fullLink = rawHref.startsWith("http")
        ? rawHref
        : `${baseUrl}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      const image = img || `${baseUrl}/apple-touch-icon.png`;

      posts.push({
        title: formattedTitle,
        link: fullLink,
        image: image,
        cornerTag: "TAG",
      });
    });

    return posts;
  } catch (err: any) {
    console.error("Rule34Video tags parsing error:", err?.message || err);
    return [];
  }
}

async function parseVideoGrid(options: {
  url: string;
  baseUrl: string;
  axios: any;
  cheerio: any;
  commonHeaders: any;
  signal?: AbortSignal;
  kvStore: any;
}): Promise<Post[]> {
  const { url, baseUrl, axios, cheerio, commonHeaders, signal, kvStore } = options;

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
      const rawTitle =
        linkEl.attr("title") ||
        $el.find("img.thumb").attr("alt") ||
        linkEl.text().trim();

      if (!rawTitle || !rawHref) return;

      const idMatch = rawHref.match(/\/video\/([0-9]+)/i);
      const videoId = idMatch ? idMatch[1] : rawHref;

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

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  let targetUrl = "";

  // 1. Tags Catalogue: show all tags given on website
  if (filter === "/tags/" || filter === "/tags") {
    return parseTagsCatalogue({
      url: `${baseUrl}/tags/`,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore,
    });
  }

  // 2. Homepage: rotating seed on refresh for fresh videos
  if (filter === "/?home=1" || filter === "/") {
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
