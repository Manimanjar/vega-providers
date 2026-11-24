import { Post, ProviderContext } from "../types";
import config from "../categories.config.json";
import {
  is3DOn,
  ensure3DPool,
  warm3DInBackground,
  getBucketPosts,
  intersectWithPool,
  poolTitleSearch,
  poolCategorySearch,
  searchTermsFor,
  titleMatchesAnyKeyword,
  classifyRelation,
  dedupePosts,
  keepLongEnough,
  getPooledCategoryPage,
  getPooledSearchPage,
  THREE_D_KEYWORD_STRINGS,
} from "../threeD";
import { groupSeriesPosts } from "../series";

"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.xvideos.com";
var memoryCache = { data: null, expiresAt: 0 };
// Persistent base-URL cache key (kvStore survives sandbox re-evaluation;
// module-level memoryCache does not, so without this every category
// fetch paid a ~350ms urls.json round-trip before it even started).
var BASE_CACHE_KEY = "xvideos_baseUrlCacheV1";

function formatDuration(totalSeconds) {
  var s = Math.max(0, Math.floor(totalSeconds || 0));
  if (!s) return "";
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  var mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" + mm : mm) + ":" + String(sec).padStart(2, "0");
}
// NOTE: no module-global seen-video set. Dedup is per-page inside
// parseVideoGrid. A global set made every refresh / category switch
// return 0 posts once a video had been seen once (black screen).

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
    var cachedEntry = memoryCache.data["xvideos"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  // Persistent cache: Vega re-evaluates the module per invoke, so the
  // in-memory cache above is usually empty. kvStore is local and fast.
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        var cached =
          typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > Date.now()) {
          return String(cached.url).replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 2500 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        var entry = res.data["xvideos"];
        if (entry && entry.url) {
          var cleanEntry = entry.url.replace(/\/+$/, "");
          if (kvStore && typeof kvStore.set === "function") {
            try {
              await kvStore.set(
                BASE_CACHE_KEY,
                JSON.stringify({ url: cleanEntry, expiresAt: now + 3600000 })
              );
            } catch (e) {}
          }
          return cleanEntry;
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      var learned = await kvStore.get("xvideos_learnedDomain");
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
        kvStore.set("xvideos_learnedDomain", origin);
      }
    }
  } catch (e) {}
}

// Natural, case-insensitive title comparison ("Part 2" before "Part 10").
// Implemented by hand so it behaves the same in every JS engine Vega's
// sandbox may use, without relying on localeCompare options.
function compareTitle(a, b) {
  var ax = String(a).toLowerCase().split(/(\d+)/);
  var bx = String(b).toLowerCase().split(/(\d+)/);
  for (var i = 0; i < Math.max(ax.length, bx.length); i++) {
    if (ax[i] === undefined) return -1;
    if (bx[i] === undefined) return 1;
    if (ax[i] === bx[i]) continue;
    var an = Number(ax[i]);
    var bn = Number(bx[i]);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    return ax[i] < bx[i] ? -1 : 1;
  }
  return 0;
}

function interleavePosts(groups) {
  var result = [];
  var maxLength = groups.reduce(function (max, group) {
    return Math.max(max, group.length);
  }, 0);

  for (var i = 0; i < maxLength; i++) {
    for (var g = 0; g < groups.length; g++) {
      if (groups[g][i]) {
        result.push(groups[g][i]);
      }
    }
  }

  var seen = new Set();
  return result.filter(function (post) {
    if (!post || !post.link) {
      return false;
    }
    if (seen.has(post.link)) {
      return false;
    }
    seen.add(post.link);
    return true;
  });
}

