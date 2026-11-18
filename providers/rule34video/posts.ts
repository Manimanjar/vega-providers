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
  matchesRelationWords,
  titleMatchesAnyKeyword,
  dedupePosts,
  keepLongEnough,
  getPooledCategoryPage,
  getPooledSearchPage,
} from "../threeD";
import { groupSeriesPosts } from "../series";

"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://rule34video.com";
var memoryCache = { data: null, expiresAt: 0 };
// Persistent base-URL cache key (kvStore survives sandbox re-evaluation;
// module-level memoryCache does not, so without this every category
// fetch paid a ~350ms urls.json round-trip before it even started).
var BASE_CACHE_KEY = "rule34video_baseUrlCacheV1";

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
    var cachedEntry = memoryCache.data["rule34video"];
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
        var entry = res.data["rule34video"];
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
    var idMatch = post.link.match(/\/video\/([0-9]+)/i);
    var key = idMatch ? idMatch[1] : post.link;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
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
  var requireVideo = options.requireVideo;

  try {
    var res = await axios.get(url, {
      timeout: 12000,
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl + "/",
      }),
      signal: signal,
      maxRedirects: 5,
    });

    updateLearnedDomain(res, baseUrl, kvStore);

    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];
    var seenVideoIds = new Set();

    $(".item.thumb, [data-video-card-id]").each(function (_, element) {
      var $el = $(element);
      var linkEl = $el.find("a.th, a[href*=\"/video/\"]").first();
      var rawHref = linkEl.attr("href") || "";
      var rawTitle =
        linkEl.attr("title") ||
        $el.find("img.thumb").attr("alt") ||
        linkEl.text().trim();

      if (!rawTitle || !rawHref) return;

      if (requireVideo && !/\/video\/|animated|\\.mp4(?:$|[?#])/i.test(rawHref + " " + rawTitle)) {
        return;
      }

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
      var durationSec = 0;
      if (duration) {
        var dParts = duration.split(":").map(function (part) {
          return parseInt(part, 10) || 0;
        });
        if (dParts.length === 3) {
          durationSec = dParts[0] * 3600 + dParts[1] * 60 + dParts[2];
        } else if (dParts.length === 2) {
          durationSec = dParts[0] * 60 + dParts[1];
        } else if (dParts.length === 1) {
          durationSec = dParts[0];
        }
      }

      if (durationSec > 0 && durationSec < 120) {
        return;
      }

      var isHd = $el.find(".quality").length > 0;
      // Vega's card shows only ONE badge (cornerTag wins over tag), so
      // the duration was invisible whenever HD existed. Combine them:
      // "2:17 • HD" keeps both in the one badge.
      var durationText = formatDuration(durationSec) || duration || undefined;
      var cornerTag = durationText
        ? isHd
          ? durationText + " • HD"
          : durationText
        : isHd
          ? "HD"
          : undefined;

      var absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;

      // Same lazy-load guard as the series fetcher: if every image
      // source was a 1px data: placeholder, use the video's own
      // preview poster (built from its ID) instead of an invisible one.
      if (!image || image.indexOf("data:") === 0) {
        var idm = String(rawHref).match(/\/video\/(\d+)/);
        if (idm) {
          var vid2 = parseInt(idm[1], 10);
          var bucket2 = Math.floor(vid2 / 10000) * 10000;
          image = baseUrl + "/contents/videos_screenshots/" + bucket2 + "/" + vid2 + "/preview.jpg";
        }
      }

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
    console.error("Rule34Video posts error:", err && err.message ? err.message : err);
    return [];
  }
}

function getCategory(filter) {
  return config.categories.find(function (category) {
    return category.filter === filter;
  });
}

// 3D-only mode: the sweep searches each 3D keyword on Rule34Video
// (/search/<keyword>) and the shared engine buckets the results into
// the 10 categories. See providers/threeD.ts for the full design.
function build3DContext(opts) {
  // Per-sweep tag cache (promise memoization): the sweep calls
  // fetchCategory3D for 8 categories in parallel waves, and several
  // of them need the same video's tags. The first caller stores the
  // in-flight promise; the rest await it — each video page is fetched
  // at most once per sweep. The cache lives on this context object,
  // which is created once per getPosts call, so it never leaks
  // across sweeps.
  var tagCache = {};
  function getVideoMetaCached(link) {
    if (!tagCache[link]) {
      tagCache[link] = fetchVideoPageMeta(link, opts).catch(function () {
        return { tags: "", is3D: false };
      });
    }
    return tagCache[link];
  }
  return {
    kvStore: opts.kvStore,
    fetchGrid: function (keyword) {
      var dash = encodeURIComponent(keyword.trim().replace(/\s+/g, "-"));
      var targetUrl = opts.baseUrl + "/search/" + dash + "/";
      return parseVideoGrid({
        url: targetUrl,
        baseUrl: opts.baseUrl,
        axios: opts.axios,
        cheerio: opts.cheerio,
        commonHeaders: opts.commonHeaders,
        signal: opts.signal,
        kvStore: opts.kvStore,
        requireVideo: true,
      });
    },
    // Phase 2 of the sweep: "/search/<term>-3d/" and
    // "/search/<term>-sfm/", pages 1-2, for MULTIPLE terms per
    // category (user, 2026-11-18): the plain word, the step- form,
    // then the cousin form — e.g. Sister searches "sister",
    // "stepsister" and "cousin". One term alone misses videos the
    // others find. Rule34Video combined search is OR-ish: a result
    // matched the category (via tags or title) OR "3d" (via
    // title/tags) — verified live 2026-11-18.
    // A pool video appearing here proves nothing about the category,
    // so pool membership is NOT used as a signal, and the frequency
    // cap idea was abandoned (a true category video also matches
    // "3d" in every other category's search, so frequency cannot
    // tell a true video from a generic compilation). A hit is kept
    // only when it is 3D AND this relation, where 3D is proven by
    // the title, the tags, or the page's own video_categories
    // ('3D' — the site files "Family Rules" as 3D even though
    // neither its titles nor its tags ever say "3D", so title-only
    // matching could never find it), and the relation is proven by
    // a relation word in the title or the tags. Compilations are
    // grab-bags whose tags cover every category, so they never
    // confirm a specific relation here (they can still land in
    // Incest via Phase 2b). Everything that fails stays on
    // Homepage via the pool, never in a category it does not
    // belong to.
    fetchCategory3D: async function (filter, pool) {
      var terms = searchTermsFor(filter, "rule34video", 3);
      if (terms.length === 0) return [];
      var words = R34_CATEGORY_WORDS[filter] || [];
      if (words.length === 0) return [];
      // --- Source A: combined searches ---
      var gridJobs = [];
      terms.forEach(function (term) {
        ["3d", "sfm"].forEach(function (kw) {
          [1, 2].forEach(function (page) {
            var dash = encodeURIComponent((term + "-" + kw).trim().replace(/\s+/g, "-"));
            var targetUrl = opts.baseUrl + "/search/" + dash + "/" + (page > 1 ? page + "/" : "");
            gridJobs.push(function () {
              return parseVideoGrid({
                url: targetUrl,
                baseUrl: opts.baseUrl,
                axios: opts.axios,
                cheerio: opts.cheerio,
                commonHeaders: opts.commonHeaders,
                signal: opts.signal,
                kvStore: opts.kvStore,
                requireVideo: true,
              }).catch(function () {
                return [];
              });
            });
          });
        });
      });
      // Up to 12 grids (3 terms x 2 keywords x 2 pages), in waves
      // of 4 so the site is not hammered all at once. Results are
      // INTERLEAVED round-robin across terms afterwards: if the
      // terms were concatenated, the first term's videos would fill
      // page 1 and the cousin term's videos would sit on page 2+
      // (buried). Interleaving puts a cousin video on page 1 too.
      var groups = [];
      for (var w = 0; w < gridJobs.length; w += 4) {
        var wave = gridJobs.slice(w, w + 4);
        var waveResults = await Promise.all(
          wave.map(function (job) {
            return job();
          })
        );
        for (var gi = 0; gi < waveResults.length; gi++) groups.push(waveResults[gi]);
        if (w + 4 < gridJobs.length) {
          await new Promise(function (resolve) {
            setTimeout(resolve, 300);
          });
        }
      }
      // groups are in job order: 4 grids per term (2 keywords x 2
      // pages). Flatten per term, then interleave round-robin.
      var perTermPosts = [];
      var gridsPerTerm = 4;
      for (var t = 0; t < terms.length; t++) {
        var termPosts = [];
        for (var g = 0; g < gridsPerTerm; g++) {
          var grp = groups[t * gridsPerTerm + g] || [];
          for (var pi = 0; pi < grp.length; pi++) termPosts.push(grp[pi]);
        }
        perTermPosts.push(termPosts);
      }
      var allPosts = [];
      var maxTermLen = 0;
      for (var t2 = 0; t2 < perTermPosts.length; t2++) maxTermLen = Math.max(maxTermLen, perTermPosts[t2].length);
      for (var i2 = 0; i2 < maxTermLen; i2++) {
        for (var t3 = 0; t3 < perTermPosts.length; t3++) {
          if (perTermPosts[t3][i2]) allPosts.push(perTermPosts[t3][i2]);
        }
      }
      var seen = {};
      var candidates = [];
      allPosts.forEach(function (p) {
        if (!p || !p.link || seen[p.link]) return;
        seen[p.link] = true;
        // Widened: a candidate is a video whose title names 3D OR
        // names this relation. "Family Rules" titles name the
        // relation ("family") but never "3D" — the old title-3D
        // filter dropped them before they could be checked. The
        // page check below (video_categories / tags) is what
        // proves 3D-ness for those.
        if (!titleMatchesAnyKeyword(p.title) && !matchesRelationWords(p.title, words, filter)) return;
        if (/compilation|collection|archive/i.test(p.title || "")) return;
        candidates.push(p);
      });
      var confirmed = [];
      var toVerify = [];
      candidates.forEach(function (p) {
        // The title alone confirms only when it names BOTH dimensions.
        if (matchesRelationWords(p.title, words, filter) && titleMatchesAnyKeyword(p.title)) confirmed.push(p);
        else toVerify.push(p);
      });
      // Verify the rest by page (tags + video_categories), capped so
      // the sweep stays bounded. Confirmed when the page proves 3D
      // AND the title or the tags name this relation. Candidates
      // whose title already names the relation go first — they are
      // the ones most likely to confirm (e.g. "Family Rules" names
      // "family" in the title; the page only has to prove 3D).
      // Cap 24: the combined searches return many candidates and
      // the relation-named ones must not be cut off.
      var checkList = toVerify
        .slice()
        .sort(function (a, b) {
          var aRel = matchesRelationWords(a.title, words, filter) ? 0 : 1;
          var bRel = matchesRelationWords(b.title, words, filter) ? 0 : 1;
          return aRel - bRel;
        })
        .slice(0, 24);
      for (var i = 0; i < checkList.length; i += 4) {
        var batch = checkList.slice(i, i + 4);
        var metas = await Promise.all(batch.map(function (p) {
          return getVideoMetaCached(p.link);
        }));
        for (var j = 0; j < batch.length; j++) {
          var meta = metas[j] || { tags: "", is3D: false };
          if (meta.is3D && (matchesRelationWords(batch[j].title, words, filter) || matchesRelationWords(meta.tags, words, filter))) confirmed.push(batch[j]);
        }
        if (i + 4 < checkList.length) {
          await new Promise(function (resolve) {
            setTimeout(resolve, 300);
          });
        }
      }
      // --- Source B: tag-verify the 3D pool itself ---
      // The plain category searches (pages 1-3) contain ZERO 3D-titled
      // long videos (probed 2026-11-18), and the combined search's top
      // results are mostly generic SFM clips with no relation signal.
      // The pool already IS the site's 3D content, so the surest way
      // to find a 3D sister/mom/... video is to read the pool videos'
      // own tags. First 150 non-compilation pool videos (tier order:
      // the "3d"/"cgi"/"sfm" results first), batched 8 at a time;
      // the shared tag cache means the 150 fetches happen once per
      // sweep, not once per category.
      var poolSlice = (pool || [])
        .filter(function (p) {
          return p && p.link && !/compilation|collection|archive/i.test(p.title || "");
        })
        .slice(0, 150);
      for (var b = 0; b < poolSlice.length; b += 8) {
        var poolBatch = poolSlice.slice(b, b + 8);
        var poolMetas = await Promise.all(
          poolBatch.map(function (p) {
            return getVideoMetaCached(p.link);
          })
        );
        for (var k = 0; k < poolBatch.length; k++) {
          var pm = poolMetas[k] || { tags: "", is3D: false };
          if (pm.tags && matchesRelationWords(pm.tags, words, filter)) confirmed.push(poolBatch[k]);
        }
        if (b + 8 < poolSlice.length) {
          await new Promise(function (resolve) {
            setTimeout(resolve, 300);
          });
        }
      }
      return confirmed;
    },
    // Phase 2b of the sweep: the relation pool. Most relation videos
    // carry an incest or family tag, so search the incest/family
    // combined searches and classify each hit by its relation words
    // (title first, then its .vp-tags via the shared page cache).
    // Rule34Video combined search is OR-ish, so a hit may have
    // matched only the "3d" half — the page check (video_categories
    // '3D' + tags) is what confirms it is really 3D. A
    // compilation's tags span every relation (one scene each), so a
    // compilation only ever lands in Incest, and only when its tags
    // confirm incest/family. A hit with no relation signal at all
    // is dropped from the categories (it stays on Homepage via the
    // pool). Returns { filter: [posts] }.
    fetchRelationPool: async function (pool) {
      // Pages 1-2 of each combined search: the relation videos are
      // buried under the site's popularity ranking, and page 1 alone
      // yields only a handful. Two pages per search, 14 fetches.
      // The cousin searches are here too (user, 2026-11-18): a
      // "cousin sis" search can surface a "cousin brother" video,
      // and the classify step below picks it up into Brother —
      // nothing found is dropped just because it was found by
      // another category's search. The PLAIN "cousin" searches are
      // here as well: the combined "cousin-3d" search is OR-ish and
      // returns mostly generic 3D videos, while the plain "cousin"
      // search returns the actual cousin videos ("Cousin's Visit",
      // "Cousin Power [Thordersfm]") — the page check then proves
      // which of them are 3D.
      var queries = [
        "incest-3d", "incest-3d/2", "incest-sfm", "incest-sfm/2",
        "family-3d", "family-3d/2", "family-sfm", "family-sfm/2",
        "cousin-3d", "cousin-3d/2", "cousin-sfm", "cousin-sfm/2",
        "cousin", "cousin/2",
      ];
      var grids = queries.map(function (dash) {
        var targetUrl = opts.baseUrl + "/search/" + dash + "/";
        return parseVideoGrid({
          url: targetUrl,
          baseUrl: opts.baseUrl,
          axios: opts.axios,
          cheerio: opts.cheerio,
          commonHeaders: opts.commonHeaders,
          signal: opts.signal,
          kvStore: opts.kvStore,
          requireVideo: true,
        }).catch(function () {
          return [];
        });
      });
      var groups = await Promise.all(grids);
      var out = {};
      var addTo = function (filter, post) {
        if (!out[filter]) out[filter] = [];
        out[filter].push(post);
      };
      var classifyByWords = function (text) {
        var found = [];
        for (var f in R34_CATEGORY_WORDS) {
          if (matchesRelationWords(text, R34_CATEGORY_WORDS[f], f)) found.push(f);
        }
        return found;
      };
      var seen = {};
      var candidates = [];
      groups.forEach(function (g) {
        (g || []).forEach(function (p) {
          if (!p || !p.link || seen[p.link]) return;
          seen[p.link] = true;
          // Widened, same as Source A: a candidate names 3D in the
          // title OR names a relation in the title. "Family Rules"
          // names the relation but never "3D" — the page check
          // (video_categories) is what proves it is 3D.
          if (!titleMatchesAnyKeyword(p.title) && classifyByWords(p.title).length === 0) return;
          candidates.push(p);
        });
      });
      var toVerify = [];
      candidates.forEach(function (p) {
        var byTitle = classifyByWords(p.title);
        // The title alone confirms only when it names BOTH dimensions.
        if (byTitle.length > 0 && titleMatchesAnyKeyword(p.title)) {
          byTitle.forEach(function (f) {
            addTo(f, p);
          });
        } else {
          toVerify.push(p);
        }
      });
      // Verify the rest by page (tags + video_categories), capped so
      // the sweep stays bounded. Confirmed when the page proves 3D
      // AND the title or the tags name a relation. Candidates whose
      // title already names a relation go first — they are the ones
      // most likely to confirm (e.g. "Family Rules" names "family"
      // in the title; the page only has to prove 3D). Cap 60 so a
      // long candidate list does not cut the family videos off.
      var checkList = toVerify
        .slice()
        .sort(function (a, b) {
          var aRel = classifyByWords(a.title).length > 0 ? 0 : 1;
          var bRel = classifyByWords(b.title).length > 0 ? 0 : 1;
          return aRel - bRel;
        })
        .slice(0, 60);
      for (var i = 0; i < checkList.length; i += 4) {
        var batch = checkList.slice(i, i + 4);
        var metas = await Promise.all(
          batch.map(function (p) {
            return getVideoMetaCached(p.link);
          })
        );
        for (var j = 0; j < batch.length; j++) {
          var post = batch[j];
          var meta = metas[j] || { tags: "", is3D: false };
          if (!meta.is3D) continue;
          var tags = meta.tags || "";
          var isCompilation = /compilation|collection|archive/i.test(post.title || "");
          if (isCompilation) {
            if (matchesRelationWords(tags, R34_CATEGORY_WORDS.incest, "incest")) addTo("incest", post);
            continue;
          }
          var byTitle = classifyByWords(post.title);
          var byTags = classifyByWords(tags);
          var all = byTitle.concat(byTags.filter(function (f) {
            return byTitle.indexOf(f) === -1;
          }));
          if (all.length > 0) {
            all.forEach(function (f) {
              addTo(f, post);
            });
          }
        }
        if (i + 4 < checkList.length) {
          await new Promise(function (resolve) {
            setTimeout(resolve, 300);
          });
        }
      }
      return out;
    },
  };
}

// Rule34Video's own vocabulary for each category, used for both the
// title check and the .vp-tags check. Plurals included ("moms" is a
// different word from "mom" for word-boundary matching), plus the
// site's concept tags: "milf" for Mom, "incest" for Family only.
// "incest" is deliberately NOT listed for the specific relations —
// it is shared across all of them, so it cannot confirm one.
const R34_CATEGORY_WORDS = {
  family: ["family", "families", "stepfamily", "stepfamilies", "incest"],
  incest: ["incest", "family", "families", "stepfamily", "stepfamilies", "taboo"],
  rel_sister: ["sister", "sisters", "stepsister", "stepsisters", "stepsis", "sis", "step sis", "step sister", "bigsis", "big sis", "lilsis", "lil sis", "little sis", "older sister", "older sisters", "younger sister", "younger sisters", "twin sister", "twin sisters", "cousin", "cousins", "cousin sis", "cousin sister", "cousin stepsis", "cousin step sister", "cousin stepsister", "cousin step sis", "sister-in-law", "step sister in law"],
  rel_brother: ["brother", "brothers", "stepbrother", "stepbrothers", "stepbro", "bro", "step bro", "step brother", "bigbro", "big bro", "lilbro", "lil bro", "little bro", "older brother", "older brothers", "younger brother", "younger brothers", "cousin brother", "cousin bro", "cousin stepbrother", "cousin step brother", "cousin stepbro", "cousin step bro", "brother-in-law"],
  rel_mom: ["mom", "moms", "mother", "mothers", "stepmom", "stepmoms", "stepmother", "stepmothers", "step mom", "step mother", "mommy", "mommies", "mama", "mamas", "maa", "mother and son", "milf", "cousin mom", "cousin mother", "cousin stepmom", "cousin stepmother", "mother-in-law"],
  rel_daughter: ["daughter", "daughters", "stepdaughter", "stepdaughters", "step daughter", "father and daughter", "mother and daughter", "cousin daughter", "cousin stepdaughter", "daughter-in-law", "in laws", "in law", "granddaughter", "granddaughters"],
  rel_father: ["father", "fathers", "dad", "dads", "stepdad", "stepdads", "stepfather", "stepfathers", "step father", "daddy", "daddies", "papa", "paa", "cousin dad", "cousin father", "cousin stepdad", "cousin stepfather", "cousin daddy", "father-in-law"],
  rel_aunt: ["aunt", "aunts", "auntie", "aunties", "aunty", "aunties", "stepaunt", "stepaunts", "step aunt", "aunt and nephew", "cousin aunt", "cousin auntie", "cousin aunty", "cousin stepaunt"],
  rel_grandma: ["grandma", "grandmas", "grandmother", "grandmothers", "grand mother", "grand mothers", "granny", "grannies", "grandmama", "step grandma", "step grandmas"],
  rel_grandpa: ["grandpa", "grandpas", "grandfather", "grandfathers", "grand father", "grand fathers", "grandad", "grandads", "grandpapa", "step grandpa", "step grandpas"],
  rel_son: ["son", "sons", "stepson", "stepsons", "step son", "step sons", "grandson", "grandsons"],
};

// (Category word matching lives in threeD.ts as
// matchesRelationWords, shared with the engine so the cousin rule
// is identical on both sites.)

// Small getMeta-style page fetch: the video page's own tags live in
// .vp-tags (same selector as meta.ts), and its category lives in the
// page's JavaScript as video_categories. Returns { tags, is3D }.
// is3D is the per-video 3D proof the site itself carries: the
// category is literally '3D' for videos the site files as 3D
// (verified live 2026-11-18: "Family Rules 13" -> '3D', a 2D sister
// video -> '2D', a "3d hentai beauties" video -> '3D'), or a 3D word
// in the tags. This is what confirms videos whose TITLE never says
// "3D" — "Family Rules" is an SFM series, but neither its titles
// nor its tags contain a 3D word, so title-only matching could never
// find it. A franchise category ("The Witcher 3: Wild Hunt") is
// neither proof nor disproof, so it falls back to the tags. Kept
// here instead of importing meta.ts so posts.js stays a
// self-contained bundle.
async function fetchVideoPageMeta(link, opts) {
  var res = await opts.axios.get(link, {
    headers: Object.assign({}, opts.commonHeaders || {}, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: opts.baseUrl + "/",
    }),
    timeout: 12000,
    signal: opts.signal,
  });
  var html = res.data || "";
  var $ = opts.cheerio.load(html);
  var tags = [];
  $('.vp-tags a[href*="/tags/"]').each(function (_, el) {
    var t = $(el).text().trim();
    if (t && t !== "Tags" && tags.indexOf(t) === -1) tags.push(t);
  });
  var tagText = tags.join(" ");
  var is3D = titleMatchesAnyKeyword(tagText);
  var catMatch = html.match(/video_categories\s*:\s*'([^']*)'/i) || html.match(/video_categories\s*:\s*"([^"]*)"/i);
  if (catMatch && catMatch[1]) {
    var catVal = catMatch[1].toLowerCase();
    if (/\b3d\b/.test(catVal) || /\banimation\b/.test(catVal)) is3D = true;
  }
  return { tags: tagText, is3D: is3D };
}

