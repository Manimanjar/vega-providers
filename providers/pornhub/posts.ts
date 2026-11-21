import { Post, ProviderContext } from "../types";
import config from "../categories.config.json";
import {
  is3DOn,
  read3DCache,
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
} from "../threeD";
import { groupSeriesPosts } from "../series";

"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.pornhub.com";
var API_BASE_URL = "https://www.pornhub.com/webmasters";
var memoryCache = { data: null, expiresAt: 0 };
// Persistent base-URL cache key (kvStore survives sandbox re-evaluation;
// module-level memoryCache does not, so without this every category
// fetch paid a ~350ms urls.json round-trip before it even started).
var BASE_CACHE_KEY = "pornhub_baseUrlCacheV1";

function formatDuration(totalSeconds) {
  var s = Math.max(0, Math.floor(totalSeconds || 0));
  if (!s) return "";
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  var mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" + mm : mm) + ":" + String(sec).padStart(2, "0");
}

// "17:16" / "1:02:33" -> seconds. The Webmasters API returns duration
// as an H:MM:SS string.
function parseApiDuration(text) {
  var parts = String(text || "").split(":").map(function (p) {
    return parseInt(p, 10) || 0;
  });
  if (parts.length === 0) return 0;
  var s = 0;
  for (var i = 0; i < parts.length; i++) s = s * 60 + parts[i];
  return s;
}

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
    var cachedEntry = memoryCache.data["pornhub"];
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
        var entry = res.data["pornhub"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      var learned = await kvStore.get("pornhub_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

// One Webmasters API search page. The API is a clean JSON feed —
// 30 videos per page, no cookies, no age gate, no HTML scraping —
// so pagination just works (the HTML search 404s on page 2+ behind
// an age-verification interstitial). Returns Post objects in the same
// shape as the other video providers (link/title/image/tag/_dur/
// cornerTag). The API search is full-text AND, so a combined
// "<term> 3d" search only returns videos matching both.
async function searchApi(query, page, opts) {
  var axios = opts.axios;
  var commonHeaders = opts.commonHeaders;
  var signal = opts.signal;
  var baseUrl = (opts && opts.baseUrl) || DEFAULT_BASE_URL;

  var candidateBases = [baseUrl, "https://www.pornhub.com", "https://www.pornhub.org", "https://www.pornhub.net"].filter(
    function (b, idx, arr) {
      return arr.indexOf(b) === idx;
    }
  );

  for (var bi = 0; bi < candidateBases.length; bi++) {
    var curBase = candidateBases[bi];
    var apiUrl =
      curBase +
      "/webmasters/search?search=" +
      encodeURIComponent(query) +
      "&page=" +
      Math.max(1, page || 1) +
      "&thumbsize=medium";

    try {
      var res = await axios.get(apiUrl, {
        timeout: 9000,
        headers: Object.assign({}, commonHeaders, {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: curBase + "/",
        }),
        signal: signal,
        maxRedirects: 5,
      });

      if (res.request && res.request.responseURL && opts.kvStore) {
        try {
          var u = new URL(res.request.responseURL);
          var origin = u.origin.replace(/\/+$/, "");
          if (origin && origin.startsWith("http") && origin !== baseUrl) {
            opts.kvStore.set("pornhub_learnedDomain", origin);
          }
        } catch (e) {}
      }

      var data = res.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          continue;
        }
      }
      var videos = (data && data.videos) || [];
      if (!Array.isArray(videos)) continue;

      var posts = [];
      var seen = {};
      for (var i = 0; i < videos.length; i++) {
        var v = videos[i] || {};
        var link = v.url || "";
        if (!link || seen[link]) continue;
        seen[link] = true;
        var title = String(v.title || "").trim();
        if (!title) continue;
        var image = v.default_thumb || v.thumb || "";
        var durationSec = parseApiDuration(v.duration);
        var durationText = formatDuration(durationSec) || v.duration || undefined;
        posts.push({
          title: title,
          link: link,
          image: image,
          tag: durationText,
          _dur: durationSec,
          cornerTag: durationText,
        });
      }
      posts.sort(function (a, b) {
        return compareTitle(a.title || "", b.title || "");
      });
      return posts;
    } catch (err) {
      // try next candidate base
    }
  }
  return [];
}

function getCategory(filter) {
  return config.categories.find(function (category) {
    return category.filter === filter;
  });
}

