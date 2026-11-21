// @vega-provider rule34video
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

// providers/rule34video/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});
module.exports = __toCommonJS(meta_exports);

// providers/series.ts
function normalizeBase(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function wordCount(text) {
  var n = normalizeBase(text);
  return n ? n.split(" ").length : 0;
}
function r34PreviewFromLink(link, baseUrl) {
  var m = String(link || "").match(/\/video\/(\d+)/);
  if (!m) return "";
  var vid = parseInt(m[1], 10);
  var bucket = Math.floor(vid / 1e4) * 1e4;
  return baseUrl + "/contents/videos_screenshots/" + bucket + "/" + vid + "/preview.jpg";
}
function stripTrailingDuration(title) {
  return String(title || "").replace(/\s+\d{1,2}:\d{2}\s*$/, "").replace(/\s+\d+\s*min\s*$/i, "").trim();
}
function isYearLike(num) {
  return Number.isInteger(num) && num >= 1900 && num <= 2100;
}
function parsePartTitle(title) {
  var clean = stripTrailingDuration(title);
  if (!clean) return null;
  var m;
  m = clean.match(/^(.*?)\s*[-–—:]?\s*minus\s+(\d+(?:\.\d+)?)\s*(.*)$/i);
  if (m && wordCount(m[1]) >= 2) {
    var minusBase = m[1].trim().replace(/[-–—:]+$/, "").trim();
    if (minusBase && wordCount(minusBase) >= 2) {
      return {
        base: minusBase,
        baseKey: normalizeBase(minusBase),
        partNum: null,
        partLabel: "Minus " + m[2],
        subtitle: (m[3] || "").trim()
      };
    }
  }
  m = clean.match(
    /^(.*?)\s*[-–—:]?\s*(?:part|pt\.?|episode|ep\.?|chapter|ch\.?)\s*(\d+(?:\.\d+)?)\b\s*(.*)$/i
  );
  if (m) {
    var base1 = m[1].trim().replace(/[-–—:]+$/, "").trim();
    var num1 = parseFloat(m[2]);
    if (base1 && wordCount(base1) >= 2 && num1 < 1e3) {
      return {
        base: base1,
        baseKey: normalizeBase(base1),
        partNum: num1,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim()
      };
    }
  }
  m = clean.match(/^(.*?)\s*[-–—]\s*(\d+(?:\.\d+)?)\b\s*(.*)$/);
  if (m) {
    var base2 = m[1].trim();
    var num2 = parseFloat(m[2]);
    if (base2 && wordCount(base2) >= 2 && num2 < 1e3 && !isYearLike(num2)) {
      return {
        base: base2,
        baseKey: normalizeBase(base2),
        partNum: num2,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim()
      };
    }
  }
  m = clean.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*[-–—]?\s*(.*)$/);
  if (m) {
    var base3 = m[1].trim();
    var num3 = parseFloat(m[2]);
    if (base3 && wordCount(base3) >= 2 && num3 < 1e3 && !isYearLike(num3)) {
      return {
        base: base3,
        baseKey: normalizeBase(base3),
        partNum: num3,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim()
      };
    }
  }
  return null;
}
function naturalCompare(a, b) {
  var ax = String(a || "").toLowerCase().match(/(\d+(?:\.\d+)?|\D+)/g) || [];
  var bx = String(b || "").toLowerCase().match(/(\d+(?:\.\d+)?|\D+)/g) || [];
  var len = Math.max(ax.length, bx.length);
  for (var i = 0; i < len; i++) {
    var x = ax[i] || "";
    var y = bx[i] || "";
    if (x === y) continue;
    var nx = parseFloat(x);
    var ny = parseFloat(y);
    if (!isNaN(nx) && !isNaN(ny)) return nx - ny;
    return x < y ? -1 : 1;
  }
  return 0;
}
function sortParts(parts) {
  return parts.slice().sort(function(a, b) {
    var an = a.partNum;
    var bn = b.partNum;
    if (an != null && bn != null && an !== bn) return an - bn;
    if (an != null && bn == null) return -1;
    if (an == null && bn != null) return 1;
    return naturalCompare(a.title || "", b.title || "");
  });
}
async function fetchSeriesParts(opts) {
  var axios = opts.axios;
  var cheerio = opts.cheerio;
  var baseUrl = opts.baseUrl;
  var site = opts.site;
  var baseTitle = opts.baseTitle;
  var commonHeaders = opts.commonHeaders || {};
  var signal = opts.signal;
  if (!axios || !cheerio || !baseUrl || !baseTitle) return [];
  var baseKey = normalizeBase(baseTitle);
  if (!baseKey) return [];
  var searchUrl;
  if (site === "xvideos") {
    searchUrl = baseUrl + "/?k=" + encodeURIComponent(baseTitle) + "&p=0";
  } else {
    searchUrl = baseUrl + "/search/" + encodeURIComponent(baseTitle.trim().replace(/\s+/g, "-")) + "/";
  }
  var posts = [];
  try {
    var res = null;
    var lastErr = null;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        res = await axios.get(searchUrl, {
          headers: Object.assign({}, commonHeaders, {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: baseUrl + "/"
          }),
          timeout: 12e3,
          signal
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt === 0) {
          await new Promise(function(resolve) {
            setTimeout(resolve, 800);
          });
        }
      }
    }
    if (!res) throw lastErr || new Error("series search failed");
    var $ = cheerio.load(res.data || "");
    if (site === "xvideos") {
      $(".thumb-block").each(function(_, element) {
        var $el = $(element);
        var titleLink = $el.find("p.title a, .thumb-under p.title a, .title a").first();
        var rawTitle = titleLink.attr("title") || "";
        if (!rawTitle) {
          var cloned = titleLink.clone();
          cloned.find("span").remove();
          rawTitle = cloned.text().trim();
        }
        var rawHref = titleLink.attr("href") || $el.find(".thumb-inside a").first().attr("href") || "";
        if (!rawHref || !rawTitle) return;
        var img = $el.find("img").first();
        var image = img.attr("data-src") || img.attr("data-srcset") || img.attr("src") || "";
        var durText = $el.find(".duration, .video-duration").first().text().trim();
        var durSec = 0;
        var mm = durText.match(/(\d+)\s*min/i);
        var ss = durText.match(/(\d+)\s*sec/i);
        var hh = durText.match(/(\d+)\s*h/i);
        if (hh) durSec += parseInt(hh[1], 10) * 3600;
        if (mm) durSec += parseInt(mm[1], 10) * 60;
        if (ss) durSec += parseInt(ss[1], 10);
        posts.push({
          title: rawTitle,
          link: rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref,
          image,
          _dur: durSec
        });
      });
    } else {
      $(".item.thumb, [data-video-card-id]").each(function(_, element) {
        var $el = $(element);
        var a = $el.find('a.th, a[href*="/video/"]').first();
        var rawHref = a.attr("href") || "";
        var rawTitle = a.attr("title") || $el.find("img.thumb").attr("alt") || "";
        if (!rawHref || !rawTitle) return;
        if (rawHref.indexOf("/video/") === -1 && rawHref.indexOf("/videos/") === -1) return;
        var img = $el.find("img.thumb, img").first();
        var image = img.attr("data-rd-jpg") || img.attr("data-src") || img.attr("src") || "";
        if (!image || image.indexOf("data:") === 0) {
          var idm = String(rawHref).match(/\/video\/(\d+)/);
          if (idm) {
            var vid2 = parseInt(idm[1], 10);
            var bucket2 = Math.floor(vid2 / 1e4) * 1e4;
            image = baseUrl + "/contents/videos_screenshots/" + bucket2 + "/" + vid2 + "/preview.jpg";
          }
        }
        if (!image || image.indexOf("data:") === 0) {
          var absLink = rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;
          image = r34PreviewFromLink(absLink, baseUrl) || image;
        }
        var durText = $el.find(".time").first().text().trim();
        var durSec = 0;
        var parts = durText.split(":").map(function(x) {
          return parseInt(x, 10) || 0;
        });
        if (parts.length === 2) durSec = parts[0] * 60 + parts[1];
        else if (parts.length === 3) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        posts.push({
          title: rawTitle,
          link: rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref,
          image,
          _dur: durSec
        });
      });
    }
  } catch (e) {
    return [];
  }
  var seen = {};
  var kept = [];
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    if (!p.link || seen[p.link]) continue;
    var parsed = parsePartTitle(p.title);
    if (parsed && parsed.baseKey === baseKey && parsed.partNum != null) {
      seen[p.link] = true;
      kept.push({
        title: p.title,
        link: p.link,
        image: p.image,
        _dur: p._dur || 0,
        partNum: parsed.partNum,
        partLabel: parsed.partLabel
      });
    } else if (parsed && parsed.baseKey === baseKey && parsed.partNum == null) {
      seen[p.link] = true;
      kept.push({
        title: p.title,
        link: p.link,
        image: p.image,
        _dur: p._dur || 0,
        partNum: null,
        partLabel: parsed.partLabel
      });
    } else {
      var titleNorm = normalizeBase(p.title);
      if (titleNorm.indexOf(baseKey + " ") === 0) {
        var rest = titleNorm.slice(baseKey.length).trim();
        if (rest && rest.split(" ").length <= 6) {
          seen[p.link] = true;
          kept.push({
            title: p.title,
            link: p.link,
            image: p.image,
            _dur: p._dur || 0,
            partNum: null,
            partLabel: rest.split(" ").map(function(w) {
              return w.charAt(0).toUpperCase() + w.slice(1);
            }).join(" ")
          });
        }
      }
    }
  }
  var sorted = sortParts(kept);
  return sorted.slice(0, 60);
}