async function parseVideoGrid(options) {
  var url = options.url;
  var baseUrl = options.baseUrl;
  var axios = options.axios;
  var cheerio = options.cheerio;
  var commonHeaders = options.commonHeaders;
  var signal = options.signal;
  var kvStore = options.kvStore;

  var candidateBases = [baseUrl, "https://www.xvideos.com", "https://www.xvideos3.com", "https://www.xvideos2.com"];
  var seenBases = {};
  var uniqueBases = [];
  for (var b = 0; b < candidateBases.length; b++) {
    var cb = String(candidateBases[b] || "").replace(/\/+$/, "");
    if (cb && !seenBases[cb]) {
      seenBases[cb] = true;
      uniqueBases.push(cb);
    }
  }

  try {
    var res = null;
    var lastErr = null;
    var activeBase = baseUrl;
    for (var bi = 0; bi < uniqueBases.length; bi++) {
      var currentBase = uniqueBases[bi];
      var targetUrl = url;
      try {
        var parsedTarget = new URL(url);
        targetUrl = currentBase + parsedTarget.pathname + parsedTarget.search;
      } catch (e) {}

      for (var attempt = 0; attempt < 2; attempt++) {
        try {
          res = await axios.get(targetUrl, {
            timeout: 10000,
            headers: Object.assign({}, commonHeaders, {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Referer: currentBase + "/",
              Origin: currentBase,
              Accept: "*/*",
            }),
            signal: signal,
            maxRedirects: 5,
          });
          activeBase = currentBase;
          break;
        } catch (e) {
          lastErr = e;
          var status = e && e.response && e.response.status;
          var code = e && e.code;
          if ((status === 429 || code === "ECONNRESET" || code === "ETIMEDOUT") && attempt === 0) {
            await new Promise(function (resolve) {
              setTimeout(resolve, status === 429 ? 1200 : 250);
            });
            continue;
          }
          break;
        }
      }
      if (res && res.status === 200) break;
    }
    if (!res) throw lastErr || new Error("no response from any mirror");

    updateLearnedDomain(res, activeBase, kvStore);

    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];
    var seenVideoIds = new Set();

    $(".thumb-block").each(function (_, element) {
      var $el = $(element);
      var titleLink = $el.find("p.title a, .thumb-under p.title a, .title a").first();
      var rawTitle = titleLink.attr("title") || "";
      if (!rawTitle) {
        var cloned = titleLink.clone();
        cloned.find("span").remove();
        rawTitle = cloned.text().trim();
      }

      var rawHref =
        titleLink.attr("href") ||
        $el.find(".thumb-inside a").first().attr("href") ||
        $el.find("a").first().attr("href") ||
        "";

      if (!rawHref) return;

      if (!rawTitle || /^(?:1080p?|720p?|480p?|4k|hd|cc|sd)(?:\s*(?:cc|hd))*$/i.test(rawTitle.trim())) {
        var parts = rawHref.split("/").filter(Boolean);
        var slug = parts[parts.length - 1] || "";
        rawTitle = decodeURIComponent(slug.replace(/[_-]+/g, " "));
      }

      var idMatch = rawHref.match(/\/video(?:\.([a-zA-Z0-9_-]+)|\/([0-9]+))/i);
      var videoId = idMatch ? (idMatch[1] || idMatch[2]) : rawHref;

      if (seenVideoIds.has(videoId)) {
        return;
      }
      seenVideoIds.add(videoId);

      var img = $el.find("img").first();
      var rawSrcset = (img.attr("data-srcset") || "").split(",")[0].trim().split(/\s+/)[0];
      var image =
        img.attr("data-src") ||
        rawSrcset ||
        img.attr("src") ||
        "";

      var duration = $el.find(".duration, .video-duration").first().text().trim();
      var durationSec = 0;
      if (duration) {
        var minMatch = duration.match(/(\d+)\s*min/i);
        var secMatch = duration.match(/(\d+)\s*sec/i);
        var hourMatch = duration.match(/(\d+)\s*h/i);
        if (hourMatch) durationSec += parseInt(hourMatch[1], 10) * 3600;
        if (minMatch) durationSec += parseInt(minMatch[1], 10) * 60;
        if (secMatch) durationSec += parseInt(secMatch[1], 10);
      }
      var hdTag = $el.find(".video-hd-mark").first().text().trim();
      // Vega's card shows only ONE badge (cornerTag wins over tag), so
      // the duration was invisible whenever a quality tag existed.
      // Combine them: "14:00 • 1080P" keeps both in the one badge.
      var durationText = formatDuration(durationSec) || duration || undefined;
      var cornerTag = durationText
        ? hdTag
          ? durationText + " • " + hdTag
          : durationText
        : hdTag || undefined;

      var absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : activeBase + (rawHref.startsWith("/") ? "" : "/") + rawHref;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image: image,
        tag: durationText,
        _dur: durationSec,
        cornerTag: cornerTag,
      });
    });

    // Alphabetical by title, so parts of the same clip sit together
    // instead of roaming through the pool (was: longest first).
    posts.sort(function (a, b) {
      return compareTitle(a.title || "", b.title || "");
    });
    return posts;
  } catch (err) {
    console.error("XVideos posts error:", err && err.message ? err.message : err);
    return [];
  }
}

