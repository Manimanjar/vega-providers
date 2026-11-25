// @vega-provider ddose007
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

// providers/ddose007/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});
module.exports = __toCommonJS(posts_exports);

// providers/ddose007/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://instavipclub.com";
var BASE_CACHE_KEY = "ddose007_baseUrlCacheV1";
var LEARNED_KEY = "ddose007_learnedDomain";
var CANDIDATE_MIRRORS = [
  "https://instavipclub.com",
  "https://instavipclub.net",
  "https://ddose007.cc",
  "https://ddose007.net",
  "https://ddose007.com"
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        },
        maxRedirects: 3
      }).then((res) => {
        if (!resolved && res.status >= 200 && res.status < 400) {
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
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
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
          memoryCache.url = cleanUrl;
          memoryCache.expiresAt = now + 18e5;
          return cleanUrl;
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
      if (origin && origin.startsWith("http") && origin !== currentBase) {
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
function parseCards($, containerSelector, baseUrl) {
  const posts = [];
  const seen = /* @__PURE__ */ new Set();
  $(containerSelector).each((_, el) => {
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
    let image = imgEl.attr("data-src") || imgEl.attr("src") || imgEl.attr("data-lazyloaded") || "";
    if (image.startsWith("data:")) {
      image = imgEl.attr("data-src") || "";
    }
    image = normalizeUrl(image, baseUrl);
    let title = titleLinkEl.text().trim() || imgEl.attr("alt") || linkEl.attr("title") || "Untitled";
    title = title.replace(/\s+/g, " ").trim();
    const tag = durationEl.text().trim() || void 0;
    const cornerTag = dateEl.text().trim() || void 0;
    posts.push({
      title,
      link,
      image,
      tag,
      cornerTag
    });
  });
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
  const cleanFilter = filter ? filter.replace(/^\/+|\/+$/g, "") : "";
  if (!cleanFilter) {
    targetUrl = page === 1 ? baseUrl : `${baseUrl}/page/${page}/`;
  } else {
    targetUrl = page === 1 ? `${baseUrl}/${cleanFilter}/` : `${baseUrl}/${cleanFilter}/page/${page}/`;
  }
  try {
    const res = await axios.get(targetUrl, {
      timeout: 8e3,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: baseUrl,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
    recordRedirect(res, baseUrl, kvStore);
    const $ = cheerio.load(res.data);
    return parseCards($, "article.vg-card", baseUrl);
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
  const baseUrl = await getBaseUrl(kvStore, axios);
  const q = encodeURIComponent(searchQuery);
  const targetUrl = page === 1 ? `${baseUrl}/?s=${q}` : `${baseUrl}/page/${page}/?s=${q}`;
  try {
    const res = await axios.get(targetUrl, {
      timeout: 8e3,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: baseUrl,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
    recordRedirect(res, baseUrl, kvStore);
    const $ = cheerio.load(res.data);
    return parseCards($, "article.vg-card", baseUrl);
  } catch (e) {
    return [];
  }
}
