// @vega-provider pornhub
// @vega-version 2.3.5
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

// providers/pornhub/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});
module.exports = __toCommonJS(meta_exports);
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.pornhub.com";
var memoryCache = { data: null, expiresAt: 0 };
async function getBase(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        return custom.trim().replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  var now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    var cachedEntry = memoryCache.data["pornhub"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }
  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 4e3 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 36e5;
        var entry = res.data["pornhub"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {
    }
  }
  return DEFAULT_BASE_URL;
}
function parseViews(text) {
  var t = String(text || "").replace(/views?/i, "").trim();
  var m = t.match(/([\d.,]+)\s*([KM])?/i);
  if (!m) return 0;
  var n = parseFloat(m[1].replace(/,/g, "")) || 0;
  if (m[2] && m[2].toUpperCase() === "K") n *= 1e3;
  if (m[2] && m[2].toUpperCase() === "M") n *= 1e6;
  return Math.round(n);
}
var getMeta = async function({
  link,
  providerContext
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  var baseUrl = await getBase(kvStore, axios);
  var url = link.startsWith("http") ? link : baseUrl + (link.startsWith("/") ? "" : "/") + link;
  try {
    var res = await axios.get(url, {
      headers: Object.assign({}, commonHeaders, {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: baseUrl + "/"
      }),
      timeout: 12e3
    });
    var html = res.data || "";
    var $ = cheerio.load(html);
    var title = $("h1").first().text().trim() || $("title").first().text().replace(/- Pornhub\.com/i, "").trim() || "Video";
    var image = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";
    var views = parseViews($(".views").first().text());
    if (!views) {
      var viewsMatch = html.match(/"views"\s*:\s*(\d+)/);
      if (viewsMatch) views = parseInt(viewsMatch[1], 10) || 0;
    }
    var rating = 0;
    var ratingMatch = html.match(/"rating"\s*:\s*"?([\d.]+)/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]) || 0;
    var durationSec = 0;
    var durMeta = $('meta[property="video:duration"]').attr("content");
    if (durMeta) durationSec = parseInt(durMeta, 10) || 0;
    var synopsis = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";
    var tags = [];
    $('a[href*="/video/tag/"], a[href*="/categories/"]').each(function(_, el) {
      var t = $(el).text().trim();
      if (t && tags.indexOf(t) === -1 && tags.length < 30) tags.push(t);
    });
    if (res.request && res.request.responseURL) {
      try {
        var u = new URL(res.request.responseURL);
        var origin = u.origin.replace(/\/+$/, "");
        if (origin && origin.startsWith("http") && origin !== baseUrl) {
          kvStore?.set("pornhub_learnedDomain", origin);
        }
      } catch (e) {
      }
    }
    var info = {
      title,
      image,
      poster: image,
      synopsis,
      type: "movie",
      tags,
      linkList: [
        {
          title: "Stream",
          directLinks: [
            {
              title: title || "Watch",
              link: url,
              type: "movie"
            }
          ]
        }
      ]
    };
    if (views > 0) info.views = views;
    if (rating > 0) info.rating = rating;
    if (durationSec > 0) info.duration = durationSec;
    return info;
  } catch (err) {
    console.error("PornHub meta error:", err && err.message ? err.message : err);
    return {
      title: "Video",
      image: "",
      poster: "",
      synopsis: "",
      type: "movie",
      tags: [],
      linkList: [
        {
          title: "Stream",
          directLinks: [{ title: "Watch", link: url, type: "movie" }]
        }
      ]
    };
  }
};
