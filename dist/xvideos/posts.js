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

async function parseVideoGrid(options) {
  var url = options.url;
  var baseUrl = options.baseUrl;
  var axios = options.axios;
  var cheerio = options.cheerio;
  var commonHeaders = options.commonHeaders;
  var signal = options.signal;

  try {
    var res = await axios.get(url, {
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl,
      }),
      signal: signal,
    });

    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];

    $(".thumb-block").each(function (_, element) {
      var $el = $(element);
      var titleLink = $el.find(".title a, .thumb-inside a").first();
      var rawTitle =
        titleLink.attr("title") ||
        titleLink.text().trim() ||
        $el.find(".title").text().trim();
      var rawHref =
        titleLink.attr("href") || $el.find("a").first().attr("href") || "";

      if (!rawTitle || !rawHref) return;

      var img = $el.find("img").first();
      var image =
        img.attr("data-src") ||
        img.attr("data-srcset") ||
        img.attr("src") ||
        "";

      var duration = $el.find(".duration, .video-duration").first().text().trim();
      var hdTag = $el.find(".video-hd-mark").first().text().trim();

      var absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image: image,
        tag: duration || undefined,
        cornerTag: hdTag || undefined,
      });
    });

    return posts;
  } catch (err) {
    console.error("XVideos posts error:", err && err.message ? err.message : err);
    return [];
  }
}

var getPosts = async function (params) {
  var filter = params.filter;
  var page = params.page;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore);
  var pageIndex = Math.max(0, page - 1);
  var targetUrl = baseUrl + filter;

  if (targetUrl.includes("?")) {
    targetUrl += "&p=" + pageIndex;
  } else {
    if (pageIndex > 0) {
      targetUrl = targetUrl.endsWith("/")
        ? targetUrl + pageIndex
        : targetUrl + "/" + pageIndex;
    }
  }

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
  });
};

var getSearchPosts = async function (params) {
  var searchQuery = params.searchQuery;
  var page = params.page;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore);
  var pageIndex = Math.max(0, page - 1);
  var targetUrl = baseUrl + "/?k=" + encodeURIComponent(searchQuery) + "&p=" + pageIndex;

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
  });
};

exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
