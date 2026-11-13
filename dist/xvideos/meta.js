// @vega-provider xvideos
// @vega-version 1.0
"use strict";

var DEFAULT_BASE_URL = "https://www.xvideos.com";

async function getBase(kvStore) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        return custom.trim().replace(/\/+$/, "");
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

  var baseUrl = await getBase(kvStore);
  var url = link.startsWith("http")
    ? link
    : baseUrl + (link.startsWith("/") ? "" : "/") + link;

  try {
    var res = await axios.get(url, {
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl,
      }),
    });

    var html = res.data;
    var $ = cheerio.load(html);

    var playerTitleMatch = html.match(
      /html5player\.setVideoTitle\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    var title =
      (playerTitleMatch ? playerTitleMatch[1] : null) ||
      $("h2.page-title, .page-title, title")
        .first()
        .text()
        .replace(/- XVIDEOS\.COM/i, "")
        .trim() ||
      "Video";

    var playerThumbMatch = html.match(
      /html5player\.setThumbUrl\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    var playerThumb169Match = html.match(
      /html5player\.setThumbUrl169\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    var image =
      (playerThumb169Match ? playerThumb169Match[1] : null) ||
      (playerThumbMatch ? playerThumbMatch[1] : null) ||
      $('meta[property="og:image"]').attr("content") ||
      "";

    var tags = [];
    $(".video-tags a, .tags-list a, .video-metadata a").each(function (_, el) {
      var tagText = $(el).text().trim();
      if (tagText && tags.indexOf(tagText) === -1) {
        tags.push(tagText);
      }
    });

    var duration = $(".duration, .video-duration").first().text().trim();
    var synopsis = tags.length > 0 ? "Tags: " + tags.join(", ") : title;

    return {
      title: title,
      synopsis: synopsis,
      image: image,
      poster: image,
      imdbId: "",
      type: "movie",
      tags: tags.length > 0 ? tags : undefined,
      rating: duration || undefined,
      webUrl: url,
      linkList: [
        {
          title: "Stream Video",
          quality:
            html.indexOf("setVideoUrlHigh") !== -1 ||
            html.indexOf("1080p") !== -1
              ? "1080p"
              : "720p",
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
    console.error("XVideos meta error:", err && err.message ? err.message : err);
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
