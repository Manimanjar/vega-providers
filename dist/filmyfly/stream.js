// @vega-provider filmyfly
// @vega-version 1.0.3
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

// providers/filmyfly/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function extractQuality(str) {
  if (/\b(?:2160p?|4k|uhd)\b/i.test(str)) return "2160";
  if (/\b(?:1080p?|fhd)\b/i.test(str)) return "1080";
  if (/\b(?:720p?)\b/i.test(str)) return "720";
  if (/\b(?:480p?|sd)\b/i.test(str)) return "480";
  if (/\bhd\b/i.test(str)) return "720";
  return "auto";
}
async function extractFromFilesdl(filesdlUrl, axios, cheerio, signal) {
  const streams = [];
  const seen = /* @__PURE__ */ new Set();
  const targetUrl = filesdlUrl.replace("/drive/", "/cloud/");
  try {
    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://linkmake.in/"
      },
      signal,
      timeout: 1e4
    });
    const html = res.data || "";
    const $ = cheerio.load(html);
    const titleText = $(".title").first().text().trim() || "";
    const defaultQuality = extractQuality(titleText);
    const q = defaultQuality !== "auto" ? defaultQuality : "1080";
    const fffastLink = $("a[href*='zdownload.php'], a[href*='fffast']").first().attr("href");
    if (fffastLink && fffastLink.startsWith("http")) {
      const cleanFffast = fffastLink.replace(/&amp;/g, "&");
      try {
        const redRes = await axios.get(cleanFffast, {
          headers: { "User-Agent": USER_AGENT, Referer: targetUrl },
          maxRedirects: 0,
          validateStatus: (s) => s >= 200 && s < 400,
          timeout: 4e3
        });
        const location = redRes.headers.location;
        if (location && location.startsWith("http")) {
          seen.add(location);
          streams.push({
            server: `Google Direct Fast Stream (10Gbps) [${q}p]`,
            link: location,
            type: "mp4",
            quality: q,
            headers: { "User-Agent": USER_AGENT }
          });
        }
      } catch (e) {
        if (!seen.has(cleanFffast)) {
          seen.add(cleanFffast);
          streams.push({
            server: `Fast Direct Stream (10Gbps) [${q}p]`,
            link: cleanFffast,
            type: "mp4",
            quality: q,
            headers: { "User-Agent": USER_AGENT, Referer: targetUrl }
          });
        }
      }
    }
    $("a[href*='.r2.dev']").each((_, el) => {
      let href = $(el).attr("href");
      if (!href || href.includes("t.me") || href.includes("telegram")) return;
      if (!href.startsWith("http")) return;
      href = href.replace(/&amp;/g, "&");
      if (!href.includes("token=")) {
        const randToken = Math.floor(1e9 + Math.random() * 9e9);
        href = `${href}${href.includes("?") ? "&" : "?"}token=${randToken}`;
      }
      if (!seen.has(href)) {
        seen.add(href);
        const text = $(el).text().trim() || titleText;
        const itemQ = extractQuality(text) !== "auto" ? extractQuality(text) : q;
        streams.push({
          server: `Cloud Direct (High Speed) [${itemQ}p]`,
          link: href,
          type: "mp4",
          quality: itemQ,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: targetUrl
          }
        });
      }
    });
    $("a[href*='pixeldrain.com/u/'], a[href*='iwebp.store/u/']").each((_, el) => {
      let href = $(el).attr("href");
      if (!href) return;
      href = href.replace(/&amp;/g, "&");
      const match = href.match(/\/u\/([a-zA-Z0-9]+)/);
      if (match) {
        const pid = match[1];
        if (pid.toLowerCase() === "bigxxx") return;
        const streamUrl = `https://pixeldrain.com/api/file/${pid}`;
        if (!seen.has(streamUrl)) {
          seen.add(streamUrl);
          streams.push({
            server: `Pixeldrain Fast Stream [${q}p]`,
            link: streamUrl,
            type: "mp4",
            quality: q,
            headers: { "User-Agent": USER_AGENT }
          });
        }
      }
    });
    if (streams.length === 0) {
      const mediaRe = /https?:\/\/[^"'\s<>]+\.(?:mp4|mkv|m3u8)[^"'\s<>]*/gi;
      let m;
      while ((m = mediaRe.exec(html)) !== null) {
        const u = m[0].replace(/&amp;/g, "&");
        if (!seen.has(u)) {
          seen.add(u);
          const isHls = u.includes(".m3u8");
          streams.push({
            server: isHls ? "Direct HLS Stream" : "Direct Video Stream",
            link: u,
            type: isHls ? "m3u8" : "mp4",
            quality: q,
            headers: { "User-Agent": USER_AGENT, Referer: targetUrl }
          });
        }
      }
    }
  } catch (err) {
    console.error("FilesDL parse error:", err?.message || err);
  }
  return streams;
}
var getStream = async function({
  link,
  type,
  signal,
  providerContext,
  isDownload
}) {
  const { axios, cheerio } = providerContext;
  if (!link) return [];
  let cleanLink = link;
  if (cleanLink.includes("filesdl") && cleanLink.includes("/drive/")) {
    cleanLink = cleanLink.replace("/drive/", "/cloud/");
  }
  if (/\.(m3u8|mp4|mkv)(\?|$)/i.test(cleanLink)) {
    const isHls = cleanLink.includes(".m3u8");
    return [
      {
        server: "Direct Stream",
        link: cleanLink,
        type: isHls ? "m3u8" : "mp4",
        quality: extractQuality(cleanLink),
        headers: { "User-Agent": USER_AGENT }
      }
    ];
  }
  if (cleanLink.includes("filesdl") || cleanLink.includes("/cloud/") || cleanLink.includes("/drive/")) {
    return extractFromFilesdl(cleanLink, axios, cheerio, signal);
  }
  if (cleanLink.includes("linkmake.in")) {
    try {
      const res = await axios.get(cleanLink, {
        headers: { "User-Agent": USER_AGENT },
        signal,
        timeout: 1e4
      });
      const html = res.data || "";
      const $ = cheerio.load(html);
      const filesdlUrls = [];
      const seenFurls = /* @__PURE__ */ new Set();
      $(".dlink a, a[href*='filesdl']").each((_, a) => {
        let href = $(a).attr("href");
        if (href && href.startsWith("http")) {
          if (href.includes("/drive/")) href = href.replace("/drive/", "/cloud/");
          if (!seenFurls.has(href)) {
            seenFurls.add(href);
            filesdlUrls.push(href);
          }
        }
      });
      const batchResults = await Promise.all(
        filesdlUrls.slice(0, 10).map(
          (furl) => extractFromFilesdl(furl, axios, cheerio, signal).catch(() => [])
        )
      );
      const allStreams = [];
      const seenLinks = /* @__PURE__ */ new Set();
      for (const list of batchResults) {
        for (const s of list) {
          if (s.link && !seenLinks.has(s.link)) {
            seenLinks.add(s.link);
            allStreams.push(s);
          }
        }
      }
      const qualRank = (q) => {
        if (q === "2160") return 4;
        if (q === "1080") return 3;
        if (q === "720") return 2;
        if (q === "480") return 1;
        return 0;
      };
      allStreams.sort((a, b) => qualRank(b.quality) - qualRank(a.quality));
      if (allStreams.length > 0) return allStreams;
    } catch (e) {
    }
  }
  try {
    const res = await axios.get(cleanLink, {
      headers: { "User-Agent": USER_AGENT },
      signal,
      timeout: 1e4
    });
    const html = res.data || "";
    const $ = cheerio.load(html);
    const btnHref = $(".dlbtn a, a.bg2, a[href*='linkmake'], a[href*='filesdl']").first().attr("href");
    if (btnHref && btnHref.startsWith("http")) {
      return getStream({
        link: btnHref,
        type,
        signal,
        providerContext,
        isDownload
      });
    }
  } catch (e) {
  }
  return [];
};
