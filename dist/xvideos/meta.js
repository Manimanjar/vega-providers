// @vega-provider xvideos
// @vega-version 2.4.1
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

// providers/xvideos/meta.ts
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
  var bucket = Math.floor(vid / 1e3) * 1e3;
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
    /^(.*?)\s*[-–—:]?\s*(?:part|pt\.?|volume|vol\.?|v\.?|episode|ep\.?|chapter|ch\.?|season|s\.?|book|bk\.?|#)\s*(\d+(?:\.\d+)?)\b\s*(.*)$/i
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
  } else if (site === "pornhub") {
    searchUrl = baseUrl + "/webmasters/search?search=" + encodeURIComponent(baseTitle) + "&thumbsize=large_hd";
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
    if (site === "pornhub") {
      var vids = res.data && Array.isArray(res.data.videos) ? res.data.videos : [];
      for (var vi = 0; vi < vids.length; vi++) {
        var v = vids[vi];
        if (!v || !v.title || !v.url) continue;
        var durSec = 0;
        if (typeof v.duration === "number") durSec = v.duration;
        else if (typeof v.duration === "string") {
          var dp = v.duration.split(":").map(function(x) {
            return parseInt(x, 10) || 0;
          });
          if (dp.length === 3) durSec = dp[0] * 3600 + dp[1] * 60 + dp[2];
          else if (dp.length === 2) durSec = dp[0] * 60 + dp[1];
          else if (dp.length === 1) durSec = dp[0];
        }
        var thumb = v.default_thumb || v.thumbs && v.thumbs[0] && v.thumbs[0].src || "";
        posts.push({
          title: v.title,
          link: v.url,
          image: thumb,
          _dur: durSec
        });
      }
      if (vids.length >= 30) {
        try {
          var res2 = await axios.get(searchUrl + "&page=2", {
            headers: Object.assign({}, commonHeaders, {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Referer: baseUrl + "/"
            }),
            timeout: 1e4,
            signal
          });
          var vids2 = res2.data && Array.isArray(res2.data.videos) ? res2.data.videos : [];
          for (var vi2 = 0; vi2 < vids2.length; vi2++) {
            var v2 = vids2[vi2];
            if (!v2 || !v2.title || !v2.url) continue;
            var durSec2 = 0;
            if (typeof v2.duration === "number") durSec2 = v2.duration;
            else if (typeof v2.duration === "string") {
              var dp2 = v2.duration.split(":").map(function(x) {
                return parseInt(x, 10) || 0;
              });
              if (dp2.length === 3) durSec2 = dp2[0] * 3600 + dp2[1] * 60 + dp2[2];
              else if (dp2.length === 2) durSec2 = dp2[0] * 60 + dp2[1];
              else if (dp2.length === 1) durSec2 = dp2[0];
            }
            var thumb2 = v2.default_thumb || v2.thumbs && v2.thumbs[0] && v2.thumbs[0].src || "";
            posts.push({
              title: v2.title,
              link: v2.url,
              image: thumb2,
              _dur: durSec2
            });
          }
        } catch (e2) {
        }
      }
    } else {
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
          var durSec3 = 0;
          var mm = durText.match(/(\d+)\s*min/i);
          var ss = durText.match(/(\d+)\s*sec/i);
          var hh = durText.match(/(\d+)\s*h/i);
          if (hh) durSec3 += parseInt(hh[1], 10) * 3600;
          if (mm) durSec3 += parseInt(mm[1], 10) * 60;
          if (ss) durSec3 += parseInt(ss[1], 10);
          posts.push({
            title: rawTitle,
            link: rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref,
            image,
            _dur: durSec3
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
          var image = img.attr("data-rd-src") || img.attr("data-rd-jpg") || img.attr("data-src") || img.attr("src") || "";
          if (image && image.indexOf("/contents/videos_screenshots/") !== -1) {
            image = image.replace(/\/\d+x\d+\/\d+\.jpg$/i, "/preview.jpg");
          }
          if (!image || image.indexOf("data:") === 0) {
            var idm = String(rawHref).match(/\/video\/(\d+)/);
            if (idm) {
              var vid2 = parseInt(idm[1], 10);
              var bucket2 = Math.floor(vid2 / 1e3) * 1e3;
              image = baseUrl + "/contents/videos_screenshots/" + bucket2 + "/" + vid2 + "/preview.jpg";
            }
          }
          if (!image || image.indexOf("data:") === 0) {
            var absLink = rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;
            image = r34PreviewFromLink(absLink, baseUrl) || image;
          }
          var durText = $el.find(".time").first().text().trim();
          var durSec3 = 0;
          var parts = durText.split(":").map(function(x) {
            return parseInt(x, 10) || 0;
          });
          if (parts.length === 2) durSec3 = parts[0] * 60 + parts[1];
          else if (parts.length === 3) durSec3 = parts[0] * 3600 + parts[1] * 60 + parts[2];
          posts.push({
            title: rawTitle,
            link: rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref,
            image,
            _dur: durSec3
          });
        });
      }
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
  return sorted.slice(0, 200);
}

