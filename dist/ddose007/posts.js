// @vega-provider ddose007
// @vega-version 1.1.0
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

// providers/ddose007/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});
module.exports = __toCommonJS(posts_exports);

// providers/ddose007/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://ddose007.tv";
var BASE_CACHE_KEY = "ddose007_baseUrlCacheV4";
var LEARNED_KEY = "ddose007_learnedDomainV2";
var CANDIDATE_MIRRORS = [
  "https://ddose007.tv",
  "https://ddose007.rest",
  "https://ddose007.homes"
];
var memoryCache = { url: "", expiresAt: 0 };
async function isHealthyMirror(axios, mirror) {
  try {
    const res = await axios.get(mirror, {
      timeout: 4500,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      maxRedirects: 3
    });
    if (res.status >= 200 && res.status < 400) {
      const dataStr = typeof res.data === "string" ? res.data : "";
      if (!dataStr.includes("Just a moment...") && !dataStr.includes("cf-mitigated") && !res.headers?.["cf-mitigated"]) {
        return true;
      }
    }
  } catch (e) {
  }
  return false;
}
async function probeMirrors(axios, mirrors) {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  for (const mirror of mirrors) {
    const ok = await isHealthyMirror(axios, mirror);
    if (ok) return mirror.replace(/\/+$/, "");
  }
  return null;
}
async function getBaseUrl(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const clean = custom.trim().replace(/\/+$/, "");
        if (clean !== DEFAULT_BASE_URL && !clean.includes("ddose007.cc") && !clean.includes("instavipclub")) {
          return clean;
        }
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
          memoryCache.url = String(cached.url).replace(/\/+$/, "");
          memoryCache.expiresAt = cached.expiresAt;
          return memoryCache.url;
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get(LEARNED_KEY);
      if (learned && typeof learned === "string" && learned.startsWith("http") && !learned.includes("instavipclub")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  let githubMirrors = CANDIDATE_MIRRORS;
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3e3 });
      if (res.data && res.data.ddose007) {
        const entry = res.data.ddose007;
        if (Array.isArray(entry.mirrors) && entry.mirrors.length > 0) {
          githubMirrors = entry.mirrors;
        }
        if (entry.url && entry.url.startsWith("http")) {
          const cleanUrl = entry.url.replace(/\/+$/, "");
          if (await isHealthyMirror(axios, cleanUrl)) {
            memoryCache.url = cleanUrl;
            memoryCache.expiresAt = now + 18e5;
            if (kvStore && typeof kvStore.set === "function") {
              try {
                await kvStore.set(
                  BASE_CACHE_KEY,
                  JSON.stringify({ url: cleanUrl, expiresAt: now + 18e5 })
                );
              } catch (e) {
              }
            }
            return cleanUrl;
          }
        }
      }
    } catch (e) {
    }
  }
  if (axios) {
    const probed = await probeMirrors(axios, githubMirrors);
    if (probed) {
      memoryCache.url = probed;
      memoryCache.expiresAt = now + 18e5;
      if (kvStore && typeof kvStore.set === "function") {
        try {
          await kvStore.set(LEARNED_KEY, probed);
          await kvStore.set(
            BASE_CACHE_KEY,
            JSON.stringify({ url: probed, expiresAt: now + 18e5 })
          );
        } catch (e) {
        }
      }
      return probed;
    }
  }
  return DEFAULT_BASE_URL;
}
function recordRedirect(res, currentBase, kvStore) {
  if (res && res.request && res.request.responseURL) {
    try {
      const u = new URL(res.request.responseURL);
      const origin = u.origin.replace(/\/+$/, "");
      if (origin && origin.startsWith("http") && origin !== currentBase && !origin.includes("instavipclub")) {
        memoryCache.url = origin;
        memoryCache.expiresAt = Date.now() + 18e5;
        kvStore?.set(LEARNED_KEY, origin);
        kvStore?.set(
          BASE_CACHE_KEY,
          JSON.stringify({ url: origin, expiresAt: Date.now() + 18e5 })
        );
      }
    } catch (e) {
    }
  }
}

