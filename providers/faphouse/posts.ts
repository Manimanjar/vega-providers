import { Post, ProviderContext } from "../types";
import { getBaseUrl, recordRedirect } from "./domain";

"use strict";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function upgradeFaphouseImageUrl(
  src: string,
  srcset?: string,
  posterSrc?: string
): string {
  // Always use signed high-res URLs as-is (data-poster-src or srcset 2x);
  // never mutate dimensions in signed /a/<hmac>/... URLs (returns HTTP 405).
  if (posterSrc && typeof posterSrc === "string" && posterSrc.startsWith("http")) {
    return posterSrc;
  }

  if (srcset && typeof srcset === "string") {
    const match2x = srcset.match(/(https?:\/\/[^\s,]+)\s+2x/);
    if (match2x && match2x[1]) return match2x[1];
  }

  if (!src || typeof src !== "string") return "";
  let clean = src.trim();
  if (clean.startsWith("//")) clean = "https:" + clean;
  return clean;
}

function parseCards($: any, baseUrl: string): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();

  $("a.t-vl").each((_: any, el: any) => {
    const $el = $(el);
    let rawHref = $el.attr("href") || "";
    if (!rawHref) return;

    let cleanHref = rawHref.split("#")[0].trim();
    if (!cleanHref.includes("/videos/")) return;
    if (cleanHref.endsWith("/vr") || cleanHref === "/videos") return;

    let fullLink = cleanHref.startsWith("http")
      ? cleanHref
      : `${baseUrl}${cleanHref.startsWith("/") ? "" : "/"}${cleanHref}`;

    if (seen.has(fullLink)) return;
    seen.add(fullLink);

    // Image extraction
    const img = $el.find("img.t-i, img").first();
    const poster = $el.find("[data-poster-src]").attr("data-poster-src") || "";
    const srcset = img.attr("srcset") || "";
    const src = img.attr("src") || "";
    const finalImage = upgradeFaphouseImageUrl(src, srcset, poster);

    // Title extraction
    const cardRoot = $el.closest(".thumb, .t-m").parent();
    let title =
      cardRoot.find("a.t-tv").first().text().trim() ||
      cardRoot.find(".t-tc").first().attr("title") ||
      img.attr("alt") ||
      $el.attr("title") ||
      "";
    title = title.replace(/\s+/g, " ").trim();

    // Duration and quality badge (combined into cornerTag so Vega displays both)
    const viEl = $el.find(".t-vi, .t-vb").first();
    const durationSpan = viEl.find("span").first().text().trim();
    const viText = viEl.text().trim();
    let badge = "";
    if (/\b(?:4K|UHD)\b/i.test(viText) || /\b(?:4K|UHD)\b/i.test(title)) {
      badge = "4K";
    } else if (/\bVR\b/i.test(viText) || /\bVR\b/i.test(title)) {
      badge = "VR";
    } else if (/\bHD\b/i.test(viText)) {
      badge = "HD";
    }

    const durationText = durationSpan || (/\d+:\d+/.test(viText) ? viText.match(/\d+:\d+/)?.[0] || "" : "");
    const cornerTag = durationText
      ? badge
        ? `${durationText} • ${badge}`
        : durationText
      : badge || undefined;

    if (title && fullLink && finalImage) {
      posts.push({
        title,
        link: fullLink,
        image: finalImage,
        tag: durationText || badge || undefined,
        cornerTag,
      });
    }
  });

  return posts;
}

async function getCookieHeader(kvStore: any): Promise<string> {
  let sessionCookie = "";
  if (kvStore && typeof kvStore.get === "function") {
    try {
      sessionCookie = (await kvStore.get("sessionCookie")) || "";
    } catch (e) {}
  }
  return sessionCookie
    ? `siteMode=desktop; locale=en; ${String(sessionCookie).trim()}`
    : "siteMode=desktop; locale=en;";
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
  const { axios, cheerio, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const p = Math.max(1, page || 1);

  let only3D = false;
  if (kvStore && typeof kvStore.get === "function") {
    try {
      only3D = !!(await kvStore.get("only3D"));
    } catch (e) {}
  }

  let path = "/videos";
  if (only3D) {
    if (!filter || filter === "trending" || filter === "homepage" || filter === "/c/3d/videos") {
      path = "/c/3d/videos";
    } else {
      const catSlug = filter
        .replace(/^\/c\//, "")
        .replace(/\/videos.*$/, "")
        .replace(/^(?:genre|tag):/, "")
        .replace(/^\//, "")
        .replace(/[-_]+/g, " ")
        .trim();
      path = `/search/videos?q=${encodeURIComponent(catSlug ? `${catSlug} 3d` : "3d")}`;
    }
  } else if (!filter || filter === "trending" || filter === "homepage") {
    path = p === 1 ? "/" : "/videos";
  } else if (filter.startsWith("/")) {
    path = filter;
  } else if (filter.startsWith("genre:") || filter.startsWith("tag:")) {
    const slug = filter.split(":")[1];
    path = `/c/${slug}/videos`;
  } else {
    path = `/c/${filter}/videos`;
  }

  const sep = path.includes("?") ? "&" : "?";
  const finalPath = p > 1 ? `${path}${sep}page=${p}` : path;
  const requestUrl = `${baseUrl}${finalPath.startsWith("/") ? "" : "/"}${finalPath}`;

  try {
    const cookieHeader = await getCookieHeader(kvStore);
    const res = await axios.get(requestUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        Cookie: cookieHeader,
      },
      signal,
      timeout: 10000,
      maxRedirects: 3,
    });

    if (res.request && res.request.responseURL) {
      await recordRedirect(kvStore, requestUrl, res.request.responseURL);
    }

    const html = res.data || "";
    const $ = cheerio.load(html);
    return parseCards($, baseUrl);
  } catch (err) {
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
  const { axios, cheerio, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const p = Math.max(1, page || 1);

  let query = (searchQuery || "").trim();
  if (!query) return [];

  let only3D = false;
  if (kvStore && typeof kvStore.get === "function") {
    try {
      only3D = !!(await kvStore.get("only3D"));
    } catch (e) {}
  }
  if (only3D && !/\b3d\b/i.test(query)) {
    query = `${query} 3d`;
  }

  let finalPath = `/search/videos?q=${encodeURIComponent(query)}`;
  if (p > 1) {
    finalPath += `&page=${p}`;
  }

  const requestUrl = `${baseUrl}${finalPath}`;

  try {
    const cookieHeader = await getCookieHeader(kvStore);
    const res = await axios.get(requestUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        Cookie: cookieHeader,
      },
      signal,
      timeout: 10000,
      maxRedirects: 3,
    });

    if (res.request && res.request.responseURL) {
      await recordRedirect(kvStore, requestUrl, res.request.responseURL);
    }

    const html = res.data || "";
    const $ = cheerio.load(html);
    return parseCards($, baseUrl);
  } catch (err) {
    return [];
  }
};
