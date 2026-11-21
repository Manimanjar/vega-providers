// @vega-provider pornhub
// @vega-version 2.3.6
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
function parseApiDuration(text) {
  var parts = String(text || "").split(":").map(function(p) {
    return parseInt(p, 10) || 0;
  });
  if (parts.length === 0) return 0;
  var s = 0;
  for (var i = 0; i < parts.length; i++) s = s * 60 + parts[i];
  return s;
}
function extractViewkey(link) {
  const m = String(link || "").match(/viewkey=([a-zA-Z0-9]+)/i);
  return m ? m[1] : null;
}
async function fetchVideoById(viewkey, axios, candidateBases) {
  for (const base of candidateBases) {
    for (let retry = 0; retry < 2; retry++) {
      try {
        const apiUrl = `${base}/webmasters/video_by_id?id=${viewkey}&thumbsize=medium`;
        const res = await axios.get(apiUrl, {
          headers: {
            Accept: "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: `${base}/`,
            Cookie: "platform=pc; bs=0"
          },
          timeout: 6e3
        });
        if (res.data && res.data.video) {
          return res.data.video;
        }
      } catch (e) {
        if (retry === 0) await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
  return null;
}
var getMeta = async function({
  link,
  providerContext
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  const viewkey = extractViewkey(link);
  const candidateBases = [
    baseUrl,
    "https://www.pornhub.com",
    "https://www.pornhub.org",
    "https://www.pornhub.net"
  ].filter((b, idx, arr) => arr.indexOf(b) === idx);
  let apiVideo = null;
  if (viewkey) {
    apiVideo = await fetchVideoById(viewkey, axios, candidateBases);
  }
  let title = apiVideo ? String(apiVideo.title || "").trim() : "";
  let image = "";
  if (apiVideo) {
    if (apiVideo.thumbs && Array.isArray(apiVideo.thumbs) && apiVideo.thumbs.length > 0) {
      const fl = apiVideo.thumbs.find((t) => t && t.src && t.src.includes("pix-fl"));
      if (fl && fl.src) image = fl.src;
    }
    if (!image) {
      image = apiVideo.default_thumb || apiVideo.thumb || "";
    }
  }
  let synopsis = title ? `Watch ${title} on PornHub.` : "";
  let tags = [];
  if (apiVideo && Array.isArray(apiVideo.tags)) {
    tags = apiVideo.tags.map((t) => t.tag_name || t).filter(Boolean);
  }
  if (apiVideo && Array.isArray(apiVideo.categories)) {
    apiVideo.categories.forEach((c) => {
      const catName = c.category || c;
      if (catName && !tags.includes(catName)) tags.push(catName);
    });
  }
  const cast = [];
  if (apiVideo && Array.isArray(apiVideo.pornstars)) {
    apiVideo.pornstars.forEach((p) => {
      const name = p.pornstar_name || p;
      if (name && !cast.includes(name)) cast.push(name);
    });
  }
  let views = apiVideo ? parseInt(apiVideo.views, 10) || 0 : 0;
  let rating = apiVideo ? Math.round(parseFloat(apiVideo.rating) || 0) : 0;
  let durationSec = apiVideo ? parseApiDuration(apiVideo.duration) : 0;
  const pathPart = viewkey ? `/view_video.php?viewkey=${viewkey}` : link.startsWith("http") ? new URL(link).pathname + new URL(link).search : link;
  for (const curBase of candidateBases) {
    const targetUrl = `${curBase}${pathPart.startsWith("/") ? "" : "/"}${pathPart}`;
    try {
      const res = await axios.get(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-CH-UA": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
          "Sec-CH-UA-Mobile": "?0",
          "Sec-CH-UA-Platform": '"Windows"',
          Referer: `${curBase}/`,
          Cookie: "platform=pc; bs=0"
        },
        timeout: 7e3,
        maxRedirects: 5
      });
      if (res.request && res.request.responseURL && kvStore) {
        try {
          const origin = new URL(res.request.responseURL).origin.replace(/\/+$/, "");
          if (origin && origin.startsWith("http") && origin !== baseUrl) {
            kvStore.set("pornhub_learnedDomain", origin);
          }
        } catch (e) {
        }
      }
      const html = res.data || "";
      if (typeof html === "string" && html.length > 500) {
        const $ = cheerio.load(html);
        const htmlTitle = $("h1").first().text().trim() || $("title").first().text().replace(/- Pornhub\.com/i, "").trim();
        if (htmlTitle && htmlTitle !== "Video") {
          title = htmlTitle;
        }
        const ogImg = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
        if (ogImg) {
          image = ogImg;
        }
        const pageSynopsis = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content");
        if (pageSynopsis) {
          synopsis = pageSynopsis;
        }
        const pageViews = parseViews($(".views").first().text());
        if (pageViews > 0) views = pageViews;
        const durMeta = $('meta[property="video:duration"]').attr("content");
        if (durMeta) {
          const d = parseInt(durMeta, 10) || 0;
          if (d > 0) durationSec = d;
        }
        $('a[href*="/video/tag/"], a[href*="/categories/"]').each(function(_, el) {
          const t = $(el).text().trim();
          if (t && !tags.includes(t) && tags.length < 30) tags.push(t);
        });
        break;
      }
    } catch (e) {
    }
  }
  if (!title) title = "Video";
  if (!synopsis) synopsis = `Watch ${title} on PornHub.`;
  const info = {
    title,
    image,
    poster: image,
    synopsis,
    type: "movie",
    tags: tags.length > 0 ? tags : void 0,
    cast: cast.length > 0 ? cast : void 0,
    linkList: [
      {
        title: "Stream Video",
        directLinks: [
          {
            title: title || "Watch",
            link: link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`,
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
};