// providers/ddose007/posts.ts
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function normalizeUrl(url, baseUrl) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
function extractImageUrl(src, baseUrl) {
  if (!src) return "";
  const nextMatch = src.match(/\/_next\/image\?url=([^&]+)/);
  if (nextMatch) {
    try {
      const decoded = decodeURIComponent(nextMatch[1]);
      if (decoded.startsWith("http")) return decoded;
    } catch (e) {
    }
  }
  if (src.startsWith("data:")) return "";
  return normalizeUrl(src, baseUrl);
}
function parseVideoBlocks($, baseUrl) {
  const posts = [];
  const seen = /* @__PURE__ */ new Set();
  $('a[href^="/post/"]').each((_, el) => {
    const $el = $(el);
    let link = $el.attr("href") || "";
    if (!link || link === "#" || link.startsWith("javascript:")) return;
    link = normalizeUrl(link, baseUrl);
    if (seen.has(link)) return;
    let title = $el.text().replace(/\s+/g, " ").trim();
    if (!title || title.length < 2) {
      title = $el.attr("title") || $el.find("img").first().attr("alt") || "Untitled";
      title = title.replace(/\s+/g, " ").trim();
    }
    if (!title || title.length < 2) return;
    const imgEl = $el.find("img").first();
    let image = extractImageUrl(
      imgEl.attr("src") || imgEl.attr("data-src") || "",
      baseUrl
    );
    if (!image) {
      const srcSet = imgEl.attr("srcSet") || imgEl.attr("srcset") || "";
      const first = srcSet.split(",")[0].trim().split(" ")[0];
      image = extractImageUrl(first, baseUrl);
    }
    seen.add(link);
    posts.push({ title, link, image });
  });
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
      } catch (e) {
      }
    }
  }
  if (posts.length === 0) {
    $(".video-block").each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find("a.thumb, a.infos, a").first();
      const titleEl = $el.find("span.title, a.infos").first();
      const imgEl = $el.find("img.video-img, img").first();
      let link = linkEl.attr("href") || "";
      if (!link || link === "#" || link.startsWith("javascript:")) return;
      link = normalizeUrl(link, baseUrl);
      if (seen.has(link)) return;
      let title = titleEl.text().trim() || linkEl.attr("title") || imgEl.attr("alt") || "Untitled";
      title = title.replace(/\s+/g, " ").trim();
      if (!title || title.length < 2) return;
      let image = imgEl.attr("data-src") || imgEl.attr("src") || imgEl.attr("data-lazy-src") || "";
      if (image.startsWith("data:")) image = imgEl.attr("data-src") || "";
      image = normalizeUrl(image, baseUrl);
      seen.add(link);
      posts.push({ title, link, image });
    });
  }
  return posts;
}
async function getPosts(filterOrOptions, pageArg, signalArg, providerContextArg) {
  let filter = "";
  let page = 1;
  let signal = null;
  let providerContext = null;
  if (filterOrOptions && typeof filterOrOptions === "object" && ("providerContext" in filterOrOptions || "page" in filterOrOptions || "filter" in filterOrOptions)) {
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
    targetUrl = page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}`;
  } else {
    const cleanFilter = filter.replace(/^\/+|\/+$/g, "");
    targetUrl = page === 1 ? `${baseUrl}/${cleanFilter}` : `${baseUrl}/${cleanFilter}/page/${page}`;
  }
  try {
    const res = await axios.get(targetUrl, {
      timeout: 9e3,
      signal,
      headers: {
        ...providerContext?.commonHeaders || {},
        "User-Agent": USER_AGENT,
        Referer: `${baseUrl}/`,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
    recordRedirect(res, baseUrl, kvStore);
    const $ = cheerio.load(res.data);
    return parseVideoBlocks($, baseUrl);
  } catch (e) {
    return [];
  }
}
async function getSearchPosts(queryOrOptions, pageArg, signalArg, providerContextArg) {
  let searchQuery = "";
  let page = 1;
  let signal = null;
  let providerContext = null;
  if (queryOrOptions && typeof queryOrOptions === "object" && ("providerContext" in queryOrOptions || "page" in queryOrOptions || "searchQuery" in queryOrOptions)) {
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
  if (page > 1) return [];
  const baseUrl = await getBaseUrl(kvStore, axios);
  const needle = searchQuery.trim().toLowerCase();
  if (!needle) return [];
  const headers = {
    "User-Agent": USER_AGENT,
    Referer: baseUrl,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
  };
  const matches = [];
  const seen = /* @__PURE__ */ new Set();
  for (let p = 1; p <= 3; p++) {
    const targetUrl = p === 1 ? `${baseUrl}/` : `${baseUrl}/page/${p}`;
    try {
      const res = await axios.get(targetUrl, { timeout: 8e3, signal, headers });
      recordRedirect(res, baseUrl, kvStore);
      const $ = cheerio.load(res.data);
      const pagePosts = parseVideoBlocks($, baseUrl);
      for (const post of pagePosts) {
        if (seen.has(post.link)) continue;
        seen.add(post.link);
        if (post.title.toLowerCase().includes(needle)) matches.push(post);
      }
    } catch (e) {
    }
  }
  return matches;
}
