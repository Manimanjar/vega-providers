// @vega-provider filmyfly
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

// providers/filmyfly/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});
module.exports = __toCommonJS(meta_exports);
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://filmyfly.kred";
var BASE_CACHE_KEY = "filmyfly_baseUrlCacheV1";
var memoryCache = { data: null, expiresAt: 0 };
async function getBase(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    const cachedEntry = memoryCache.data["filmyfly"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached = typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > Date.now()) {
          return String(cached.url).replace(/\/+$/, "");
        }
      }
    } catch (e) {
    }
  }
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3e3 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 36e5;
        const entry = res.data["filmyfly"];
        if (entry && entry.url) {
          const cleanEntry = entry.url.replace(/\/+$/, "");
          if (kvStore && typeof kvStore.set === "function") {
            try {
              await kvStore.set(
                BASE_CACHE_KEY,
                JSON.stringify({ url: cleanEntry, expiresAt: now + 36e5 })
              );
            } catch (e) {
            }
          }
          return cleanEntry;
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("filmyfly_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  return DEFAULT_BASE_URL;
}
function parseDurationSeconds(text) {
  if (!text) return 0;
  let totalMinutes = 0;
  const hoursMatch = text.match(/(\d+)\s*(?:h|hr|hours?)/i);
  const minsMatch = text.match(/(\d+)\s*(?:m|min|minutes?)/i);
  if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) totalMinutes += parseInt(minsMatch[1], 10);
  return totalMinutes > 0 ? totalMinutes * 60 : 0;
}
async function parseLinkmakePage(linkmakeUrl, axios, cheerio, isSeries) {
  try {
    const res = await axios.get(linkmakeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://filmyfly.kred/"
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
          const href = $(a).attr("href");
          const title = $(a).text().trim() || "Download";
          if (href && href.startsWith("http") && !href.includes("/Tg/") && !href.includes("t.me") && !title.toLowerCase().includes("telegram")) {
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
        const href = $(a).attr("href");
        const title = $(a).text().trim() || "Download";
        if (href && href.startsWith("http") && !href.includes("/Tg/") && !href.includes("t.me") && !title.toLowerCase().includes("telegram")) {
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
  const baseUrl = await getBase(kvStore, axios);
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
        const groups = await parseLinkmakePage(dl.url, axios, cheerio, isSeries);
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
