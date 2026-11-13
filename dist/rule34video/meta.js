// @vega-provider rule34video
// @vega-version 1.4
"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://rule34video.com";
var memoryCache = { data: null, expiresAt: 0 };

async function getBase(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        var cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {}
  }

  var now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    var cachedEntry = memoryCache.data["rule34video"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 4000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        var entry = res.data["rule34video"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      var learned = await kvStore.get("rule34video_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

var getMeta = async function (params) {
  var link = params.link;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  var url = link.startsWith("http")
    ? link
    : baseUrl + (link.startsWith("/") ? "" : "/") + link;

  try {
    var res = await axios.get(url, {
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl + "/",
      }),
      maxRedirects: 5,
    });

    var html = res.data;
    var $ = cheerio.load(html);

    if (url.includes("/tags/") || url.includes("/categories/")) {
      var directLinks = [];
      $(".item.thumb, [data-video-card-id]").each(function (_, element) {
        var $el = $(element);
        var linkEl = $el.find("a.th, a[href*='/video/']").first();
        var rawHref = linkEl.attr("href") || "";
        var rawTitle =
          linkEl.attr("title") ||
          $el.find("img.thumb").attr("alt") ||
          linkEl.text().trim();

        if (rawHref && rawTitle) {
          var abs = rawHref.startsWith("http")
            ? rawHref
            : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;
          directLinks.push({
            title: rawTitle,
            link: abs,
            type: "movie",
          });
        }
      });

      var tagTitle =
        $("h1").first().text().trim() ||
        $("title").text().replace(/- Rule34Video/i, "").trim() ||
        "Tag Playlist";

      var firstImage =
        $(".item.thumb img").first().attr("src") ||
        (baseUrl + "/apple-touch-icon.png");

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
            directLinks: directLinks.length > 0 ? directLinks : [{ title: tagTitle, link: url, type: "movie" }],
          },
        ],
      };
    }

    var title =
      $("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      $("title").text().replace(/- Rule34Video/i, "").trim() ||
      "Video";

    var image =
      $("meta[property='og:image']").attr("content") ||
      $(".wrap_image img").first().attr("src") ||
      "";

    var is4k = html.includes("2160p") || html.includes("4k") || html.includes("_4k");
    var is1080p = html.includes("1080p");
    var quality = is4k ? "2160p" : (is1080p ? "1080p" : "720p");

    return {
      title: title,
      synopsis: "",
      image: image,
      poster: image,
      imdbId: "",
      type: "movie",
      rating: quality,
      webUrl: url,
      linkList: [
        {
          title: "Stream Video",
          quality: quality,
          directLinks: [
            {
              title: title,
              link: url,
              type: "movie",
            },
          ],
        },
      ],
    };
  } catch (err) {
    console.error("Rule34Video meta error:", err && err.message ? err.message : err);
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
              type: "movie",
            },
          ],
        },
      ],
    };
  }
};

exports.getMeta = getMeta;
