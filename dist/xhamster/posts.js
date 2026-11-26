// @vega-provider xhamster
// @vega-version 1.0.0
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// providers/xhamster/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});
module.exports = __toCommonJS(posts_exports);

// providers/xhamster/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://xhamster.com";
var BASE_CACHE_KEY = "xhamster_baseUrlCacheV1";
var LEARNED_KEY = "xhamster_learnedDomain";
var CANDIDATE_MIRRORS = [
  "https://xhamster.com",
  "https://xhamster.desi"
];
var memoryCache = { url: "", expiresAt: 0 };
async function probeMirrors(axios, mirrors) {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  return new Promise((resolve) => {
    let resolved = false;
    let pending = mirrors.length;
    for (const mirror of mirrors) {
      axios.get(mirror, {
        timeout: 4e3,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        maxRedirects: 3
      }).then((res) => {
        const body = typeof res.data === "string" ? res.data : "";
        const isRealListing = res.status >= 200 && res.status < 400 && body.includes("videoThumbProps");
        if (!resolved && isRealListing) {
          resolved = true;
          let origin = mirror;
          if (res.request && res.request.responseURL) {
            try {
              origin = new URL(res.request.responseURL).origin;
            } catch (e) {
            }
          }
          resolve(origin.replace(/\/+$/, ""));
        }
      }).catch(() => {
      }).finally(() => {
        pending--;
        if (pending === 0 && !resolved) resolve(null);
      });
    }
    setTimeout(() => {
      if (!resolved) resolve(null);
    }, 4500);
  });
}
async function getBaseUrl(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const clean = custom.trim().replace(/\/+$/, "");
        if (clean !== DEFAULT_BASE_URL) return clean;
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (memoryCache.url && now < memoryCache.expiresAt) {
    return memoryCache.url;
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached = typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > now) {
          memoryCache = cached;
          return cached.url;
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get(LEARNED_KEY);
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        const clean = learned.trim().replace(/\/+$/, "");
        memoryCache = { url: clean, expiresAt: now + 18e5 };
        return clean;
      }
    } catch (e) {
    }
  }
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3500 });
      if (res.data && res.data.xhamster && res.data.xhamster.url) {
        const remoteUrl = res.data.xhamster.url.replace(/\/+$/, "");
        memoryCache = { url: remoteUrl, expiresAt: now + 18e5 };
        if (kvStore && typeof kvStore.set === "function") {
          try {
            await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
          } catch (e) {
          }
        }
        return remoteUrl;
      }
    } catch (e) {
    }
  }
  const probed = await probeMirrors(axios, CANDIDATE_MIRRORS);
  if (probed) {
    memoryCache = { url: probed, expiresAt: now + 18e5 };
    if (kvStore && typeof kvStore.set === "function") {
      try {
        await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
      } catch (e) {
      }
    }
    return probed;
  }
  return DEFAULT_BASE_URL;
}
async function recordRedirect(kvStore, requestedUrl, finalUrl) {
  if (!requestedUrl || !finalUrl || requestedUrl === finalUrl) return;
  try {
    const origOrigin = new URL(requestedUrl).origin.replace(/\/+$/, "");
    const finalOrigin = new URL(finalUrl).origin.replace(/\/+$/, "");
    if (origOrigin !== finalOrigin && finalOrigin.startsWith("http")) {
      memoryCache = { url: finalOrigin, expiresAt: Date.now() + 18e5 };
      if (kvStore && typeof kvStore.set === "function") {
        await kvStore.set(LEARNED_KEY, finalOrigin);
        await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
      }
    }
  } catch (e) {
  }
}
function rewriteToBase(link, baseUrl) {
  if (!link || !baseUrl) return link;
  try {
    const baseOrigin = new URL(baseUrl).origin;
    const u = new URL(link);
    if (u.origin !== baseOrigin) {
      u.protocol = new URL(baseOrigin).protocol;
      u.host = new URL(baseOrigin).host;
      return u.toString();
    }
    return link;
  } catch (e) {
    return link;
  }
}

