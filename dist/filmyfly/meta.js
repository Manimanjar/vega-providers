// @vega-provider filmyfly
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

// providers/filmyfly/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});
module.exports = __toCommonJS(meta_exports);

// providers/filmyfly/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://filmyfly.kred";
var BASE_CACHE_KEY = "filmyfly_baseUrlCacheV1";
var LEARNED_KEY = "filmyfly_learnedDomain";
var DISCOVERY_API = "https://google.analytis.top/analytisa";
var CANDIDATE_MIRRORS = [
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

// providers/filmyfly/meta.ts
function parseDurationSeconds(text) {
  if (!text) return 0;
  let totalMinutes = 0;
  const hoursMatch = text.match(/(\d+)\s*(?:h|hr|hours?)/i);
  const minsMatch = text.match(/(\d+)\s*(?:m|min|minutes?)/i);
  if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) totalMinutes += parseInt(minsMatch[1], 10);
  return totalMinutes > 0 ? totalMinutes * 60 : 0;
}
async function parseLinkmakePage(linkmakeUrl, axios, cheerio, isSeries, referer) {
  try {
    const res = await axios.get(linkmakeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: referer || "https://linkmake.in/"
      },
      timeout: 1e4
    });
    const html = res.data || "";
    const $ = cheerio.load(html);
    const groups = [];
    const hasEpisodes = /Episode\s*[-–]?\s*\d+/i.test(html);
    if (hasEpisodes) {
      const centerDiv = $("center > div").first();
      const containerHtml = centerDiv.length > 0 ? centerDiv.html() || "" : html;
      const epRegex = /(?:🔰\s*~*×*\s*\(?\s*)?(Episode\s*[-–]?\s*\d+)(?:\s*\)?\s*~*×*\s*🔰)?([\s\S]*?)(?=(?:🔰\s*~*×*\s*\(?\s*)?Episode\s*[-–]?\s*\d+|$)/gi;
      let match;
      while ((match = epRegex.exec(containerHtml)) !== null) {
        const epTitle = match[1].trim();
        const epHtml = match[2];
        const $ep = cheerio.load(`<div>${epHtml}</div>`);
        const epDirectLinks = [];
        $ep(".dlink a, a[href*='filesdl']").each((_, a) => {
          let href = $(a).attr("href");
          let title = $(a).text().trim() || "Watch";
          if (href && href.startsWith("http") && !href.includes("/Tg/") && !href.includes("t.me") && !title.toLowerCase().includes("telegram")) {
            if (href.includes("filesdl") && href.includes("/drive/")) {
              href = href.replace("/drive/", "/cloud/");
            }
            title = title.replace(/^download\s+/i, "");
            epDirectLinks.push({
              title,
              link: href,
              type: "series"
            });
          }
        });
        if (epDirectLinks.length > 0) {
          groups.push({
            title: epTitle,
            directLinks: epDirectLinks
          });
        }
      }
    }
    if (groups.length === 0) {
      const directLinks = [];
      $(".dlink a, a[href*='filesdl']").each((_, a) => {
        let href = $(a).attr("href");
        let title = $(a).text().trim() || "Watch";
        if (href && href.startsWith("http") && !href.includes("/Tg/") && !href.includes("t.me") && !title.toLowerCase().includes("telegram")) {
          if (href.includes("filesdl") && href.includes("/drive/")) {
            href = href.replace("/drive/", "/cloud/");
          }
          title = title.replace(/^download\s+/i, "");
          directLinks.push({
            title,
            link: href,
            type: isSeries ? "series" : "movie"
          });
        }
      });
      if (directLinks.length > 0) {
        groups.push({
          title: "All Available Qualities",
          directLinks
        });
      }
    }
    return groups;
  } catch (err) {
    console.error("Linkmake parse error:", err?.message || err);
    return [];
  }
}
var getMeta = async function({
  link,
  providerContext
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const movieUrl = link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
  try {
    const res = await axios.get(movieUrl, {
      headers: {
        ...commonHeaders,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${baseUrl}/`
      },
      timeout: 12e3
    });
    recordRedirect(res, baseUrl, kvStore);
    const html = res.data || "";
    const $ = cheerio.load(html);
    const title = $("h2").first().text().trim() || $(".movie-info .fname:contains('Name') span").text().trim() || $("title").text().replace(/»\s*FilmyFly.*/i, "").trim() || "Movie";
    let image = $('meta[property="og:image"]').attr("content") || $(".movie-cover").attr("src") || "";
    if (image.startsWith("//")) image = "https:" + image;
    const synopsis = $(".movie-info .fname:contains('Description') span").text().trim() || $('meta[property="og:description"]').attr("content") || "";
    const tags = [];
    const genreText = $(".movie-info .fname:contains('Genre') span").text().trim();
    if (genreText) {
      genreText.split(",").forEach((g) => {
        const clean = g.trim();
        if (clean && !tags.includes(clean)) tags.push(clean);
      });
    }
    const durationText = $(".movie-info .fname:contains('Duration') span").text().trim();
    const durationSec = parseDurationSeconds(durationText);
    const isSeries = /Web[- ]?Series|Season|\bS0\d|\bS\d{2}|Episode/i.test(title) || /Web[- ]?Series/i.test(genreText) || /Web[- ]?Series/i.test($(".brcrmb").text());
    const downloadPageUrls = [];
    $(".dlbtn a, a.bg2, a[href*='linkmake'], a[href*='filesdl']").each(
      (_, el) => {
        const href = $(el).attr("href");
        const btnText = $(el).text().trim() || "Download Movie";
        if (href && href.startsWith("http") && !href.includes("/Tg/") && !href.includes("t.me") && !btnText.toLowerCase().includes("telegram")) {
          downloadPageUrls.push({ title: btnText, url: href });
        }
      }
    );
    const linkList = [];
    for (const dl of downloadPageUrls) {
      if (dl.url.includes("linkmake.in")) {
        const groups = await parseLinkmakePage(dl.url, axios, cheerio, isSeries, movieUrl);
        if (groups.length > 0) {
          linkList.push(...groups);
        } else {
          linkList.push({
            title: dl.title,
            directLinks: [
              {
                title: dl.title,
                link: dl.url,
                type: isSeries ? "series" : "movie"
              }
            ]
          });
        }
      } else {
        linkList.push({
          title: dl.title,
          directLinks: [
            {
              title: dl.title,
              link: dl.url,
              type: isSeries ? "series" : "movie"
            }
          ]
        });
      }
    }
    if (linkList.length === 0) {
      linkList.push({
        title: "Default Stream",
        directLinks: [
          {
            title,
            link: movieUrl,
            type: isSeries ? "series" : "movie"
          }
        ]
      });
    }
    const info = {
      title,
      synopsis,
      image,
      poster: image,
      type: isSeries ? "series" : "movie",
      tags,
      linkList
    };
    if (durationSec > 0) info.duration = durationSec;
    return info;
  } catch (err) {
    console.error("FilmyFly getMeta error:", err?.message || err);
    return {
      title: "Movie",
      synopsis: "",
      image: "",
      poster: "",
      type: "movie",
      linkList: [
        {
          title: "Stream",
          directLinks: [{ title: "Stream", link: movieUrl, type: "movie" }]
        }
      ]
    };
  }
};
