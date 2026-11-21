// @vega-provider pornhub
// @vega-version 2.4.0
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
  getMeta: () => getMeta,
  upgradePornhubImageUrl: () => upgradePornhubImageUrl
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

// providers/pornhub/meta.ts
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
function upgradePornhubImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  let cleanUrl = url.trim();
  const origMatch = cleanUrl.match(
    /(?:https?:\/\/[^\/]+)?(\/(?:c\d+\/)?videos\/\d+\/\d+\/\d+\/original\/[^\/?#]+\.(?:jpe?g|png|webp))/i
  );
  if (origMatch && origMatch[1]) {
    return "https://ei.phncdn.com" + origMatch[1];
  }
  if (cleanUrl.includes("pix-fl.phncdn.com") || cleanUrl.includes("pix-egi.phncdn.com") || cleanUrl.includes("ei.phncdn.com")) {
    return cleanUrl;
  }
  if (cleanUrl.includes("pix-cdn77.phncdn.com")) {
    return cleanUrl.replace("pix-cdn77.phncdn.com", "pix-fl.phncdn.com");
  }
  return cleanUrl;
}
function extractViewkey(link) {
  const m = String(link || "").match(/viewkey=([a-zA-Z0-9]+)/i);
  return m ? m[1] : null;
}
async function fetchVideoById(viewkey, axios, candidateBases) {
  for (const base of candidateBases) {
    for (let retry = 0; retry < 2; retry++) {
      try {
        const apiUrl = `${base}/webmasters/video_by_id?id=${viewkey}&thumbsize=large_hd`;
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
    "https://rt.pornhub.com",
    "https://de.pornhub.com",
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
    const metaCandidates = [apiVideo.thumb, apiVideo.default_thumb];
    if (apiVideo.thumbs && Array.isArray(apiVideo.thumbs)) {
      for (const t of apiVideo.thumbs) {
        if (t && t.src) metaCandidates.push(t.src);
      }
    }
    for (const c of metaCandidates) {
      if (c && typeof c === "string" && c.includes("/original/")) {
        const up = upgradePornhubImageUrl(c);
        if (up && up.includes("ei.phncdn.com")) {
          image = up;
          break;
        }
      }
    }
    if (!image) {
      for (const c of metaCandidates) {
        if (c && typeof c === "string") {
          const up = upgradePornhubImageUrl(c);
          if (up && (up.includes("pix-fl.phncdn.com") || up.includes("pix-egi.phncdn.com") || up.includes("ei.phncdn.com"))) {
            image = up;
            break;
          }
        }
      }
    }
    if (!image) {
      image = upgradePornhubImageUrl(apiVideo.default_thumb || apiVideo.thumb || "");
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
          image = upgradePornhubImageUrl(ogImg);
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
  var parsed = parsePartTitle(title);
  if (parsed && parsed.partNum != null) {
    var seriesParts = [];
    try {
      seriesParts = await fetchSeriesParts({
        axios,
        cheerio,
        baseUrl,
        site: "pornhub",
        baseTitle: parsed.base,
        commonHeaders
      });
    } catch (e) {
      seriesParts = [];
    }
    if (seriesParts.length >= 2) {
      var firstImage = seriesParts[0] && seriesParts[0].image || image;
      var cleanFirstImage = upgradePornhubImageUrl(firstImage);
      var seriesSynopsisParts = [
        parsed.base + " \u2014 " + seriesParts.length + " parts."
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
        image: cleanFirstImage,
        poster: cleanFirstImage,
        imdbId: "",
        type: "series",
        tags: tags.length > 0 ? tags : void 0,
        cast: cast.length > 0 ? cast : void 0,
        rating: rating > 0 ? rating > 10 ? (rating / 10).toFixed(1) + "/10" : String(rating) : void 0,
        webUrl: link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`,
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
  if (rating > 0) {
    const r10 = rating > 10 ? (rating / 10).toFixed(1) : String(rating);
    info.rating = `${r10}/10`;
  }
  if (durationSec > 0) info.duration = durationSec;
  return info;
};
