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
      const firstImage = $(".item.thumb img").first().attr("src") || `${baseUrl}/apple-touch-icon.png`;
      return {
        title: tagTitle,
        synopsis: "",
        image: firstImage,
        poster: firstImage,
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
    const image = $("meta[property='og:image']").attr("content") || $(".wrap_image img").first().attr("src") || "";
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