// 3D-only mode: the sweep searches each 3D keyword on PornHub (the
// Webmasters API) and the shared engine buckets the results into the
// 10 categories. See providers/threeD.ts for the full design.
function build3DContext(opts) {
  return {
    kvStore: opts.kvStore,
    fetchGrid: function (keyword) {
      return searchApi(keyword, 1, opts);
    },
    // Phase 2 of the sweep: "<term> 3d" + "<term> sfm" for MULTIPLE
    // terms per category — the plain word, the step- form, then the
    // cousin form. The API search is full-text AND, so these results
    // are trustworthy directly — the site matched both the category
    // and 3D. PornHub's own phrases are the XVideos phrases (plain
    // words with spaces); the R34 tag forms (underscores) would not
    // match here. Results are INTERLEAVED round-robin across terms
    // so the first term's videos do not fill page 1 alone.
    fetchCategory3D: async function (filter, pool) {
      var terms = searchTermsFor(filter, "xvideos", 3);
      if (terms.length === 0) return [];
      // All term x keyword searches in parallel — sequential took too
      // long. The API search is full-text AND, so these results are
      // trustworthy directly.
      var perTerm = await Promise.all(
        terms.map(async function (term) {
          var termResults = [];
          for (var ki = 0; ki < 2; ki++) {
            var kw = ki === 0 ? "3d" : "sfm";
            var grid = await searchApi(term + " " + kw, 1, opts);
            (grid || []).forEach(function (p) {
              termResults.push(p);
            });
          }
          return termResults;
        })
      );
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
    // (title only — the API carries no tags). The API search is
    // full-text AND, so a hit here is incest, family or cousin
    // content by the site's own index; a hit with no specific
    // relation word in the title belongs to Incest.
    fetchRelationPool: async function (pool) {
      var queries = ["taboo 3d", "taboo sfm", "stepfamily 3d", "stepfamily sfm", "family 3d", "family sfm", "cousin 3d", "cousin sfm"];
      var groups = await Promise.all(
        queries.map(function (q) {
          return searchApi(q, 1, opts);
        })
      );
      var out = {};
      groups.forEach(function (g) {
        (g || []).forEach(function (p) {
          if (!p || !p.link) return;
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

// 3D-only mode, FAST path (user, 2026-11-18): the cached pool bucket
// is tried first (instant when warm); when the pool is cold or the
// bucket is empty, a DIRECT combined API search ("<relation> 3d" /
// "<relation> sfm", or "3d" / "sfm" for the homepage) returns real 3D
// videos on-demand for pageNum in under a second.
async function get3DPostsForFilter(ctx, filter, page, apiOpts) {
  var kvStore = ctx && ctx.kvStore;
  var cached = null;
  try {
    cached = await read3DCache(kvStore);
  } catch (e) {
    cached = null;
  }
  if (cached) {
    var bucket = getBucketPosts(cached, filter, page);
    if (bucket && bucket.length > 0) return bucket;
  }
  var pageNum = Math.max(1, page || 1);
  var direct = [];
  try {
    if (filter === "homepage" || !filter) {
      var grids = await Promise.all([
        searchApi("3d", pageNum, apiOpts).catch(function () { return []; }),
        searchApi("sfm", pageNum, apiOpts).catch(function () { return []; }),
      ]);
      direct = dedupePosts(keepLongEnough((grids[0] || []).concat(grids[1] || [])));
    } else {
      var category = getCategory(filter);
      var queries = category && category.xvideosQueries ? category.xvideosQueries : [];
      if (queries.length === 0) {
        queries = [filter.replace(/^rel_/, "")];
      }
      var primaryTerm = String(queries[0]).replace(/\+/g, " ").trim();
      var grids = await Promise.all([
        searchApi(primaryTerm + " 3d", pageNum, apiOpts).catch(function () { return []; }),
        searchApi(primaryTerm + " sfm", pageNum, apiOpts).catch(function () { return []; }),
      ]);
      direct = dedupePosts(keepLongEnough((grids[0] || []).concat(grids[1] || [])));
      if (direct.length === 0 && queries.length > 1) {
        var secTerm = String(queries[1]).replace(/\+/g, " ").trim();
        var secGrids = await Promise.all([
          searchApi(secTerm + " 3d", pageNum, apiOpts).catch(function () { return []; }),
          searchApi(secTerm + " sfm", pageNum, apiOpts).catch(function () { return []; }),
        ]);
        direct = dedupePosts(keepLongEnough((secGrids[0] || []).concat(secGrids[1] || [])));
      }
    }
  } catch (e) {
    direct = [];
  }
  warm3DInBackground(ctx);
  return direct;
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

  var apiOpts = {
    axios: axios,
    commonHeaders: commonHeaders,
    signal: signal,
    baseUrl: baseUrl,
    kvStore: kvStore,
  };

  // 3D-only mode ("3D content only" toggle in the provider settings):
  // fast native 3D category routing with direct pageNum support.
  var threeDContext = build3DContext({
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
  });
  if (await is3DOn(kvStore)) {
    return await get3DPostsForFilter(threeDContext, filter, page, apiOpts);
  } else if (page <= 1) {
    warm3DInBackground(threeDContext);
  }

  if (category && category.mode === "keep_existing") {
    // Family: the site's own "family" search, most relevant first.
    return searchApi("family", page, apiOpts);
  }

  if (category && category.mode === "random_feed") {
    // Homepage: the API's general feed (empty search). A random page
    // on every refresh so the home does not repeat itself.
    var randomPage = Math.floor(Math.random() * 20) + 1;
    return searchApi("", randomPage, apiOpts);
  }

  if (category && category.mode === "multi_query") {
    var queries = Array.isArray(category.xvideosQueries) ? category.xvideosQueries : [];
    if (queries.length === 0) {
      return [];
    }

    // High performance category loading: deduplicate distinct terms and
    // query top 3 distinct terms in parallel rotating by term-page (tp).
    // This completes in ~500ms rather than stalling mobile connections with 18 sequential calls.
    var fetchTermPage = async function (tp) {
      var pageIndex = Math.max(0, tp - 1);
      var distinctQueries = [];
      var seenTerms = {};
      for (var qi = 0; qi < queries.length; qi++) {
        var term = String(queries[qi] || "").replace(/\+/g, " ").trim().toLowerCase();
        if (!term || seenTerms[term]) continue;
        seenTerms[term] = true;
        distinctQueries.push(term);
      }
      if (distinctQueries.length === 0) return [];

      var startIdx = (pageIndex * 3) % distinctQueries.length;
      var selected = distinctQueries.slice(startIdx, startIdx + 3);
      if (selected.length < 3 && distinctQueries.length > selected.length) {
        selected = selected.concat(distinctQueries.slice(0, 3 - selected.length));
      }

      var groups = await Promise.all(
        selected.map(function (term) {
          return searchApi(term, pageIndex + 1, apiOpts);
        })
      );

      var merged = [];
      var maxLen = 0;
      for (var g = 0; g < groups.length; g++) maxLen = Math.max(maxLen, groups[g].length);
      for (var i = 0; i < maxLen; i++) {
        for (var g2 = 0; g2 < groups.length; g2++) {
          if (groups[g2][i]) merged.push(groups[g2][i]);
        }
      }
      return dedupePosts(keepLongEnough(merged));
    };

    return getPooledCategoryPage({
      kvStore: kvStore,
      filter: filter,
      page: page,
      fetchTermPage: fetchTermPage,
    });
  }

  return [];
};

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
  var normQuery = (searchQuery || "").trim().toLowerCase().replace(/\s+/g, " ");

  // 3D-only mode: the verified 3D pool (built once, cached 1h).
  // FAST read only (user, 2026-11-18): read3DCache returns the cached
  // pool instantly or null; when null, the direct "<query> 3d" search
  // below still returns real 3D results, and the sweep is kicked off
  // in the background.
  var threeDOn = await is3DOn(kvStore);
  var cached = null;
  if (threeDOn) {
    var threeDContext = build3DContext({
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
    try {
      cached = await read3DCache(kvStore);
    } catch (e) {
      cached = null;
    }
    if (!cached) warm3DInBackground(threeDContext);
  }

  var apiOpts = {
    axios: axios,
    commonHeaders: commonHeaders,
    signal: signal,
    baseUrl: baseUrl,
    kvStore: kvStore,
  };

  // One API search page. In 3D mode the plain page is intersected with
  // the verified pool and a direct "<query> 3d" search is added (the
  // API search is full-text AND, so this finds 3D matches beyond the
  // cached pool). Dedupe + under-2-min filter, as usual.
  var fetchSitePage = async function (sp) {
    var plain = await searchApi(searchQuery, sp, apiOpts);
    if (!threeDOn) return plain;
    var matched = cached
      ? intersectWithPool(plain, cached)
      : plain.filter(function (p) {
          return titleMatchesAnyKeyword(p.title);
        });
    var direct = await searchApi(searchQuery + " 3d", sp, apiOpts);
    return dedupePosts(keepLongEnough(matched.concat(direct)));
  };

  // 3D pool matches for this query (same on every call; the pool cache
  // dedupes them to a single copy). Empty in normal mode.
  var extraPosts = [];
  if (threeDOn && cached) {
    extraPosts = dedupePosts(
      keepLongEnough(
        poolTitleSearch(cached, searchQuery).concat(
          poolCategorySearch(cached, searchQuery)
        )
      )
    );
  }

  // The search pool serves a different 60-video slice per app page, so
  // scrolling a search keeps showing new videos — never page 1 again.
  return getPooledSearchPage({
    kvStore: kvStore,
    query: normQuery,
    page: page,
    fetchSitePage: fetchSitePage,
    extraPosts: extraPosts,
  });
};

export const getSearchPosts = async function (params) {
  var posts = await getSearchPostsImpl(params);
  return groupSeriesPosts(posts || []);
};
