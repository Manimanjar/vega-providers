// @vega-provider rule34video
// @vega-version 1.2
"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://rule34video.com";
var memoryCache = { data: null, expiresAt: 0 };

var seenVideoIds = new Set();

var CURATED_TAGS = [
  {
    "title": "1girl",
    "filter": "/tags/1girl/"
  },
  {
    "title": "2D Animation",
    "filter": "/tags/?tag=2d&t=cat"
  },
  {
    "title": "3D Animation",
    "filter": "/tags/?tag=3d&t=cat"
  },
  {
    "title": "4k",
    "filter": "/tags/4k/"
  },
  {
    "title": "Ahegao",
    "filter": "/tags/ahegao/"
  },
  {
    "title": "Akali (league Of Legends)",
    "filter": "/tags/akali-league-of-legends/"
  },
  {
    "title": "Ako Zuri (blue Archive)",
    "filter": "/tags/ako-zuri-blue-archive/"
  },
  {
    "title": "Anal",
    "filter": "/tags/anal/"
  },
  {
    "title": "Animation",
    "filter": "/tags/animation/"
  },
  {
    "title": "Ari (in Heat)",
    "filter": "/tags/ari/"
  },
  {
    "title": "Arin (deadlock)",
    "filter": "/tags/arin-deadlock/"
  },
  {
    "title": "Ashley Succubi",
    "filter": "/tags/ashley-succubi/"
  },
  {
    "title": "Big Black Cock",
    "filter": "/tags/big-black-cock/"
  },
  {
    "title": "Big Breasts",
    "filter": "/tags/big-breasts/"
  },
  {
    "title": "Big Butt",
    "filter": "/tags/large-butt/"
  },
  {
    "title": "Big Penis",
    "filter": "/tags/big-penis/"
  },
  {
    "title": "Big Thighs",
    "filter": "/tags/big-thighs/"
  },
  {
    "title": "Big White Cock",
    "filter": "/tags/big-white-cock/"
  },
  {
    "title": "Blowjob",
    "filter": "/tags/blowjob/"
  },
  {
    "title": "Bouncing Ass",
    "filter": "/tags/bouncing-ass/"
  },
  {
    "title": "Bouncing Breasts",
    "filter": "/tags/bouncing-breasts/"
  },
  {
    "title": "Cecilia Schariac (honkai Star Rail)",
    "filter": "/tags/cecilia-schariac-honkai-star-rail/"
  },
  {
    "title": "Cowgirl Position",
    "filter": "/tags/cowgirl-position/"
  },
  {
    "title": "Creampie",
    "filter": "/tags/creampie/"
  },
  {
    "title": "Cum In Mouth",
    "filter": "/tags/cum-in-mouth/"
  },
  {
    "title": "Cumshot",
    "filter": "/tags/cumshot/"
  },
  {
    "title": "Deepthroat",
    "filter": "/tags/deepthroat/"
  },
  {
    "title": "Doggystyle Position",
    "filter": "/tags/doggystyle-position/"
  },
  {
    "title": "Elves No Radral (original)",
    "filter": "/tags/elves-no-radral-original/"
  },
  {
    "title": "Emilia (rezero)",
    "filter": "/tags/emilia-rezero/"
  },
  {
    "title": "Female",
    "filter": "/tags/female/"
  },
  {
    "title": "Female Moaning",
    "filter": "/tags/female-moaning/"
  },
  {
    "title": "From Behind",
    "filter": "/tags/from-behind/"
  },
  {
    "title": "Furry",
    "filter": "/tags/furry/"
  },
  {
    "title": "Futanari",
    "filter": "/tags/futanari/"
  },
  {
    "title": "Game",
    "filter": "/tags/game/"
  },
  {
    "title": "Gore",
    "filter": "/tags/gore/"
  },
  {
    "title": "Handjob",
    "filter": "/tags/handjob/"
  },
  {
    "title": "Hare (blue Archive)",
    "filter": "/tags/hare-blue-archive/"
  },
  {
    "title": "Konan (naruto)",
    "filter": "/tags/konan-naruto/"
  },
  {
    "title": "Looking At Viewer",
    "filter": "/tags/looking-at-viewer/"
  },
  {
    "title": "Lucky Chloe (tekken)",
    "filter": "/tags/lucky-chloe-tekken/"
  },
  {
    "title": "Male Pov",
    "filter": "/tags/male-pov/"
  },
  {
    "title": "Mandy",
    "filter": "/tags/mandy/"
  },
  {
    "title": "Masturbation",
    "filter": "/tags/masturbation/"
  },
  {
    "title": "Missionary Position",
    "filter": "/tags/missionary-position/"
  },
  {
    "title": "Moaning In Pleasure",
    "filter": "/tags/moaning-in-pleasure/"
  },
  {
    "title": "Music",
    "filter": "/tags/music/"
  },
  {
    "title": "Nekomata Okayu (1st Costume) (hololive)",
    "filter": "/tags/nekomata-okayu-1st-costume-hololive/"
  },
  {
    "title": "No Sound",
    "filter": "/tags/no-sound/"
  },
  {
    "title": "Nude",
    "filter": "/tags/nude/"
  },
  {
    "title": "Oda Nobukatsu (fate)",
    "filter": "/tags/oda-nobukatsu-fate/"
  },
  {
    "title": "Penis In Pussy",
    "filter": "/tags/penis-in-pussy/"
  },
  {
    "title": "Plana (blue Archive)",
    "filter": "/tags/plana-blue-archive/"
  },
  {
    "title": "Pmv",
    "filter": "/tags/pmv/"
  },
  {
    "title": "Pov",
    "filter": "/tags/pov/"
  },
  {
    "title": "Pussy",
    "filter": "/tags/pussy/"
  },
  {
    "title": "Pussy Job",
    "filter": "/tags/pussy-job/"
  },
  {
    "title": "Ripjaws",
    "filter": "/tags/ripjaws/"
  },
  {
    "title": "Sex",
    "filter": "/tags/sex/"
  },
  {
    "title": "Sex Sounds",
    "filter": "/tags/sex-sounds/"
  },
  {
    "title": "Sound",
    "filter": "/tags/sound/"
  },
  {
    "title": "Sovetsky Soyuz (azur Lane)",
    "filter": "/tags/sovetsky-soyuz-azur-lane/"
  },
  {
    "title": "Squirrel Boy",
    "filter": "/tags/squirrel-boy/"
  },
  {
    "title": "Straight",
    "filter": "/tags/straight/"
  },
  {
    "title": "Sunny Starscout (mlp)",
    "filter": "/tags/sunny-starscout-mlp/"
  },
  {
    "title": "Titty Fuck",
    "filter": "/tags/titty-fuck/"
  },
  {
    "title": "Tomoe Gozen (fate)",
    "filter": "/tags/tomoe-gozen-fate/"
  },
  {
    "title": "Typhon (arknights)",
    "filter": "/tags/typhon-arknights/"
  },
  {
    "title": "Vertical Video",
    "filter": "/tags/vertical-video/"
  },
  {
    "title": "Wardrobe Malfunction",
    "filter": "/tags/wardrobe-malfunction/"
  }
];

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

