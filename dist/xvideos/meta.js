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
    const quality = html.includes("setVideoUrlHigh") || html.includes("1080p") ? "1080p" : "720p";
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
    return {
      title,
      synopsis,
      image,
      poster: image,
      imdbId: "",
      type: "movie",
      tags: tags.length > 0 ? tags : void 0,
      cast: cast.length > 0 ? cast : void 0,
      rating: duration || void 0,
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