// providers/rule34video/meta.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://rule34video.com";
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
    const cachedEntry = memoryCache.data["rule34video"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 4e3 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 36e5;
        const entry = res.data["rule34video"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("rule34video_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  return DEFAULT_BASE_URL;
}
var getMeta = async function({
  link,
  providerContext
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  const url = link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
  try {
    const res = await axios.get(url, {
      headers: {
        ...commonHeaders,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl + "/"
      },
      maxRedirects: 5
    });
    const html = res.data;
    const $ = cheerio.load(html);
    if (url.includes("/tags/") || url.includes("/categories/")) {
      const directLinks = [];
      $(".item.thumb, [data-video-card-id]").each((_, element) => {
        const $el = $(element);
        const linkEl = $el.find("a.th, a[href*='/video/']").first();
        const rawHref = linkEl.attr("href") || "";
        const rawTitle = linkEl.attr("title") || $el.find("img.thumb").attr("alt") || linkEl.text().trim();
        if (rawHref && rawTitle) {
          const abs = rawHref.startsWith("http") ? rawHref : `${baseUrl}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;
          directLinks.push({
            title: rawTitle,
            link: abs,
            type: "movie"
          });
        }
      });
      const tagTitle = $("h1").first().text().trim() || $("title").text().replace(/- Rule34Video/i, "").trim() || "Tag Playlist";
      const rawFirst = $(".item.thumb img").first();
      const rawFirstSrc = rawFirst.attr("data-rd-src") || rawFirst.attr("src") || "";
      const firstImage2 = rawFirstSrc ? rawFirstSrc.includes("/contents/videos_screenshots/") ? rawFirstSrc.replace(/\/\d+x\d+\/\d+\.jpg$/i, "/preview.jpg") : rawFirstSrc : `${baseUrl}/apple-touch-icon.png`;
      return {
        title: tagTitle,
        synopsis: "",
        image: firstImage2,
        poster: firstImage2,
        imdbId: "",
        type: "series",
        linkList: [
          {
            title: "Videos",
            directLinks: directLinks.length > 0 ? directLinks : [{ title: tagTitle, link: url, type: "movie" }]
          }
        ]
      };
    }
    const title = $("h1").first().text().trim() || $("meta[property='og:title']").attr("content") || $("title").text().replace(/- Rule34Video/i, "").trim() || "Video";
    var thumbMatch = html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i);
    var image = thumbMatch && thumbMatch[1] || "";
    if (image && image.includes("/contents/videos_screenshots/")) {
      image = image.replace(/\/\d+x\d+\/\d+\.jpg$/i, "/preview.jpg");
    }
    if (!image) {
      var idMatch = url.match(/\/video\/(\d+)/);
      if (idMatch) {
        var vid = parseInt(idMatch[1], 10);
        var bucket = Math.floor(vid / 1e3) * 1e3;
        image = baseUrl + "/contents/videos_screenshots/" + bucket + "/" + vid + "/preview.jpg";
      }
    }
    const is4k = html.includes("2160p") || html.includes("4k") || html.includes("_4k");
    const is1080p = html.includes("1080p");
    const quality = is4k ? "2160p" : is1080p ? "1080p" : "720p";
    const tags = [];
    $('.vp-tags a[href*="/tags/"]').each((_, el) => {
      const tagText = $(el).text().trim();
      if (tagText && tagText !== "Tags" && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });
    let duration = "";
    const durMatch = html.match(
      /"duration":\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/i
    );
    if (durMatch) {
      const h = parseInt(durMatch[1] || "0", 10);
      const m = parseInt(durMatch[2] || "0", 10);
      const s = parseInt(durMatch[3] || "0", 10);
      duration = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
    }
    const synopsisParts = [
      `${title}${duration ? ` \u2014 ${duration}` : ""} \u2022 ${quality}.`
    ];
    if (tags.length > 0) {
      synopsisParts.push(`Tags: ${tags.join(", ")}.`);
    }
    const synopsis = synopsisParts.join(" ");
    var parsed = parsePartTitle(title);
    if (parsed && parsed.partNum != null) {
      var seriesParts = [];
      try {
        seriesParts = await fetchSeriesParts({
          axios,
          cheerio,
          baseUrl,
          site: "rule34video",
          baseTitle: parsed.base,
          commonHeaders
        });
      } catch (e) {
        seriesParts = [];
      }
      if (seriesParts.length >= 2) {
        var firstImage = seriesParts[0] && seriesParts[0].image || image;
        var seriesSynopsisParts = [
          parsed.base + " \u2014 " + seriesParts.length + " parts \u2022 " + quality + "."
        ];
        if (tags.length > 0) {
          seriesSynopsisParts.push("Tags: " + tags.join(", ") + ".");
        }
        return {
          title: parsed.base,
          synopsis: seriesSynopsisParts.join(" "),
          image: firstImage,
          poster: firstImage,
          imdbId: "",
          type: "series",
          tags: tags.length > 0 ? tags : void 0,
          rating: quality,
          webUrl: url,
          linkList: [
            {
              title: "Parts",
              directLinks: seriesParts.map(function(p) {
                return { title: p.title, link: p.link, type: "movie" };
              })
            }
          ]
        };
      }
    }
    return {
      title,
      synopsis,
      image,
      poster: image,
      imdbId: "",
      type: "movie",
      tags: tags.length > 0 ? tags : void 0,
      rating: quality,
      webUrl: url,
      linkList: [
        {
          title: "Stream Video",
          quality,
          directLinks: [
            {
              title,
              link: url,
              type: "movie"
            }
          ]
        }
      ]
    };
  } catch (err) {
    console.error("Rule34Video meta error:", err?.message || err);
    return {
      title: "Video Details",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: "Play",
              link: url,
              type: "movie"
            }
          ]
        }
      ]
    };
  }
};