function getCategory(filter) {
  return config.categories.find(function (category) {
    return category.filter === filter;
  });
}

// 3D-only mode: the sweep searches each 3D keyword on XVideos
// (/?k=<keyword>) and the shared engine buckets the results into the
// 10 categories. See providers/threeD.ts for the full design.
function build3DContext(opts) {
  return {
    kvStore: opts.kvStore,
    fetchGrid: function (keyword) {
      var targetUrl = opts.baseUrl + "/?k=" + encodeURIComponent(keyword) + "&p=0";
      return parseVideoGrid({
        url: targetUrl,
        baseUrl: opts.baseUrl,
        axios: opts.axios,
        cheerio: opts.cheerio,
        commonHeaders: opts.commonHeaders,
        signal: opts.signal,
        kvStore: opts.kvStore,
      });
    },
    // Phase 2 of the sweep: "<term> 3d" + "<term> sfm" for MULTIPLE
    // terms per category (user, 2026-11-18): the plain word, the
    // step- form, then the cousin form — e.g. Sister searches
    // "sister", "stepsister" and "cousin". One term alone misses
    // videos the others find. XVideos keyword search is full-text
    // AND, so these results are trustworthy directly — the site
    // matched both the category and 3D. The grids are fetched
    // SEQUENTIALLY with an 800ms gap: XVideos answers 429 when
    // searches are hammered (3 x 429 in the first multi-term run),
    // and the sweep already runs 5 categories at once.
    fetchCategory3D: async function (filter, pool) {
      var terms = searchTermsFor(filter, "xvideos", 3);
      if (terms.length === 0) return [];
      // Per-term results, then INTERLEAVED round-robin: if the
      // terms were concatenated, the first term's videos would fill
      // page 1 and the cousin term's videos would sit on page 2+
      // (buried). Interleaving puts a cousin video on page 1 too.
      var perTerm = [];
      for (var ti = 0; ti < terms.length; ti++) {
        var termResults = [];
        for (var ki = 0; ki < 2; ki++) {
          var kw = ki === 0 ? "3d" : "sfm";
          var targetUrl =
            opts.baseUrl + "/?k=" + encodeURIComponent(terms[ti] + " " + kw) + "&p=0";
          try {
            var grid = await parseVideoGrid({
              url: targetUrl,
              baseUrl: opts.baseUrl,
              axios: opts.axios,
              cheerio: opts.cheerio,
              commonHeaders: opts.commonHeaders,
              signal: opts.signal,
              kvStore: opts.kvStore,
            });
            (grid || []).forEach(function (p) {
              termResults.push(p);
            });
          } catch (e) {
            // One failed term never fails the category.
          }
          if (ti < terms.length - 1 || ki === 0) {
            await new Promise(function (resolve) {
              setTimeout(resolve, 800);
            });
          }
        }
        perTerm.push(termResults);
      }
      var out = [];
      var maxLen = 0;
      for (var t = 0; t < perTerm.length; t++) maxLen = Math.max(maxLen, perTerm[t].length);
      for (var i = 0; i < maxLen; i++) {
        for (var t2 = 0; t2 < perTerm.length; t2++) {
          if (perTerm[t2][i]) out.push(perTerm[t2][i]);
        }
      }
      return out;
    },
    // Phase 2b of the sweep: the relation pool. Most relation videos
    // carry an incest or family tag, so search "taboo 3d" /
    // "taboo sfm" / "stepfamily 3d" / "family 3d" / "cousin 3d" /
    // "cousin sfm" and classify each hit by its relation words
    // (title only — XV cards carry no tags). XVideos search is
    // full-text AND, so a hit here is incest, family or cousin
    // content by the site's own index; a hit with no specific
    // relation word in the title belongs to Incest. The cousin
    // searches are here too (user, 2026-11-18): a "cousin sis"
    // search can surface a "cousin brother" video, and the classify
    // step below picks it up into Brother — nothing found is
    // dropped just because it was found by another category's
    // search. Returns { filter: [posts] }.
    fetchRelationPool: async function (pool) {
      // NOTE (2026-11-18): XVideos returns HTTP 404 for ANY search
      // containing the word "incest" — including "incest 3d" and the
      // /tags/incest page — while "taboo", "stepfamily", "stepmom"
      // and "stepsister" all return 200 with the same content.
      // So the incest legs use the site's own synonyms (taboo,
      // stepfamily) instead of the blocked word. The classify step
      // still matches "incest" in titles (that is matching, not
      // searching, so the block does not apply).
      var queries = ["taboo 3d", "taboo sfm", "stepfamily 3d", "stepfamily sfm", "family 3d", "family sfm", "cousin 3d", "cousin sfm"];
      // Sequential with an 800ms gap (same 429 reason as Phase 2).
      var groups = [];
      for (var qi = 0; qi < queries.length; qi++) {
        var targetUrl = opts.baseUrl + "/?k=" + encodeURIComponent(queries[qi]) + "&p=0";
        try {
          var g = await parseVideoGrid({
            url: targetUrl,
            baseUrl: opts.baseUrl,
            axios: opts.axios,
            cheerio: opts.cheerio,
            commonHeaders: opts.commonHeaders,
            signal: opts.signal,
            kvStore: opts.kvStore,
          });
          groups.push(g || []);
        } catch (e) {
          groups.push([]);
        }
        if (qi < queries.length - 1) {
          await new Promise(function (resolve) {
            setTimeout(resolve, 800);
          });
        }
      }
      var out = {};
      groups.forEach(function (g) {
        (g || []).forEach(function (p) {
          if (!p || !p.link) return;
          // Widened: keep a hit whose title names 3D OR names a
          // relation. The AND search already matched "3d" somewhere
          // in the site's index (title/tags/description), so a
          // title with a relation word but no 3D word is still a
          // 3D relation video — dropping it would hide content.
          if (!titleMatchesAnyKeyword(p.title) && classifyRelation(p.title, "").length === 0) return;
          var filters = classifyRelation(p.title, "");
          if (filters.length === 0) filters = ["incest"];
          filters.forEach(function (f) {
            if (!out[f]) out[f] = [];
            out[f].push(p);
          });
        });
      });
      return out;
    },
  };
}

