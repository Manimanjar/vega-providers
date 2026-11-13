import { Post, ProviderContext } from "../types";

const DEFAULT_BASE_URL = "https://www.xvideos.com";

async function getBase(kvStore?: any): Promise<string> {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        return custom.trim().replace(/\/+$/, "");
      }
    } catch (e) {}
  }
  return DEFAULT_BASE_URL;
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
  const baseUrl = await getBase(kvStore);

  // Vega page starts at 1. XVideos uses 0-based pagination: p=0 for page 1
  const pageIndex = Math.max(0, page - 1);
  let targetUrl = `${baseUrl}${filter}`;
  if (targetUrl.includes("?")) {
    targetUrl += `&p=${pageIndex}`;
  } else {
    if (pageIndex > 0) {
      targetUrl = targetUrl.endsWith("/")
        ? `${targetUrl}${pageIndex}`
        : `${targetUrl}/${pageIndex}`;
    }
  }

  return parseVideoGrid({ url: targetUrl, baseUrl, axios, cheerio, commonHeaders, signal });
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
  const baseUrl = await getBase(kvStore);
  const pageIndex = Math.max(0, page - 1);
  const targetUrl = `${baseUrl}/?k=${encodeURIComponent(searchQuery)}&p=${pageIndex}`;

  return parseVideoGrid({ url: targetUrl, baseUrl, axios, cheerio, commonHeaders, signal });
};

async function parseVideoGrid({
  url,
  baseUrl,
  axios,
  cheerio,
  commonHeaders,
  signal,
}: {
  url: string;
  baseUrl: string;
  axios: any;
  cheerio: any;
  commonHeaders: any;
  signal: AbortSignal;
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
    });

    const html = res.data;
    const $ = cheerio.load(html);
    const posts: Post[] = [];

    $(".thumb-block").each((_, element) => {
      const $el = $(element);
      const titleLink = $el.find(".title a, .thumb-inside a").first();
      const rawTitle = titleLink.attr("title") || titleLink.text().trim() || $el.find(".title").text().trim();
      let rawHref = titleLink.attr("href") || $el.find("a").first().attr("href") || "";

      if (!rawTitle || !rawHref) return;

      const img = $el.find("img").first();
      const image =
        img.attr("data-src") ||
        img.attr("data-srcset") ||
        img.attr("src") ||
        "";

      const duration = $el.find(".duration, .video-duration").first().text().trim();
      const hdTag = $el.find(".video-hd-mark").first().text().trim();
      const cornerTag = hdTag || undefined;

      const absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : `${baseUrl}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image: image,
        tag: duration || undefined,
        cornerTag: cornerTag,
      });
    });

    return posts;
  } catch (err: any) {
    console.error("XVideos posts error:", err?.message || err);
    return [];
  }
}
