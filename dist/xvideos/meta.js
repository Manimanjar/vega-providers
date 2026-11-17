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
var getMeta = async function({
  link,
  providerContext
}) {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  let baseUrl = "https://www.xvideos.com";
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        baseUrl = custom.trim().replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  const url = link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
  try {
    const res = await axios.get(url, {
      headers: {
        ...commonHeaders,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl
      }
    });
    const html = res.data;
    const $ = cheerio.load(html);
    const playerTitleMatch = html.match(/html5player\.setVideoTitle\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    const title = (playerTitleMatch ? playerTitleMatch[1] : null) || $("h2.page-title, .page-title, title").first().text().replace(/- XVIDEOS\.COM/i, "").trim() || "Video";
    const playerThumbMatch = html.match(/html5player\.setThumbUrl\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    const playerThumb169Match = html.match(/html5player\.setThumbUrl169\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    const image = (playerThumb169Match ? playerThumb169Match[1] : null) || (playerThumbMatch ? playerThumbMatch[1] : null) || $('meta[property="og:image"]').attr("content") || "";
    const tags = [];
    $(".video-tags a, .tags-list a, .video-metadata a").each((_, el) => {
      const tagText = $(el).text().trim();
      if (tagText && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });
    const duration = $(".duration, .video-duration").first().text().trim();
    const synopsis = tags.length > 0 ? `Tags: ${tags.join(", ")}` : title;
    return {
      title,
      synopsis,
      image,
      poster: image,
      imdbId: "",
      type: "movie",
      tags: tags.length > 0 ? tags : void 0,
      rating: duration || void 0,
      webUrl: url,
      linkList: [
        {
          title: "Stream Video",
          quality: html.includes("setVideoUrlHigh") || html.includes("1080p") ? "1080p" : "720p",
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
    console.error("XVideos meta error:", err?.message || err);
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