async function get3DPostsForFilter(ctx, filter, page) {
  var baseUrl = ctx.baseUrl;
  var axios = ctx.axios;
  var cheerio = ctx.cheerio;
  var commonHeaders = ctx.commonHeaders;
  var signal = ctx.signal;
  var kvStore = ctx.kvStore;

  if (filter === "homepage" || !filter) {
    return getPooledSearchPage({
      kvStore: kvStore,
      query: "xvideos_3d_home",
      page: page,
      terms: THREE_D_KEYWORD_STRINGS,
      fetchTermPage: function (term, sp) {
        var pageIndex = Math.max(0, sp - 1);
        var targetUrl =
          baseUrl + "/?k=" + encodeURIComponent(term) + "&sort=length&p=" + pageIndex;
        return parseVideoGrid({
          url: targetUrl,
          baseUrl: baseUrl,
          axios: axios,
          cheerio: cheerio,
          commonHeaders: commonHeaders,
          signal: signal,
          kvStore: kvStore,
        });
      },
    });
  }

  var category = getCategory(filter);
  var queries = category && category.xvideosQueries ? category.xvideosQueries : [];
  if (queries.length === 0) {
    queries = [filter.replace(/^rel_/, "")];
  }

  var catTerms = [];
  for (var qi = 0; qi < queries.length; qi++) {
    var rawQ = String(queries[qi]).replace(/\+/g, " ").trim();
    if (rawQ) {
      catTerms.push(rawQ + " 3d");
      catTerms.push(rawQ + " animation");
    }
  }

  return getPooledSearchPage({
    kvStore: kvStore,
    query: "xvideos_3d_cat_" + filter,
    page: page,
    terms: catTerms,
    fetchTermPage: function (term, sp) {
      var pageIndex = Math.max(0, sp - 1);
      var targetUrl =
        baseUrl + "/?k=" + encodeURIComponent(term) + "&sort=length&p=" + pageIndex;
      return parseVideoGrid({
        url: targetUrl,
        baseUrl: baseUrl,
        axios: axios,
        cheerio: cheerio,
        commonHeaders: commonHeaders,
        signal: signal,
        kvStore: kvStore,
      });
    },
  });
}

