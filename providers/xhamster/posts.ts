import { Post, ProviderContext } from "../types";
import { getBaseUrl, recordRedirect, rewriteToBase } from "./domain";

"use strict";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// XHamster serves a random JS shell page (~55 KB, no video data) instead of
// the full SSR page on some requests. Retry a few times to land a full page.
const MAX_LIST_ATTEMPTS = 3;
// Videos shorter than 2 minutes are excluded (app-wide rule).
const MIN_DURATION_SECONDS = 120;
// Cap the cross-page seen set so the kvStore value stays small.
const MAX_SEEN_ENTRIES = 800;

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

async function getCookieHeader(kvStore: any): Promise<string> {
  let sessionCookie = "";
  if (kvStore && typeof kvStore.get === "function") {
    try {
      sessionCookie = (await kvStore.get("sessionCookie")) || "";
    } catch (e) {}
  }
  return String(sessionCookie || "").trim();
}

async function getOnly3D(kvStore: any): Promise<boolean> {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      return !!(await kvStore.get("only3D"));
    } catch (e) {}
  }
  return false;
}

/**
 * Extracts the `window.initials = {...}` JSON blob from a page.
 * The blob is a single large object; brace-match it (string aware) so
 * nested braces and braces inside strings do not cut it short.
 */
function parseInitials(html: string): any | null {
  if (!html) return null;
  const m = html.match(/window\.initials\s*=\s*\{/);
  if (!m || m.index === undefined) return null;
  const start = m.index + m[0].length - 1; // position of the opening '{'
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch (e) {
            return null;
          }
        }
      }
    }
  }
  return null;
}

/**
 * The video list lives under different keys per page type:
 *  - homepage / best / newest / most-viewed: layoutPage.videoListProps.videoThumbProps
 *  - category pages: pagesCategoryComponent.trendingVideoListProps.videoThumbProps
 *  - search pages: searchResult.videoThumbProps
 * Every page also carries a small 5-item "additionalItems" videoThumbProps
 * list. Collect them all and keep the LARGEST array — that is the main list.
 */
function collectVideoEntries(initials: any): any[] {
  if (!initials || typeof initials !== "object") return [];
  const found: any[][] = [];
  const walk = (node: any): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node && typeof node === "object") {
      for (const key of Object.keys(node)) {
        if (key === "videoThumbProps" && Array.isArray(node[key])) {
          found.push(node[key]);
        } else {
          walk(node[key]);
        }
      }
    }
  };
  walk(initials);
  if (found.length === 0) return [];
  let best = found[0];
  for (const arr of found) {
    if (arr.length > best.length) best = arr;
  }
  return best;
}

