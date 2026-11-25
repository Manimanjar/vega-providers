import { Post, ProviderContext } from "../types";
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

function parseCards($, containerSelector: string, baseUrl: string): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();

  $(containerSelector).each((_: any, el: any) => {
    const $el = $(el);
    const linkEl = $el.find("a.vg-card-link").first();
    const titleLinkEl = $el.find(".vg-card-title a").first();
    const imgEl = $el.find("img.wp-post-image").first();
    const durationEl = $el.find(".vg-duration").first();
    const dateEl = $el.find(".vg-meta-date").first();

    let link = linkEl.attr("href") || titleLinkEl.attr("href") || "";
    if (!link) return;
    link = normalizeUrl(link, baseUrl);

    if (seen.has(link)) return;
    seen.add(link);

    let image =
      imgEl.attr("data-src") ||
      imgEl.attr("src") ||
      imgEl.attr("data-lazyloaded") ||
      "";
    if (image.startsWith("data:")) {
      image = imgEl.attr("data-src") || "";
    }
    image = normalizeUrl(image, baseUrl);

    let title =
      titleLinkEl.text().trim() ||
      imgEl.attr("alt") ||
      linkEl.attr("title") ||
      "Untitled";

    title = title.replace(/\s+/g, " ").trim();

    const tag = durationEl.text().trim() || undefined;
    const cornerTag = dateEl.text().trim() || undefined;

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

  const cleanFilter = filter ? filter.replace(/^\/+|\/+$/g, "") : "";

  if (!cleanFilter) {
    targetUrl = page === 1 ? baseUrl : `${baseUrl}/page/${page}/`;
  } else {
    targetUrl =
      page === 1
        ? `${baseUrl}/${cleanFilter}/`
        : `${baseUrl}/${cleanFilter}/page/${page}/`;
  }

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
    return parseCards($, "article.vg-card", baseUrl);
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
    return parseCards($, "article.vg-card", baseUrl);
  } catch (e: any) {
    return [];
  }
}
