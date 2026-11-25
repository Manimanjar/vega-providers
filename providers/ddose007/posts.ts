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

/**
 * The site is a Next.js app. Card images go through its image optimizer:
 *   /_next/image?url=<url-encoded real image>&w=3840&q=75
 * Decode the `url` param to get the direct image (i.ibb.co) so thumbnails
 * do not depend on the site's optimizer being reachable.
 */
function extractImageUrl(src: string, baseUrl: string): string {
  if (!src) return "";
  const nextMatch = src.match(/\/_next\/image\?url=([^&]+)/);
  if (nextMatch) {
    try {
      const decoded = decodeURIComponent(nextMatch[1]);
      if (decoded.startsWith("http")) return decoded;
    } catch (e) {}
  }
  if (src.startsWith("data:")) return "";
  return normalizeUrl(src, baseUrl);
}

/**
 * Parse the site's post cards (verified 2026-11-25 against ddose007.tv).
 * The site is Next.js: each post is an <a href="/post/<slug>"> card holding
 * an <img> (Next.js Image) and the title as plain text. The old
 * `.video-block` selector matches nothing on the current site.
 */
function parseVideoBlocks($: any, baseUrl: string): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();

  $('a[href^="/post/"]').each((_: any, el: any) => {
    const $el = $(el);
    let link = $el.attr("href") || "";
    if (!link || link === "#" || link.startsWith("javascript:")) return;
    link = normalizeUrl(link, baseUrl);
    if (seen.has(link)) return;

    // Title: the card's visible text (the <img> has an empty alt).
    let title = $el.text().replace(/\s+/g, " ").trim();
    // The blurred background image contributes no text; if the text is
    // empty, fall back to the link title / img alt.
    if (!title || title.length < 2) {
      title =
        $el.attr("title") ||
        $el.find("img").first().attr("alt") ||
        "Untitled";
      title = title.replace(/\s+/g, " ").trim();
    }
    if (!title || title.length < 2) return;

    const imgEl = $el.find("img").first();
    let image = extractImageUrl(
      imgEl.attr("src") || imgEl.attr("data-src") || "",
      baseUrl
    );
    if (!image) {
      // Try the first srcSet entry (also a /_next/image URL).
      const srcSet = imgEl.attr("srcSet") || imgEl.attr("srcset") || "";
      const first = srcSet.split(",")[0].trim().split(" ")[0];
      image = extractImageUrl(first, baseUrl);
    }

    seen.add(link);
    posts.push({ title, link, image });
  });

  // Fallback 1: the JSON-LD ItemList (name + url). It carries no images,
  // but it keeps the listing alive if the card markup changes again.
  if (posts.length === 0) {
    const html = $.html() || "";
    const jsonLdMatch = html.match(
      /"@type"\s*:\s*"ItemList"[\s\S]{0,20000}?("itemListElement"\s*:\s*\[[\s\S]*?\])/
    );
    if (jsonLdMatch) {
      try {
        const items = JSON.parse(`{${jsonLdMatch[1]}}`).itemListElement || [];
        for (const item of items) {
          const name = (item.name || "").replace(/\s+/g, " ").trim();
          const url = item.url || "";
          if (!name || !url) continue;
          const link = normalizeUrl(url, baseUrl);
          if (seen.has(link)) continue;
          seen.add(link);
          posts.push({ title: name, link, image: "" });
        }
      } catch (e) {}
    }
  }

  // Fallback 2: the old WordPress mirror (ddose007.co) still serves the
  // previous design, where posts are .video-block cards. Parse those the
  // way the provider originally did, so the listing works whichever
  // mirror the domain resolver lands on.
  if (posts.length === 0) {
    $(".video-block").each((_: any, el: any) => {
      const $el = $(el);
      const linkEl = $el.find("a.thumb, a.infos, a").first();
      const titleEl = $el.find("span.title, a.infos").first();
      const imgEl = $el.find("img.video-img, img").first();

      let link = linkEl.attr("href") || "";
      if (!link || link === "#" || link.startsWith("javascript:")) return;
      link = normalizeUrl(link, baseUrl);
      if (seen.has(link)) return;

      let title =
        titleEl.text().trim() ||
        linkEl.attr("title") ||
        imgEl.attr("alt") ||
        "Untitled";
      title = title.replace(/\s+/g, " ").trim();
      if (!title || title.length < 2) return;

      let image =
        imgEl.attr("data-src") ||
        imgEl.attr("src") ||
        imgEl.attr("data-lazy-src") ||
        "";
      if (image.startsWith("data:")) image = imgEl.attr("data-src") || "";
      image = normalizeUrl(image, baseUrl);

      seen.add(link);
      posts.push({ title, link, image });
    });
  }

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

  // Pagination is /page/N (no trailing slash — the site 308-redirects
  // trailing-slash URLs and the redirect drops the query string).
  // Categories live at /category/<slug> with the same /page/N pattern.
  if (!filter || filter === "homepage") {
    targetUrl = page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}`;
  } else {
    const cleanFilter = filter.replace(/^\/+|\/+$/g, "");
    targetUrl =
      page === 1
        ? `${baseUrl}/${cleanFilter}`
        : `${baseUrl}/${cleanFilter}/page/${page}`;
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

  // The site has NO search at all (no search form, /search is 404, and
  // the ?s= parameter is ignored — it just returns the homepage,
  // verified 2026-11-25). So search is done here: scan the newest pages
  // and keep only posts whose title contains the query. Page 2+ returns
  // [] (the scan already covers the newest pages in one call).
  if (page > 1) return [];

  const baseUrl = await getBaseUrl(kvStore, axios);
  const needle = searchQuery.trim().toLowerCase();
  if (!needle) return [];

  const headers = {
    "User-Agent": USER_AGENT,
    Referer: baseUrl,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  };

  const matches: Post[] = [];
  const seen = new Set<string>();
  // Scan the 3 newest pages (48 posts) for title matches.
  for (let p = 1; p <= 3; p++) {
    const targetUrl = p === 1 ? `${baseUrl}/` : `${baseUrl}/page/${p}`;
    try {
      const res = await axios.get(targetUrl, { timeout: 8000, signal, headers });
      recordRedirect(res, baseUrl, kvStore);
      const $ = cheerio.load(res.data);
      const pagePosts = parseVideoBlocks($, baseUrl);
      for (const post of pagePosts) {
        if (seen.has(post.link)) continue;
        seen.add(post.link);
        if (post.title.toLowerCase().includes(needle)) matches.push(post);
      }
    } catch (e: any) {
      // A failed page just contributes nothing; keep scanning.
    }
  }

  return matches;
}