function parseVideoEntries(html: string, baseUrl: string): Post[] {
  const initials = parseInitials(html);
  if (!initials) return [];
  const entries = collectVideoEntries(initials);
  const posts: Post[] = [];
  const seen = new Set<string>();
  for (const v of entries) {
    if (!v || typeof v !== "object") continue;
    // Only real videos (the list can contain photo/gallery thumbs).
    if (v.videoType && v.videoType !== "video") continue;
    const duration =
      typeof v.duration === "number" ? v.duration : parseInt(v.duration, 10) || 0;
    // Exclude videos under 2 minutes.
    if (duration > 0 && duration < MIN_DURATION_SECONDS) continue;
    const title = String(v.title || "").replace(/\s+/g, " ").trim();
    let link = String(v.pageURL || "").trim();
    if (!title || !link) continue;
    if (!link.startsWith("http")) {
      link = `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
    }
    link = rewriteToBase(link, baseUrl);
    if (seen.has(link)) continue;
    seen.add(link);
    const image =
      String(v.imageURL || v.thumbURL || "").trim() || "";
    if (!image) continue;
    const durationText = formatDuration(duration);
    posts.push({
      title,
      link,
      image,
      tag: durationText || undefined,
      cornerTag: durationText || undefined,
    });
  }
  return posts;
}

async function loadSeen(kvStore: any, key: string): Promise<string[]> {
  if (!kvStore || typeof kvStore.get !== "function") return [];
  try {
    const raw = await kvStore.get(key);
    if (!raw) return [];
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch (e) {
    return [];
  }
}

async function saveSeen(kvStore: any, key: string, list: string[]): Promise<void> {
  if (!kvStore || typeof kvStore.set !== "function") return;
  try {
    const trimmed = list.slice(-MAX_SEEN_ENTRIES);
    await kvStore.set(key, JSON.stringify(trimmed));
  } catch (e) {}
}

async function fetchListingPage(
  axios: any,
  requestUrl: string,
  baseUrl: string,
  cookieHeader: string,
  signal: any,
  kvStore: any
): Promise<Post[]> {
  let lastPosts: Post[] = [];
  for (let attempt = 1; attempt <= MAX_LIST_ATTEMPTS; attempt++) {
    try {
      const res = await axios.get(requestUrl, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: `${baseUrl}/`,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        signal,
        timeout: 15000,
        maxRedirects: 3,
      });
      if (res.request && res.request.responseURL) {
        await recordRedirect(kvStore, requestUrl, res.request.responseURL);
      }
      const html = res.data || "";
      const posts = parseVideoEntries(html, baseUrl);
      if (posts.length > 0) return posts;
      lastPosts = posts;
    } catch (e) {
      // Shell page / transient failure — retry below.
    }
    if (attempt < MAX_LIST_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  return lastPosts;
}

/**
 * Maps a catalog filter to a site path.
 * Filters are the `filter` values from catalog.ts ("/best", "/newest",
 * "/categories/amateur", ...) plus "homepage". Anything starting with "/"
 * is used as-is.
 */
function filterToPath(filter: string): string {
  const f = (filter || "").trim();
  if (!f || f === "homepage" || f === "trending") return "/";
  if (f.startsWith("genre:") || f.startsWith("tag:")) {
    const slug = f.split(":")[1] || "";
    return slug ? `/categories/${slug}` : "/";
  }
  if (f.startsWith("/")) return f;
  return `/categories/${f}`;
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
  const { axios, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const p = Math.max(1, page || 1);
  const cookieHeader = await getCookieHeader(kvStore);
  const only3D = await getOnly3D(kvStore);

  let path = filterToPath(filter);

  // "3D content only" toggle: homepage/best listings switch to the 3D
  // category; a category listing becomes a "<category> 3d" search.
  if (only3D) {
    if (path === "/" || path === "/best" || path.startsWith("/best/")) {
      path = "/categories/3d";
    } else if (path.startsWith("/categories/")) {
      const slug = path.replace("/categories/", "").replace(/\/+$/, "");
      const q = encodeURIComponent(`${slug.replace(/-/g, " ")} 3d`).replace(
        /%20/g,
        "+"
      );
      const searchUrl = `${baseUrl}/search/${q}${p > 1 ? `?page=${p}` : ""}`;
      const posts = await fetchListingPage(
        axios,
        searchUrl,
        baseUrl,
        cookieHeader,
        signal,
        kvStore
      );
      return dedupeAcrossPages(kvStore, `xhamsterSeen:search:${slug} 3d`, posts, p);
    }
  }

  const requestUrl =
    p > 1
      ? `${baseUrl}${path}${path.endsWith("/") ? "" : "/"}${p}`
      : `${baseUrl}${path === "/" ? "" : path}`;
  const posts = await fetchListingPage(
    axios,
    requestUrl,
    baseUrl,
    cookieHeader,
    signal,
    kvStore
  );
  return dedupeAcrossPages(kvStore, `xhamsterSeen:${path}`, posts, p);
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
  const { axios, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const p = Math.max(1, page || 1);
  const cookieHeader = await getCookieHeader(kvStore);

  let query = (searchQuery || "").trim();
  if (!query) return [];

  const only3D = await getOnly3D(kvStore);
  if (only3D && !/\b3d\b/i.test(query)) {
    query = `${query} 3d`;
  }

  const q = encodeURIComponent(query).replace(/%20/g, "+");
  const requestUrl = `${baseUrl}/search/${q}${p > 1 ? `?page=${p}` : ""}`;
  const posts = await fetchListingPage(
    axios,
    requestUrl,
    baseUrl,
    cookieHeader,
    signal,
    kvStore
  );
  return dedupeAcrossPages(kvStore, `xhamsterSeen:search:${query}`, posts, p);
};

/**
 * Drops links already returned on an earlier page of the same filter/query
 * (XHamster search pages overlap slightly across pages). The seen set is
 * reset when page 1 is requested and capped so the stored value stays small.
 */
async function dedupeAcrossPages(
  kvStore: any,
  key: string,
  posts: Post[],
  page: number
): Promise<Post[]> {
  if (page === 1) {
    await saveSeen(kvStore, key, posts.map((x) => x.link));
    return posts;
  }
  const seen = await loadSeen(kvStore, key);
  const seenSet = new Set(seen);
  const fresh = posts.filter((x) => !seenSet.has(x.link));
  if (fresh.length > 0) {
    await saveSeen(kvStore, key, [...seen, ...fresh.map((x) => x.link)]);
  }
  return fresh;
}