function updateLearnedDomain(res, baseUrl, kvStore) {
  try {
    var finalUrl =
      (res && res.request && (res.request.responseURL || (res.request.res && res.request.res.responseUrl))) ||
      (res && res.config && res.config.url);
    if (finalUrl && typeof finalUrl === "string") {
      var parsed = new URL(finalUrl);
      var origin = parsed.origin;
      if (origin && origin !== baseUrl && kvStore && typeof kvStore.set === "function") {
        kvStore.set("rule34video_learnedDomain", origin);
      }
    }
  } catch (e) {}
}

async function parseTagsCatalogue(options) {
  var url = options.url;
  var baseUrl = options.baseUrl;
  var axios = options.axios;
  var cheerio = options.cheerio;
  var commonHeaders = options.commonHeaders;
  var signal = options.signal;
  var kvStore = options.kvStore;

  var posts = [];
  var seenSlugs = new Set();

  for (var i = 0; i < CURATED_TAGS.length; i++) {
    var item = CURATED_TAGS[i];
    var slugMatch = item.filter.match(/\/tags\/([^/?#]+)/i);
    var slug = slugMatch ? slugMatch[1] : item.title.toLowerCase().replace(/\s+/g, "-");
    seenSlugs.add(slug);
    posts.push({
      title: item.title,
      link: item.filter.startsWith("http") ? item.filter : baseUrl + (item.filter.startsWith("/") ? "" : "/") + item.filter,
      image: baseUrl + "/apple-touch-icon.png",
      cornerTag: "TAG",
    });
  }

  try {
    var res = await axios.get(url, {
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl,
      }),
      signal: signal,
      maxRedirects: 5,
    });
    updateLearnedDomain(res, baseUrl, kvStore);

    var html = res.data;
    var $ = cheerio.load(html);

    $("a[href*=\"/tags/\"], a[href*=\"/categories/\"]").each(function (_, el) {
      var $el = $(el);
      var rawHref = $el.attr("href") || "";
      var tagText = $el.text().trim();
      var img = $el.find("img").attr("src") || "";

      if (!rawHref || rawHref === "/tags/" || rawHref === "/categories/") return;
      if (rawHref.includes("terms") || rawHref.includes("privacy") || rawHref.includes("login") || rawHref.includes("compare")) return;
      if (tagText.length > 40 || tagText.toLowerCase() === "tags" || tagText.toLowerCase() === "compare similar tags") return;

      var slugMatch = rawHref.match(/\/(?:tags|categories)\/([^/?#]+)/i);
      if (!slugMatch) return;
      var slug = slugMatch[1];

      if (seenSlugs.has(slug)) {
        if (img) {
          for (var j = 0; j < posts.length; j++) {
            if (posts[j].link.indexOf(slug) !== -1) {
              posts[j].image = img;
              break;
            }
          }
        }
        return;
      }
      seenSlugs.add(slug);

      if (!tagText) {
        tagText = slug.replace(/-/g, " ");
      }

      var cleanTitle = tagText.split(" ").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
      var fullLink = rawHref.startsWith("http")
        ? rawHref
        : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;

      posts.push({
        title: cleanTitle,
        link: fullLink,
        image: img || (baseUrl + "/apple-touch-icon.png"),
        cornerTag: "TAG",
      });
    });
  } catch (err) {
    console.error("Rule34Video tags live fetch error:", err && err.message ? err.message : err);
  }

  posts.sort(function (a, b) { return a.title.localeCompare(b.title); });
  return posts;
}

async function parseVideoGrid(options) {
  var url = options.url;
  var baseUrl = options.baseUrl;
  var axios = options.axios;
  var cheerio = options.cheerio;
  var commonHeaders = options.commonHeaders;
  var signal = options.signal;
  var kvStore = options.kvStore;

  try {
    var res = await axios.get(url, {
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl,
      }),
      signal: signal,
      maxRedirects: 5,
    });

    updateLearnedDomain(res, baseUrl, kvStore);

    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];

    if (seenVideoIds.size > 3000) {
      seenVideoIds.clear();
    }

    $(".item.thumb, [data-video-card-id]").each(function (_, element) {
      var $el = $(element);
      var linkEl = $el.find("a.th, a[href*=\"/video/\"]").first();
      var rawHref = linkEl.attr("href") || "";
      var rawTitle =
        linkEl.attr("title") ||
        $el.find("img.thumb").attr("alt") ||
        linkEl.text().trim();

      if (!rawTitle || !rawHref) return;

      var idMatch = rawHref.match(/\/video\/([0-9]+)/i);
      var videoId = idMatch ? idMatch[1] : rawHref;

      if (seenVideoIds.has(videoId)) {
        return;
      }
      seenVideoIds.add(videoId);

      var img = $el.find("img.thumb, img").first();
      var image =
        img.attr("data-rd-jpg") ||
        img.attr("data-src") ||
        img.attr("src") ||
        "";

      var duration = $el.find(".time").first().text().trim();
      var isHd = $el.find(".quality").length > 0;
      var cornerTag = isHd ? "HD" : undefined;

      var absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image: image,
        tag: duration || undefined,
        cornerTag: cornerTag,
      });
    });

    return posts;
  } catch (err) {
    console.error("Rule34Video posts error:", err && err.message ? err.message : err);
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

  var baseUrl = await getBase(kvStore, axios);
  var targetUrl = "";

  if (filter === "/tags/" || filter === "/tags") {
    return parseTagsCatalogue({
      url: baseUrl + "/tags/",
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  if (filter === "/?home=1" || filter === "/") {
    if (page === 1) {
      var randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = randomSeed > 1 ? baseUrl + "/" + randomSeed + "/?_t=" + Date.now() : baseUrl + "/?_t=" + Date.now();
    } else {
      targetUrl = baseUrl + "/" + page + "/";
    }
  } else if (filter.startsWith("/search/")) {
    var cleanSearch = filter.replace(/\/+$/, "");
    targetUrl = page > 1 ? baseUrl + cleanSearch + "/" + page + "/" : baseUrl + cleanSearch + "/";
  } else if (filter.startsWith("/tags/")) {
    if (filter.includes("?")) {
      targetUrl = page > 1 ? baseUrl + filter + "&from=" + page : baseUrl + filter;
    } else {
      var cleanTag = filter.replace(/\/+$/, "");
      targetUrl = page > 1 ? baseUrl + cleanTag + "/" + page + "/" : baseUrl + cleanTag + "/";
    }
  } else if (filter.includes("?")) {
    targetUrl = page > 1 ? baseUrl + filter + "&from=" + page : baseUrl + filter;
  } else {
    targetUrl = page > 1 ? baseUrl + filter + page + "/" : baseUrl + filter;
  }

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
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

  var baseUrl = await getBase(kvStore, axios);
  var cleanQuery = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-"));
  var targetUrl = page > 1 ? baseUrl + "/search/" + cleanQuery + "/" + page + "/" : baseUrl + "/search/" + cleanQuery + "/";

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
  });
};

exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