// providers/xvideos/meta.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.xvideos.com";
var BASE_CACHE_KEY = "xvideos_baseUrlCacheV1";
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
    const cachedEntry = memoryCache.data["xvideos"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached = typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > now) {
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
        const entry = res.data["xvideos"];
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
      const learned = await kvStore.get("xvideos_learnedDomain");
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
  let sec = 0;
  const hMatch = text.match(/(\d+)\s*h/i);
  const mMatch = text.match(/(\d+)\s*min/i);
  const sMatch = text.match(/(\d+)\s*sec/i);
  if (hMatch) sec += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) sec += parseInt(mMatch[1], 10) * 60;
  if (sMatch) sec += parseInt(sMatch[1], 10);
  return sec;
}
var getMeta = async function({
  link,
  providerContext
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  let pathPart = link || "";
  if (pathPart.startsWith("http")) {
    try {
      const parsedUrl = new URL(pathPart);
      pathPart = parsedUrl.pathname + parsedUrl.search;
    } catch (e) {
    }
  }
  if (!pathPart.startsWith("/")) {
    pathPart = "/" + pathPart;
  }
  const candidateBases = [
    baseUrl,
    "https://www.xvideos.com",
    "https://www.xvideos3.com",
    "https://www.xvideos2.com"
  ].filter((b, idx, arr) => b && arr.indexOf(b) === idx);
  let effectiveUrl = `${baseUrl}${pathPart}`;
  try {
    let html = "";
    let workingBase = baseUrl;
    for (const curBase of candidateBases) {
      const targetUrl = `${curBase}${pathPart}`;
      for (let retry = 0; retry < 2; retry++) {
        try {
          const res = await axios.get(targetUrl, {
            headers: {
              ...commonHeaders,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Referer: `${curBase}/`,
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            timeout: 8e3,
            maxRedirects: 5
          });
          if (typeof res.data === "string" && res.data.includes("html5player")) {
            html = res.data;
            workingBase = curBase;
            effectiveUrl = targetUrl;
            break;
          }
          if (typeof res.data === "string" && res.data.length > 500) {
            html = res.data;
            workingBase = curBase;
            effectiveUrl = targetUrl;
            break;
          }
        } catch (e) {
          if (retry === 0) {
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      }
      if (html) break;
    }
    if (!html) {
      throw new Error("No HTML returned from any XVideos mirror");
    }
    const $ = cheerio.load(html);
    const playerTitleMatch = html.match(
      /html5player\.setVideoTitle\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const title = (playerTitleMatch ? playerTitleMatch[1] : null) || $("h2.page-title, .page-title, title").first().text().replace(/- XVIDEOS\.COM/i, "").trim() || "Video";
    const playerThumbMatch = html.match(
      /html5player\.setThumbUrl\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const playerThumb169Match = html.match(
      /html5player\.setThumbUrl169\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const ogImage = $('meta[property="og:image"]').attr("content") || "";
    const thumb169 = playerThumb169Match ? playerThumb169Match[1] : "";
    const thumbStd = playerThumbMatch ? playerThumbMatch[1] : "";
    const image = (thumb169 && !thumb169.endsWith(".avif") ? thumb169 : "") || (ogImage && !ogImage.endsWith(".avif") ? ogImage : "") || thumbStd || thumb169 || ogImage || "";
    const tags = [];
    $('.video-tags-list a[href^="/tags/"]').each((_, el) => {
      const tagText = $(el).text().trim();
      if (tagText && tagText !== "Edit tags" && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });
    const cast = [];
    $(
      '.video-tags-list a[href^="/models/"], .video-tags-list a[href^="/amateurs/"]'
    ).each((_, el) => {
      const name = $(el).clone().find(".count, .user-subscribe").remove().end().text().trim().replace(/\s*\d+[kM]?$/, "");
      if (name && !cast.includes(name)) {
        cast.push(name);
      }
    });
    const duration = $(".duration, .video-duration").first().text().trim();
    const durationSec = parseDurationSeconds(duration);
    const quality = html.includes("setVideoUrlHigh") || html.includes("1080p") ? "1080p" : "720p";
    const ratingMatch = $(".rating-good-perc").first().text().trim().match(/(\d+)/);
    const ratingVal = ratingMatch ? (parseInt(ratingMatch[1], 10) / 10).toFixed(1) : "8.2";
    const ratingStr = `${ratingVal}/10`;
    const synopsisParts = [
      `${title}${duration ? ` \u2014 ${duration}` : ""} \u2022 ${quality}.`
    ];
    if (cast.length > 0) {
      synopsisParts.push(`Starring ${cast.join(", ")}.`);
    }
    if (tags.length > 0) {
      synopsisParts.push(`Tags: ${tags.join(", ")}.`);
    }
    const synopsis = synopsisParts.join(" ");
    const parsed = parsePartTitle(title);
    if (parsed && parsed.partNum != null) {
      let seriesParts = [];
      try {
        seriesParts = await fetchSeriesParts({
          axios,
          cheerio,
          baseUrl: workingBase,
          site: "xvideos",
          baseTitle: parsed.base,
          commonHeaders
        });
      } catch (e) {
        seriesParts = [];
      }
      if (seriesParts.length >= 2) {
        const firstImage = seriesParts[0] && seriesParts[0].image || image;
        const seriesSynopsisParts = [
          parsed.base + " \u2014 " + seriesParts.length + " parts \u2022 " + quality + "."
        ];
        if (cast.length > 0) {
          seriesSynopsisParts.push("Starring " + cast.join(", ") + ".");
        }
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
          tags,
          cast,
          rating: ratingStr,
          duration: durationSec || 600,
          webUrl: effectiveUrl,
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
      tags,
      cast,
      rating: ratingStr,
      duration: durationSec || 600,
      webUrl: effectiveUrl,
      linkList: [
        {
          title: "Stream Video",
          quality,
          directLinks: [
            {
              title,
              link: effectiveUrl,
              type: "movie"
            }
          ]
        }
      ]
    };
  } catch (err) {
    console.error("XVideos meta error:", err?.message || err);
    return {
      title: "XVideos Video",
      synopsis: "Watch video on XVideos.",
      image: "",
      poster: "",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "8.0/10",
      duration: 600,
      webUrl: effectiveUrl,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: "Play",
              link: effectiveUrl,
              type: "movie"
            }
          ]
        }
      ]
    };
  }
};
