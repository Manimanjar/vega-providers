// @vega-provider faphouse
// @vega-version 1.0.1
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

// providers/faphouse/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});
module.exports = __toCommonJS(meta_exports);

// providers/faphouse/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://faphouse2.com";
var BASE_CACHE_KEY = "faphouse_baseUrlCacheV1";
var LEARNED_KEY = "faphouse_learnedDomain";
var CANDIDATE_MIRRORS = [
  "https://faphouse2.com",
  "https://faphouse.com",
  "https://pl.faphouse.com",
  "https://de.faphouse.com",
  "https://fr.faphouse.com",
  "https://it.faphouse.com",
  "https://es.faphouse.com"
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Cookie": "siteMode=desktop; locale=en;"
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
      if (res.data && res.data.faphouse && res.data.faphouse.url) {
        const remoteUrl = res.data.faphouse.url.replace(/\/+$/, "");
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

// providers/faphouse/posts.ts
function upgradeFaphouseImageUrl(src, srcset, posterSrc) {
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

// providers/faphouse/meta.ts
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function parseDurationSeconds(text) {
  if (!text) return 0;
  const parts = text.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < parts.length; i++) s = s * 60 + parts[i];
  return s;
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
    safeWebUrl = targetUrl;
    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        Cookie: "siteMode=desktop; locale=en;"
      },
      timeout: 1e4,
      maxRedirects: 3
    });
    if (res.request && res.request.responseURL) {
      await recordRedirect(kvStore, targetUrl, res.request.responseURL);
    }
    const html = res.data || "";
    const $ = cheerio.load(html);
    let title = $("h1").first().text().trim() || $("meta[property='og:title']").attr("content") || $("title").text().trim() || "FapHouse Video";
    title = title.replace(/\s*\|\s*Faphouse.*$/i, "").trim();
    let poster = $("meta[property='og:image']").attr("content") || $("video#video-trailer").attr("poster") || $("[data-poster-src]").attr("data-poster-src") || $("img.t-i").first().attr("src") || "";
    poster = upgradeFaphouseImageUrl(poster);
    let synopsis = $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "";
    if (!synopsis) {
      synopsis = `Watch ${title} in HD on FapHouse.`;
    }
    const tags = [];
    $(".video-info-details__categories a.vid-c[href*='/c/']").each((_, a) => {
      const t = $(a).text().trim();
      if (t && !tags.includes(t) && !t.includes("All") && t.length < 30) {
        tags.push(t);
      }
    });
    const cast = [];
    $(
      ".video-info-details__studio-link, .video-info-details__categories a.vid-c[href*='/models/'], .video-info-details__categories a.vid-c[href*='/pornstars/']"
    ).each((_, a) => {
      const name = $(a).text().trim();
      if (name && !cast.includes(name) && !name.includes("Join") && !name.includes("See more")) {
        cast.push(name);
      }
    });
    let durationSec = 600;
    let views = 1500;
    const vsMatch = html.match(/<script id="view-state-data"[^>]*>([\s\S]*?)<\/script>/i);
    if (vsMatch) {
      try {
        const vs = JSON.parse(vsMatch[1]);
        if (vs.video) {
          if (typeof vs.video.duration === "number" && vs.video.duration > 0) {
            durationSec = vs.video.duration;
          }
          if (Array.isArray(vs.video.pornstarNames)) {
            vs.video.pornstarNames.forEach((n) => {
              if (n && !cast.includes(n)) cast.push(n);
            });
          }
          if (vs.video.studioName && !cast.includes(vs.video.studioName)) {
            cast.push(vs.video.studioName);
          }
        }
      } catch (e) {
      }
    }
    if (durationSec === 600) {
      const durEl = $(".t-vi span, .video-info__duration").first().text().trim();
      if (durEl) {
        const parsed = parseDurationSeconds(durEl);
        if (parsed > 0) durationSec = parsed;
      }
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
      rating: "8.5/10",
      views,
      duration: durationSec,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: title || "Watch Full Video",
              link: safeWebUrl,
              type: "movie"
            }
          ]
        }
      ]
    };
  } catch (err) {
    const fallbackTitle = "FapHouse Video";
    return {
      title: fallbackTitle,
      synopsis: `Watch ${fallbackTitle} on FapHouse.`,
      image: "https://assets-nss.fhcdnmedia.online/9d3f29d8666549ad223adec08efdc848cffcf297/fap-site/default/images/favicons/favicon-96x96.png",
      poster: "https://assets-nss.fhcdnmedia.online/9d3f29d8666549ad223adec08efdc848cffcf297/fap-site/default/images/favicons/favicon-96x96.png",
      imdbId: "",
      type: "movie",
      tags: ["HD", "Adult"],
      cast: [],
      rating: "8.0/10",
      views: 1e3,
      duration: 600,
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