const getPostsImpl = async function (params) {
  var filter = params.filter;
  var page = params.page;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  var category = getCategory(filter);

  // 3D-only mode: fast native 3D category routing
  var threeDContext = {
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
  };
  if (await is3DOn(kvStore)) {
    var threeDPosts = await get3DPostsForFilter(threeDContext, filter, page);
    if (threeDPosts && threeDPosts.length > 0) return threeDPosts;
  }

  if (category && category.mode === "keep_existing") {
    var pNum = page > 1 ? page - 1 : 0;
    var fUrl =
      pNum > 0
        ? baseUrl + "/?k=family&sort=length&p=" + pNum
        : baseUrl + "/?k=family&sort=length";
    return parseVideoGrid({
      url: fUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  if (category && category.mode === "random_feed") {
    // General homepage sequential feed: page 1 = /, page 2 = /new/1/, page 3 = /new/2/ ...
    var targetUrl = page <= 1 ? baseUrl + "/" : baseUrl + "/new/" + (page - 1) + "/";
    return parseVideoGrid({
      url: targetUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  if (category && category.mode === "multi_query") {
    var queries = Array.isArray(category.xvideosQueries) ? category.xvideosQueries : [];
    if (queries.length === 0) {
      return [];
    }

    // Maximum content, nothing skipped (user, 2026-11-18): the old code
    // fetched page N of every term, merged ~450 videos, and returned
    // only the first 60 — the rest of that term-page never appeared on
    // any app page. getPooledCategoryPage keeps the FULL merged pool
    // for a term-page in kvStore and serves it in 60-video slices
    // across consecutive app pages, so every video is eventually
    // shown. fetchTermPage(tp) builds the pool for term-page tp.
    var fetchTermPage = async function (tp) {
      var pageIndex = Math.max(0, tp - 1);
      var termResults = [];
      for (var b = 0; b < queries.length; b += 4) {
        var batch = queries.slice(b, b + 4);
        var batchRes = await Promise.all(
          batch.map(function (query) {
            var targetUrl =
              baseUrl +
              "/?k=" +
              encodeURIComponent(String(query).replace(/\+/g, " ")) +
              "&p=" +
              pageIndex;
            return parseVideoGrid({
              url: targetUrl,
              baseUrl: baseUrl,
              axios: axios,
              cheerio: cheerio,
              commonHeaders: commonHeaders,
              signal: signal,
              kvStore: kvStore,
            });
          })
        );
        for (var bi = 0; bi < batchRes.length; bi++) termResults.push(batchRes[bi]);
        if (b + 4 < queries.length) {
          await new Promise(function (r) {
            setTimeout(r, 120);
          });
        }
      }
      // Sort the merged list alphabetically (interleaving alone would
      // scatter parts of the same clip again). No cap here — the pool
      // cache slices it into 60-video app pages.
      var merged = interleavePosts(termResults);
      merged.sort(function (a, b) {
        return compareTitle(a.title || "", b.title || "");
      });
      return merged;
    };
    return getPooledCategoryPage({
      kvStore: kvStore,
      filter: filter,
      page: page,
      fetchTermPage: fetchTermPage,
    });
  }

  if (filter === "/family/" || filter === "/family") {
    var pNum = page > 1 ? page - 1 : 0;
    var fUrl =
      pNum > 0
        ? baseUrl + "/?k=family&sort=length&p=" + pNum
        : baseUrl + "/?k=family&sort=length";
    return parseVideoGrid({
      url: fUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  // Fallback for old / cached filters ("/", "/?home=1", "4K", "Trending",
  // "/c/...", "/tags/..."). targetUrl MUST be declared: in ESM strict
  // mode assigning to an undeclared variable throws ReferenceError and
  // getPosts rejects, so the provider showed a black screen.
  var targetUrl;
  if (filter === "/?home=1" || filter === "/") {
    if (page === 1) {
      var randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = baseUrl + "/new/" + randomSeed + "/?_t=" + Date.now();
    } else {
      var pageIndex = Math.max(0, page - 1);
      targetUrl = baseUrl + "/new/" + (pageIndex + 1) + "/";
    }
  } else if (filter.startsWith("/c/")) {
    var cleanFilter = filter.replace(/\/+$/, "");
    if (page === 1) {
      targetUrl = baseUrl + cleanFilter + "/";
    } else {
      targetUrl = baseUrl + cleanFilter + "/" + (page - 1) + "/";
    }
  } else if (filter.includes("?")) {
    var pageIndex = Math.max(0, page - 1);
    targetUrl = baseUrl + filter + "&p=" + pageIndex;
  } else {
    var pageIndex = Math.max(0, page - 1);
    targetUrl = pageIndex > 0 ? baseUrl + filter + pageIndex + "/" : baseUrl + filter;
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

// Parts grouping is applied here, once, to every list this provider
// returns (normal feed, 3D buckets, search) — parts of one video
// become one card (first part's thumbnail and title, badge "N parts")
// and the rest are reachable from its detail. See providers/series.ts.
export const getPosts = async function (params) {
  var posts = await getPostsImpl(params);
  return groupSeriesPosts(posts || []);
};

const getSearchPostsImpl = async function (params) {
  var searchQuery = params.searchQuery;
  var page = params.page;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  // Normalized query is the pool's key: same search = same pool, so
  // scrolling reuses the cached results instead of re-fetching.
  var normQuery = (searchQuery || "").trim().toLowerCase().replace(/\s+/g, " ");

  var threeDOn = await is3DOn(kvStore);

  if (threeDOn) {
    var terms = THREE_D_KEYWORD_STRINGS.map(function (kw) {
      return normQuery + " " + kw;
    });
    return getPooledSearchPage({
      kvStore: kvStore,
      query: "3d:" + normQuery,
      page: page,
      terms: terms,
      fetchTermPage: function (term, sp) {
        var pageIndex = Math.max(0, sp - 1);
        var targetUrl =
          baseUrl + "/?k=" + encodeURIComponent(term) + "&sort=length&p=" + pageIndex;
        return parseVideoGrid({
          url: targetUrl,
          baseUrl: baseUrl,
          axios: axios,
          cheerio: cheerio,
          commonHeaders: commonHeaders,
          signal: signal,
          kvStore: kvStore,
        });
      },
    });
  }

  // General content: sequential site search from page 1 till last page
  var fetchSitePage = function (sp) {
    var pageIndex = Math.max(0, sp - 1);
    var targetUrl =
      baseUrl + "/?k=" + encodeURIComponent(searchQuery.trim()) + "&sort=length&p=" + pageIndex;
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

  return getPooledSearchPage({
    kvStore: kvStore,
    query: normQuery,
    page: page,
    fetchSitePage: fetchSitePage,
  });
};

// Parts grouping, same as getPosts above.
export const getSearchPosts = async function (params) {
  var posts = await getSearchPostsImpl(params);
  return groupSeriesPosts(posts || []);
};
