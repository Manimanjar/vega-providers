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

// providers/xhamster/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});
module.exports = __toCommonJS(meta_exports);

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

// providers/xhamster/meta.ts
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
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
var getMeta = async function({
  link,
  providerContext
}) {
  const { axios, cheerio, kvStore } = providerContext;
  let safeWebUrl = link || "";
  try {
    const baseUrl = await getBaseUrl(kvStore, axios);
    let targetUrl = link;
    if (!targetUrl.startsWith("http")) {
      targetUrl = `${baseUrl}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
    }
    targetUrl = rewriteToBase(targetUrl, baseUrl);
    safeWebUrl = targetUrl;
    let sessionCookie = "";
    if (kvStore && typeof kvStore.get === "function") {
      try {
        sessionCookie = await kvStore.get("sessionCookie") || "";
      } catch (e) {
      }
    }
    const cookieHeader = String(sessionCookie || "").trim();
    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        ...cookieHeader ? { Cookie: cookieHeader } : {}
      },
      timeout: 15e3,
      maxRedirects: 3
    });
    if (res.request && res.request.responseURL) {
      await recordRedirect(kvStore, targetUrl, res.request.responseURL);
    }
    const html = res.data || "";
    const $ = cheerio.load(html);
    const initials = parseInitials(html);
    const vm = initials && initials.videoModel || {};
    let title = String(vm.title || "").trim() || $("meta[property='og:title']").attr("content") || $("title").text().trim() || "XHamster Video";
    title = title.replace(/\s*\|\s*XHamster.*$/i, "").trim();
    let poster = String(vm.imageURL || vm.thumbURL || "").trim() || $("meta[property='og:image']").attr("content") || "";
    poster = poster.trim();
    let synopsis = String(vm.description || "").trim() || $("meta[property='og:description']").attr("content") || "";
    if (!synopsis) {
      synopsis = `Watch ${title} on XHamster.`;
    }
    const tags = [];
    const cast = [];
    const tagList = initials && initials.videoTagsComponent && initials.videoTagsComponent.tags || [];
    if (Array.isArray(tagList)) {
      for (const t of tagList) {
        if (!t || typeof t !== "object") continue;
        const name = String(t.name || "").trim();
        if (!name) continue;
        if (t.isPornstar) {
          if (!cast.includes(name)) cast.push(name);
        } else if (t.isCategory || t.isTag) {
          if (!tags.includes(name) && tags.length < 15) tags.push(name);
        }
      }
    }
    const landingName = vm.landing && vm.landing.name ? String(vm.landing.name).trim() : "";
    if (landingName && !cast.includes(landingName)) cast.push(landingName);
    const authorName = vm.author && vm.author.name ? String(vm.author.name).trim() : "";
    if (authorName && !cast.includes(authorName)) cast.push(authorName);
    const views = typeof vm.views === "number" ? vm.views : parseInt(vm.views, 10) || 0;
    const duration = typeof vm.duration === "number" ? vm.duration : parseInt(vm.duration, 10) || 0;
    let rating = "";
    const ratingVal = vm.rating && typeof vm.rating.value === "number" ? vm.rating.value : null;
    if (ratingVal !== null && ratingVal > 0) {
      rating = `${(ratingVal / 10).toFixed(1)}/10`;
    }
    return {
      title,
      synopsis,
      image: poster,
      poster,
      imdbId: "",
      type: "movie",
      tags: tags.length > 0 ? tags : ["HD", "Adult"],
      cast,
      rating: rating || "8.0/10",
      views,
      duration,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: title || "Watch Video",
              link: safeWebUrl,
              type: "movie"
            }
          ]
        }
      ]
    };
  } catch (err) {
    const fallbackTitle = "XHamster Video";
    return {
      title: fallbackTitle,
      synopsis: `Watch ${fallbackTitle} on XHamster.`,
      image: "https://xhamster.com/favicon.ico",
      poster: "https://xhamster.com/favicon.ico",
      imdbId: "",
      type: "movie",
      tags: ["HD", "Adult"],
      cast: [],
      rating: "8.0/10",
      views: 0,
      duration: 0,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: fallbackTitle,
              link: safeWebUrl,
              type: "movie"
            }
          ]
        }
      ]
    };
  }
};
