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

// providers/filmyfly/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function extractQuality(str) {
  if (/2160p|4k/i.test(str)) return "2160";
  if (/1080p/i.test(str)) return "1080";
  if (/720p/i.test(str)) return "720";
  if (/480p/i.test(str)) return "480";
  return "auto";
}
async function extractFromFilesdl(filesdlUrl, axios, cheerio, signal) {
  const streams = [];
  const seen = /* @__PURE__ */ new Set();
  try {
    const res = await axios.get(filesdlUrl, {
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
    $("a[href*='.r2.dev'], a.download-link, a.button2").each((_, el) => {
      let href = $(el).attr("href");
      if (!href || seen.has(href)) return;
      if (!href.startsWith("http")) return;
      if (href.includes("t.me") || href.includes("telegram")) return;
      if (href.includes(".r2.dev") && !href.includes("&token=")) {
        const randToken = Math.floor(1e9 + Math.random() * 9e9);
        href = `${href}&token=${randToken}`;
      }
      seen.add(href);
      const text = $(el).text().trim() || "Cloud Direct";
      const q = extractQuality(text) !== "auto" ? extractQuality(text) : defaultQuality;
      streams.push({
        server: `Cloud Direct (High Speed) [${q}p]`,
        link: href,
        type: "mp4",
        quality: q,
        headers: {
          "User-Agent": USER_AGENT,
          Referer: filesdlUrl
        }
      });
    });
    $("a[href*='zdownload.php'], a.button").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href)) return;
      if (!href.startsWith("http")) return;
      seen.add(href);
      const text = $(el).text().trim() || "Direct Download";
      const q = extractQuality(text) !== "auto" ? extractQuality(text) : defaultQuality;
      streams.push({
        server: `Direct Download 10Gbps [${q}p]`,
        link: href,
        type: "mp4",
        quality: q,
        headers: {
          "User-Agent": USER_AGENT,
          Referer: filesdlUrl
        }
      });
    });
    $("a[href*='pixeldrain'], a[href*='iwebp.store/u/']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "Pixeldrain Fast Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT }
      });
    });
    $("a[href*='hubcloud']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "HubCloud Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT }
      });
    });
    $("a[href*='gofile.io']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "GoFile Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT }
      });
    });
    $("a[href*='fuckingfast.net'], a[href*='buzzheavier']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "Buzzheavier Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT }
      });
    });
    $("a[href*='gdflix']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "GDFlix Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT }
      });
    });
    $("a[href*='drivenext']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "Drivenext Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT }
      });
    });
    if (streams.length === 0) {
      const mediaRe = /https?:\/\/[^"'\s<>]+\.(?:mp4|mkv|m3u8)[^"'\s<>]*/gi;
      let m;
      while ((m = mediaRe.exec(html)) !== null) {
        const u = m[0];
        if (!seen.has(u)) {
          seen.add(u);
          const isHls = u.includes(".m3u8");
          streams.push({
            server: isHls ? "Direct HLS Stream" : "Direct Video Stream",
            link: u,
            type: isHls ? "m3u8" : "mp4",
            quality: defaultQuality,
            headers: { "User-Agent": USER_AGENT, Referer: filesdlUrl }
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
  if (/\.(m3u8|mp4|mkv)(\?|$)/i.test(link)) {
    const isHls = link.includes(".m3u8");
    return [
      {
        server: "Direct Stream",
        link,
        type: isHls ? "m3u8" : "mp4",
        quality: extractQuality(link),
        headers: { "User-Agent": USER_AGENT }
      }
    ];
  }
  if (link.includes("filesdl.in") || link.includes("/cloud/") || link.includes("/drive/")) {
    return extractFromFilesdl(link, axios, cheerio, signal);
  }
  if (link.includes("linkmake.in")) {
    try {
      const res = await axios.get(link, {
        headers: { "User-Agent": USER_AGENT },
        signal,
        timeout: 1e4
      });
      const html = res.data || "";
      const $ = cheerio.load(html);
      const filesdlUrls = [];
      $(".dlink a, a[href*='filesdl']").each((_, a) => {
        const href = $(a).attr("href");
        if (href && href.startsWith("http")) filesdlUrls.push(href);
      });
      const allStreams = [];
      for (const furl of filesdlUrls.slice(0, 3)) {
        const s = await extractFromFilesdl(furl, axios, cheerio, signal);
        allStreams.push(...s);
      }
      if (allStreams.length > 0) return allStreams;
    } catch (e) {
    }
  }
  try {
    const res = await axios.get(link, {
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
