// @vega-provider filmyfly
// @vega-version 1.0.3
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

// providers/filmyfly/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts,
  upgradeImageUrl: () => upgradeImageUrl
});
module.exports = __toCommonJS(posts_exports);

// providers/filmyfly/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://filmyfly.haus";
var BASE_CACHE_KEY = "filmyfly_baseUrlCacheV1";
var LEARNED_KEY = "filmyfly_learnedDomain";
var DISCOVERY_API = "https://google.analytis.top/analytisa";
var CANDIDATE_MIRRORS = [
  "https://filmyfly.haus",
  "https://filmyfly.kred",
  "https://filmyfly.ee",
  "https://filmyfly.gift",
  "https://filmyfly.net",
  "https://filmyfly.ca",
  "https://filmyfly.info"
];
var memoryCache = { url: "", expiresAt: 0 };
function b64Decode(str) {
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(str, "base64").toString("utf8");
    } catch (e) {
    }
  }
  if (typeof atob === "function") {
    try {
      return atob(str);
    } catch (e) {
    }
  }
  return "";
}
async function fetchFromDiscoveryApi(axios) {
  if (!axios) return null;
  try {
    const now = /* @__PURE__ */ new Date();
    const v = now.getFullYear() * 1e6 + (now.getMonth() + 1) * 1e4 + now.getDate() * 100 + now.getHours() + 1;
    const res = await axios.get(`${DISCOVERY_API}?v=${v}`, {
      timeout: 3500,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (res.data && typeof res.data.c === "string") {
      const decoded = b64Decode(res.data.c);
      if (decoded && decoded.startsWith("http")) {
        const u = new URL(decoded);
        const origin = u.origin.replace(/\/+$/, "");
        if (origin.startsWith("http")) {
          return origin;
        }
      }
    }
  } catch (e) {
  }
  return null;
}
async function probeMirrors(axios, mirrors) {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  return new Promise((resolve) => {
    let resolved = false;
    let pending = mirrors.length;
    for (const mirror of mirrors) {
      axios.get(mirror, {
        timeout: 4e3,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
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
  if (axios) {
    const liveFromApi = await fetchFromDiscoveryApi(axios);
    if (liveFromApi) {
      memoryCache.url = liveFromApi;
      memoryCache.expiresAt = now + 18e5;
      if (kvStore && typeof kvStore.set === "function") {
        try {
          await kvStore.set(
            BASE_CACHE_KEY,
            JSON.stringify({ url: liveFromApi, expiresAt: now + 18e5 })
          );
          await kvStore.set(LEARNED_KEY, liveFromApi);
        } catch (e) {
        }
      }
      return liveFromApi;
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
      if (res.data && res.data.filmyfly) {
        const entry = res.data.filmyfly;
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

// providers/filmyfly/posts.ts
var SEARCH_API_ENDPOINT = "https://webfind.filmyflydla.space";
function extractYearOrQuality(title) {
  if (!title) return "";
  const yearMatch = title.match(/\b(202\d|201\d|199\d)\b/);
  const qualMatch = title.match(/\b(2160p|1080p|720p|480p|4K|HD|HEVC|WEB-DL|BluRay|HQCam)\b/i);
  if (yearMatch && qualMatch) return `${yearMatch[1]} \u2022 ${qualMatch[1].toUpperCase()}`;
  if (yearMatch) return yearMatch[1];
  if (qualMatch) return qualMatch[1].toUpperCase();
  return "";
}
function slug(title) {
  const s = String(title || "").replace(/[()]/g, "").replace(/[^A-Za-z0-9 ]/g, "").replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
  return s !== "" ? s : "item";
}
function upgradeImageUrl(url) {
  if (!url) return "";
  let clean = url;
  if (clean.startsWith("//")) clean = "https:" + clean;
  clean = clean.replace(/\/webp\/\d+-\d+-[12]x-/, "/webp/280-380-3x-");
  return clean;
}
function parseCards($, containerSelector, baseUrl) {
  const posts = [];
  const seen = /* @__PURE__ */ new Set();
  $(containerSelector).each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a.row-thumb-link").first();
    const titleLinkEl = $el.find("a[href*='/movie/']").last();
    let link = linkEl.attr("href") || titleLinkEl.attr("href") || "";
    if (!link) return;
    if (!link.startsWith("http")) {
      link = `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
    }
    if (seen.has(link)) return;
    seen.add(link);
    const imgEl = $el.find("img.row-thumb").first();
    let image = upgradeImageUrl(imgEl.attr("src") || "");
    let title = $el.find(".row-title").first().text().trim() || imgEl.attr("alt") || titleLinkEl.text().trim() || "Untitled";
    const tag = $el.find(".row-badge").first().text().trim() || void 0;
    const cornerTag = extractYearOrQuality(title) || void 0;
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
var getPosts = async function({
  filter,
  page,
  signal,
  providerContext
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const curPage = Math.max(1, page || 1);
  if (filter && filter.startsWith("genre:")) {
    const genre = filter.replace("genre:", "").trim();
    return getSearchPosts({
      searchQuery: genre,
      page: curPage,
      signal,
      providerContext
    });
  }
  let targetUrl = `${baseUrl}/`;
  let isTrending = filter === "trending";
  if (isTrending) {
    if (curPage > 1) return [];
    targetUrl = `${baseUrl}/`;
  } else if (!filter || filter === "latest") {
    targetUrl = curPage > 1 ? `${baseUrl}/?page=${curPage}` : `${baseUrl}/`;
  } else if (filter.startsWith("/")) {
    targetUrl = curPage > 1 ? `${baseUrl}${filter}?page=${curPage}` : `${baseUrl}${filter}`;
  } else {
    targetUrl = curPage > 1 ? `${baseUrl}/${filter}?page=${curPage}` : `${baseUrl}/${filter}`;
  }
  try {
    const res = await axios.get(targetUrl, {
      headers: {
        ...commonHeaders,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${baseUrl}/`
      },
      signal,
      timeout: 1e4
    });
    recordRedirect(res, baseUrl, kvStore);
    const html = res.data || "";
    const $ = cheerio.load(html);
    if (isTrending) {
      const trendingCards = [];
      let inTrending = false;
      $("main > *").each((_, el) => {
        const text = $(el).text();
        if (text.includes("Trending Movies & Web Series")) {
          inTrending = true;
          return;
        }
        if (text.includes("Latest Movies") || text.includes("Select Category")) {
          inTrending = false;
          return;
        }
        if (inTrending && $(el).hasClass("A10")) {
          const parsed = parseCards($, el, baseUrl);
          if (parsed.length > 0) trendingCards.push(parsed[0]);
        }
      });
      if (trendingCards.length > 0) return trendingCards;
    }
    return parseCards($, ".A10", baseUrl);
  } catch (err) {
    console.error("FilmyFly getPosts error:", err?.message || err);
    return [];
  }
};
var getSearchPosts = async function({
  searchQuery,
  page,
  signal,
  providerContext
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const curPage = Math.max(1, page || 1);
  const query = (searchQuery || "").trim();
  if (!query) return [];
  try {
    const apiUrl = `${SEARCH_API_ENDPOINT}/search?q=${encodeURIComponent(
      query
    )}&page=${curPage}&per_page=20`;
    const res = await axios.get(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${baseUrl}/`
      },
      signal,
      timeout: 8e3
    });
    if (res.data && Array.isArray(res.data.results)) {
      const posts = res.data.results.map((item) => {
        const itemSlug = slug(item.title);
        const link = `${baseUrl}/movie/${encodeURIComponent(
          item.filmyfly || ""
        )}/${encodeURIComponent(itemSlug)}.html`;
        let image = upgradeImageUrl(item.poster || "");
        return {
          title: item.title || "Untitled",
          link,
          image,
          tag: item.foldern || void 0,
          cornerTag: extractYearOrQuality(item.title) || void 0
        };
      });
      if (posts.length > 0) return posts;
    }
  } catch (apiErr) {
  }
  try {
    const searchUrl = `${baseUrl}/search.html?search=${encodeURIComponent(
      query
    )}&page=${curPage}`;
    const res = await axios.get(searchUrl, {
      headers: {
        ...commonHeaders,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${baseUrl}/`
      },
      signal,
      timeout: 1e4
    });
    recordRedirect(res, baseUrl, kvStore);
    const html = res.data || "";
    const $ = cheerio.load(html);
    return parseCards($, ".A10", baseUrl);
  } catch (err) {
    console.error("FilmyFly search fallback error:", err?.message || err);
    return [];
  }
};
