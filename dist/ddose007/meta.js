// @vega-provider ddose007
// @vega-version 1.0.2
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

// providers/ddose007/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});
module.exports = __toCommonJS(meta_exports);

// providers/ddose007/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://ddose007.co";
var BASE_CACHE_KEY = "ddose007_baseUrlCacheV3";
var LEARNED_KEY = "ddose007_learnedDomain";
var CANDIDATE_MIRRORS = [
  "https://ddose007.co",
  "https://ddose007.cc"
];
var memoryCache = { url: "", expiresAt: 0 };
async function isHealthyMirror(axios, mirror) {
  try {
    const res = await axios.get(mirror, {
      timeout: 3500,
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
          if (await isHealthyMirror(axios, cleanUrl)) {
            memoryCache.url = cleanUrl;
            memoryCache.expiresAt = now + 18e5;
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

// providers/ddose007/meta.ts
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
async function getMeta(linkOrOptions, providerContextArg) {
  let link = "";
  let signal = null;
  let providerContext = null;
  if (linkOrOptions && typeof linkOrOptions === "object" && ("providerContext" in linkOrOptions || "link" in linkOrOptions)) {
    link = linkOrOptions.link || "";
    signal = linkOrOptions.signal || null;
    providerContext = linkOrOptions.providerContext || null;
  } else {
    link = linkOrOptions || "";
    providerContext = providerContextArg || null;
  }
  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;
  if (!axios || !cheerio || !link) {
    return {
      title: "Unknown",
      type: "movie",
      linkList: []
    };
  }
  const baseUrl = await getBaseUrl(kvStore, axios);
  try {
    const res = await axios.get(link, {
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
    let title = $('meta[itemprop="name"]').attr("content") || $('meta[property="og:title"]').attr("content") || $(".video-title h1").first().text().trim() || $("h1").first().text().trim() || $("title").text().replace(/\s*\|\s*DDose007.*$/i, "").trim();
    title = title.replace(/\s+/g, " ").trim();
    const synopsis = $('meta[itemprop="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || $(".video-details, .entry-content").first().text().trim() || "";
    const image = $('meta[itemprop="thumbnailUrl"]').attr("content") || $('meta[property="og:image"]').attr("content") || $(".video-player img").first().attr("src") || "";
    const tags = [];
    $('.video-cat-tag a, a[rel="tag"]').each((_, el) => {
      const t = $(el).clone().children().remove().end().text().trim();
      if (t && !tags.includes(t)) tags.push(t);
    });
    const info = {
      title,
      synopsis,
      image,
      poster: image,
      imdbId: "",
      type: "movie",
      tags: tags.length > 0 ? tags : void 0,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title,
              link,
              type: "movie"
            }
          ]
        }
      ]
    };
    return info;
  } catch (e) {
    return {
      title: "Video",
      type: "movie",
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: "Watch",
              link,
              type: "movie"
            }
          ]
        }
      ]
    };
  }
}