// providers/xhamster/posts.ts
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var MAX_LIST_ATTEMPTS = 3;
var MIN_DURATION_SECONDS = 120;
var MAX_SEEN_ENTRIES = 800;
function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
async function getCookieHeader(kvStore) {
  let sessionCookie = "";
  if (kvStore && typeof kvStore.get === "function") {
    try {
      sessionCookie = await kvStore.get("sessionCookie") || "";
    } catch (e) {
    }
  }
  return String(sessionCookie || "").trim();
}
async function getOnly3D(kvStore) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      return !!await kvStore.get("only3D");
    } catch (e) {
    }
  }
  return false;
}
function parseInitials(html) {
  if (!html) return null;
  const m = html.match(/window\.initials\s*=\s*\{/);
  if (!m || m.index === void 0) return null;
  const start = m.index + m[0].length - 1;
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
function collectVideoEntries(initials) {
  if (!initials || typeof initials !== "object") return [];
  const found = [];
  const walk = (node) => {
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
function parseVideoEntries(html, baseUrl) {
  const initials = parseInitials(html);
  if (!initials) return [];
  const entries = collectVideoEntries(initials);
  const posts = [];
  const seen = /* @__PURE__ */ new Set();
  for (const v of entries) {
    if (!v || typeof v !== "object") continue;
    if (v.videoType && v.videoType !== "video") continue;
    const duration = typeof v.duration === "number" ? v.duration : parseInt(v.duration, 10) || 0;
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
    const image = String(v.imageURL || v.thumbURL || "").trim() || "";
    if (!image) continue;
    const durationText = formatDuration(duration);
    posts.push({
      title,
      link,
      image,
      tag: durationText || void 0,
      cornerTag: durationText || void 0
    });
  }
  return posts;
}
async function loadSeen(kvStore, key) {
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
async function saveSeen(kvStore, key, list) {
  if (!kvStore || typeof kvStore.set !== "function") return;
  try {
    const trimmed = list.slice(-MAX_SEEN_ENTRIES);
    await kvStore.set(key, JSON.stringify(trimmed));
  } catch (e) {
  }
}
async function fetchListingPage(axios, requestUrl, baseUrl, cookieHeader, signal, kvStore) {
  let lastPosts = [];
  for (let attempt = 1; attempt <= MAX_LIST_ATTEMPTS; attempt++) {
    try {
      const res = await axios.get(requestUrl, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: `${baseUrl}/`,
          ...cookieHeader ? { Cookie: cookieHeader } : {}
        },
        signal,
        timeout: 15e3,
        maxRedirects: 3
      });
      if (res.request && res.request.responseURL) {
        await recordRedirect(kvStore, requestUrl, res.request.responseURL);
      }
      const html = res.data || "";
      const posts = parseVideoEntries(html, baseUrl);
      if (posts.length > 0) return posts;
      lastPosts = posts;
    } catch (e) {
    }
    if (attempt < MAX_LIST_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  return lastPosts;
}
function filterToPath(filter) {
  const f = (filter || "").trim();
  if (!f || f === "homepage" || f === "trending") return "/";
  if (f.startsWith("genre:") || f.startsWith("tag:")) {
    const slug = f.split(":")[1] || "";
    return slug ? `/categories/${slug}` : "/";
  }
  if (f.startsWith("/")) return f;
  return `/categories/${f}`;
}
var getPosts = async function({
  filter,
  page,
  signal,
  providerContext
}) {
  const { axios, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const p = Math.max(1, page || 1);
  const cookieHeader = await getCookieHeader(kvStore);
  const only3D = await getOnly3D(kvStore);
  let path = filterToPath(filter);
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
      const posts2 = await fetchListingPage(
        axios,
        searchUrl,
        baseUrl,
        cookieHeader,
        signal,
        kvStore
      );
      return dedupeAcrossPages(kvStore, `xhamsterSeen:search:${slug} 3d`, posts2, p);
    }
  }
  const requestUrl = p > 1 ? `${baseUrl}${path}${path.endsWith("/") ? "" : "/"}${p}` : `${baseUrl}${path === "/" ? "" : path}`;
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
var getSearchPosts = async function({
  searchQuery,
  page,
  signal,
  providerContext
}) {
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
async function dedupeAcrossPages(kvStore, key, posts, page) {
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