async function get3DPostsForFilter(ctx, filter, page) {
  var baseUrl = ctx.baseUrl;
  var axios = ctx.axios;
  var cheerio = ctx.cheerio;
  var commonHeaders = ctx.commonHeaders;
  var signal = ctx.signal;
  var kvStore = ctx.kvStore;

  var pageNum = Math.max(1, page || 1);

  // 1. Homepage in 3D mode: Rule34Video has a dedicated /categories/3d/ section
  if (filter === "homepage" || !filter) {
    var homeUrl =
      pageNum > 1
        ? baseUrl + "/categories/3d/" + pageNum + "/"
        : baseUrl + "/categories/3d/";
    return parseVideoGrid({
      url: homeUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
      requireVideo: true,
    });
  }

  // 2. Relation / category filtering in 3D mode:
  // Map filter to its verified 3D category tag on Rule34Video
  var tagMap = {
    family: "family",
    incest: "incest",
    rel_sister: "sister",
    rel_mom: "milf",
    rel_aunt: "aunt",
    rel_daughter: "daughter",
    rel_brother: "brother",
    rel_father: "father",
    rel_son: "son",
    rel_grandma: "grandma",
    rel_grandpa: "grandpa",
  };

  var tag = tagMap[filter];
  if (tag) {
    var tagUrl =
      pageNum > 1
        ? baseUrl + "/categories/3d/" + pageNum + "/?tag=" + encodeURIComponent(tag)
        : baseUrl + "/categories/3d/?tag=" + encodeURIComponent(tag);
    var tagPosts = await parseVideoGrid({
      url: tagUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
      requireVideo: true,
    });
    if (tagPosts && tagPosts.length > 0) {
      return tagPosts;
    }
  }

  // 3. Fallback: Search with -3d keyword on Rule34Video
  var primaryTerm = primaryTermFor(filter, "rule34video") || filter;
  var searchClean = encodeURIComponent(
    primaryTerm.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-3d"
  );
  var fallbackUrl =
    pageNum > 1
      ? baseUrl + "/search/" + searchClean + "/" + pageNum + "/"
      : baseUrl + "/search/" + searchClean + "/";

  return parseVideoGrid({
    url: fallbackUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
    requireVideo: true,
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

  // 3D-only mode: fast native 3D category and tag routing
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
    var familyUrl =
      page > 1
        ? baseUrl + "/search/family/" + page + "/"
        : baseUrl + "/search/family/";
    return parseVideoGrid({
      url: familyUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  if (category && category.mode === "random_feed") {
    var randomPage = Math.floor(Math.random() * 35) + 1;
    var randomUrl = baseUrl + "/" + randomPage + "/?_t=" + Date.now();
    var posts = await parseVideoGrid({
      url: randomUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
    // The page itself is random on every refresh; within it the
    // videos are alphabetical so parts of a clip stay together.
    return posts;
  }

  if (category && category.mode === "multi_query") {
    var tags = Array.isArray(category.rule34Tags) ? category.rule34Tags : [];
    if (tags.length === 0) {
      return [];
    }

    // Maximum content, nothing skipped (user, 2026-11-18): the old code
    // fetched page N of every tag, merged them, and returned only the
    // first 60 — the rest of that term-page never appeared on any app
    // page. getPooledCategoryPage keeps the FULL merged pool for a
    // term-page in kvStore and serves it in 60-video slices across
    // consecutive app pages, so every video is eventually shown.
    // fetchTermPage(tp) builds the pool for term-page tp.
    var fetchTermPage = async function (tp) {
      var tagResults = await Promise.all(
        tags.map(function (tag) {
          var cleanTag = encodeURIComponent(String(tag).trim().replace(/\s+/g, "-"));
          var searchUrl =
            tp > 1
              ? baseUrl + "/search/" + cleanTag + "/" + tp + "/"
              : baseUrl + "/search/" + cleanTag + "/";
          return parseVideoGrid({
            url: searchUrl,
            baseUrl: baseUrl,
            axios: axios,
            cheerio: cheerio,
            commonHeaders: commonHeaders,
            signal: signal,
            kvStore: kvStore,
            requireVideo: true,
          });
        })
      );
      // Sort the merged list alphabetically (interleaving alone would
      // scatter parts of the same clip again). No cap here — the pool
      // cache slices it into 60-video app pages.
      var merged = interleavePosts(tagResults);
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
    var familyUrl =
      page > 1
        ? baseUrl + "/search/family/" + page + "/"
        : baseUrl + "/search/family/";
    return parseVideoGrid({
      url: familyUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
    });
  }

  // Fallback for old / cached filters. targetUrl MUST be declared: in
  // ESM strict mode assigning to an undeclared variable throws
  // ReferenceError and getPosts rejects, so the provider showed a
  // black screen.
  var targetUrl;
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
  var cleanQuery = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-"));

  var threeDOn = await is3DOn(kvStore);

  // One site search page (sp is 1-based). In 3D mode, query directly with -3d suffix
  var fetchSitePage = async function (sp) {
    var searchDash = threeDOn
      ? encodeURIComponent(cleanQuery + "-3d")
      : cleanQuery;
    var targetUrl =
      sp > 1
        ? baseUrl + "/search/" + searchDash + "/" + sp + "/"
        : baseUrl + "/search/" + searchDash + "/";
    return parseVideoGrid({
      url: targetUrl,
      baseUrl: baseUrl,
      axios: axios,
      cheerio: cheerio,
      commonHeaders: commonHeaders,
      signal: signal,
      kvStore: kvStore,
      requireVideo: true,
    });
  };

  return getPooledSearchPage({
    kvStore: kvStore,
    query: normQuery + (threeDOn ? " 3d" : ""),
    page: page,
    fetchSitePage: fetchSitePage,
    extraPosts: [],
  });
};

// Parts grouping, same as getPosts above.
export const getSearchPosts = async function (params) {
  var posts = await getSearchPostsImpl(params);
  return groupSeriesPosts(posts || []);
};
