import { Post, ProviderContext } from "../types";
import config from "../categories.config.json";
import { getBaseUrl, recordRedirect } from "./domain";

"use strict";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function normalizeUrl(url: string, baseUrl: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getCategoryConfig(filter: string) {
  return config.categories.find((c) => c.filter === filter);
}

function parseVideoBlocks($, baseUrl: string): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();

  $(".video-block").each((_: any, el: any) => {
    const $el = $(el);
    const linkEl = $el.find("a.thumb, a.infos, a").first();
    const titleEl = $el.find("span.title, a.infos").first();
    const imgEl = $el.find("img.video-img, img").first();
    const durationEl = $el.find(".duration").first();
    const viewsEl = $el.find(".views-number").first();

    let link = linkEl.attr("href") || "";
    if (!link || link === "#" || link.startsWith("javascript:")) return;
    link = normalizeUrl(link, baseUrl);

    if (seen.has(link)) return;
    seen.add(link);

    let image =
      imgEl.attr("data-src") ||
      imgEl.attr("src") ||
      imgEl.attr("data-lazy-src") ||
      "";
    if (image.startsWith("data:")) {
      image = imgEl.attr("data-src") || "";
    }
    image = normalizeUrl(image, baseUrl);

    let title =
      titleEl.text().trim() ||
      linkEl.attr("title") ||
      imgEl.attr("alt") ||
      "Untitled";

    title = title.replace(/\s+/g, " ").trim();
    if (!title || title.length < 2) return;

    const tag = durationEl.text().trim() || undefined;
    const cornerTag = viewsEl.text().trim() || undefined;

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

export async function getPosts(
  filterOrOptions: any,
  pageArg?: number,
  signalArg?: any,
  providerContextArg?: ProviderContext
): Promise<Post[]> {
  let filter = "";
  let page = 1;
  let signal: any = null;
  let providerContext: ProviderContext | null = null;

  if (
    filterOrOptions &&
    typeof filterOrOptions === "object" &&
    ("providerContext" in filterOrOptions || "page" in filterOrOptions || "filter" in filterOrOptions)
  ) {
    filter = filterOrOptions.filter || "";
    page = filterOrOptions.page || 1;
    signal = filterOrOptions.signal || null;
    providerContext = filterOrOptions.providerContext || null;
  } else {
    filter = filterOrOptions || "";
    page = pageArg || 1;
    signal = signalArg || null;
    providerContext = providerContextArg || null;
  }

  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;

  if (!axios || !cheerio) return [];

  const baseUrl = await getBaseUrl(kvStore, axios);
  let targetUrl = baseUrl;

  if (!filter || filter === "homepage") {
    targetUrl = page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}/`;
  } else {
    const catCfg = getCategoryConfig(filter);
    if (catCfg) {
      const query = (catCfg.title || filter).toLowerCase();
      const q = encodeURIComponent(query);
      targetUrl = page === 1 ? `${baseUrl}/?s=${q}` : `${baseUrl}/page/${page}/?s=${q}`;
    } else {
      const cleanFilter = filter.replace(/^\/+|\/+$/g, "");
      targetUrl =
        page === 1
          ? `${baseUrl}/${cleanFilter}/`
          : `${baseUrl}/${cleanFilter}/page/${page}/`;
    }
  }

  try {
    const res = await axios.get(targetUrl, {
      timeout: 9000,
      signal,
      headers: {
        ...(providerContext?.commonHeaders || {}),
        "User-Agent": USER_AGENT,
        Referer: `${baseUrl}/`,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    recordRedirect(res, baseUrl, kvStore);

    const $ = cheerio.load(res.data);
    return parseVideoBlocks($, baseUrl);
  } catch (e: any) {
    return [];
  }
}

export async function getSearchPosts(
  queryOrOptions: any,
  pageArg?: number,
  signalArg?: any,
  providerContextArg?: ProviderContext
): Promise<Post[]> {
  let searchQuery = "";
  let page = 1;
  let signal: any = null;
  let providerContext: ProviderContext | null = null;

  if (
    queryOrOptions &&
    typeof queryOrOptions === "object" &&
    ("providerContext" in queryOrOptions || "page" in queryOrOptions || "searchQuery" in queryOrOptions)
  ) {
    searchQuery = queryOrOptions.searchQuery || "";
    page = queryOrOptions.page || 1;
    signal = queryOrOptions.signal || null;
    providerContext = queryOrOptions.providerContext || null;
  } else {
    searchQuery = queryOrOptions || "";
    page = pageArg || 1;
    signal = signalArg || null;
    providerContext = providerContextArg || null;
  }

  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;

  if (!axios || !cheerio || !searchQuery) return [];

  const baseUrl = await getBaseUrl(kvStore, axios);
  const q = encodeURIComponent(searchQuery);

  const targetUrl =
    page === 1 ? `${baseUrl}/?s=${q}` : `${baseUrl}/page/${page}/?s=${q}`;

  try {
    const res = await axios.get(targetUrl, {
      timeout: 8000,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: baseUrl,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    recordRedirect(res, baseUrl, kvStore);

    const $ = cheerio.load(res.data);
    return parseVideoBlocks($, baseUrl);
  } catch (e: any) {
    return [];
  }
}
