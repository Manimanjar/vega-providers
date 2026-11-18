import config from "./categories.config.json";

"use strict";

// ---------------------------------------------------------------------------
// 3D-only mode ("3D content only" toggle in the provider settings).
//
// What it does, in the user's words: when the toggle is ON, the 9
// categories stay exactly the same, but every category shows only 3D /
// animation content. Nothing is skipped: the pool is built by searching
// EVERY keyword below on the site, on both providers. Videos under 2
// minutes are excluded. No video ever appears twice.
//
// How it works (three steps, in this order):
//   1. COLLECT (sweep): search each keyword on the site and collect the
//      results. The SITE does the matching — its search already looks
//      through titles, tags, descriptions and uploader names, which is
//      exactly "anywhere under that content". Matching keywords in our
//      own code would be far weaker: the cards getPosts returns only
//      carry a title and a picture, no tags.
//   2. FILTER: drop duplicates (same video found by several keywords)
//      and drop videos under 2 minutes (duration is on the card).
//   3. ARRANGE (bucketize): sort every collected video into the 9
//      categories by matching its title against that category's own
//      search terms (the same terms the category already uses). A video
//      can sit in several categories at once — that is how the normal
//      multi-query categories already behave. Videos matching no
//      category still show up on Homepage: nothing is ever dropped.
//
// Speed: the sweep runs ONCE and the buckets are cached in kvStore for
// 1 hour, so after the first 3D load every category is instant. While
// the toggle is OFF, getPosts warms the same cache in the background
// (fire-and-forget, at most once an hour), so turning the toggle on
// feels instant. If the sweep ever fails (network down, site 429),
// 3D mode falls back to the normal feed instead of a black screen.
//
// Keyword order is the arrangement: Tier 1 (true 3D) first, then the
// user's own words (vfx/sfx/fx), then animation/cartoon. A few keywords
// are imprecise — "blender" also matches kitchen blenders, "vfx" on
// XVideos returns 2 live-action clips — but they sit late in the order
// and the per-bucket caps keep them from crowding out real 3D.
// ---------------------------------------------------------------------------

var THREE_D_TOGGLE_KEY = "only3D";
var THREE_D_CACHE_KEY = "threeDCacheV1";
var THREE_D_WARM_KEY = "threeDWarmV1";
var THREE_D_TTL_MS = 3600000; // 1 hour, same as the base-URL cache
var THREE_D_WARM_INTERVAL_MS = 3600000; // warm at most once an hour
var THREE_D_PAGE_SIZE = 60; // same cap as the normal multi-query merge
var THREE_D_POOL_CAP = 400; // max videos stored in the cached pool
var THREE_D_PHASE1_CAP = 300; // Phase 1 (generic keywords) leaves room
// for the per-category combined-search hits appended by Phase 2.
var THREE_D_BUCKET_CAP = 120; // max videos per category bucket (2 pages)
var THREE_D_WAVE_SIZE = 5; // keywords fetched per wave (XVideos 429s on hammering)
var THREE_D_WAVE_GAP_MS = 400; // pause between waves

// Every keyword the user named is kept — nothing is skipped. Tier 1 is
// what these sites actually tag 3D content with; Tier 2 is the user's
// own words; Tier 3 is animation/cartoon, because on adult sites 3D
// means animation. Verified live 2026-11-18: every keyword returns
// results on both sites (XV "daz3d" only 2, "vfx" only 2 — kept anyway).
var THREE_D_KEYWORDS = [
  { kw: "3d", tier: 1 },
  { kw: "cgi", tier: 1 },
  { kw: "sfm", tier: 1 },
  { kw: "mmd", tier: 1 },
  { kw: "blender", tier: 1 },
  { kw: "daz3d", tier: 1 },
  { kw: "3d animation", tier: 1 },
  { kw: "3d cartoon", tier: 1 },
  { kw: "3d hentai", tier: 1 },
  { kw: "vfx", tier: 2 },
  { kw: "sfx", tier: 2 },
  { kw: "fx", tier: 2 },
  { kw: "animation", tier: 3 },
  { kw: "cartoon", tier: 3 },
];

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

// The toggle is a provider setting (type "toggle" in settings.ts). The
// app stores it JSON-encoded in kvStore, and kvGet JSON-parses on read,
// so the value arrives as a real boolean — but accept the string forms
// too, in case another app version stores it differently. Missing key
// (never opened settings) means OFF.
export const is3DOn = async function (kvStore) {
  if (!kvStore || typeof kvStore.get !== "function") return false;
  try {
    var raw = await kvStore.get(THREE_D_TOGGLE_KEY);
    return raw === true || raw === 1 || raw === "true" || raw === "1";
  } catch (e) {
    return false;
  }
};

// Canonical link for dedup: same video found by several keywords must
// collapse to one entry. Strip tracking query/fragment, trailing slash,
// and lowercase the host (XVideos/R34 links are stable otherwise).
export function normalizeLink(link) {
  if (!link || typeof link !== "string") return "";
  try {
    var u = new URL(link);
    var path = u.pathname.replace(/\/+$/, "");
    return (u.protocol + "//" + u.host.toLowerCase() + path).toLowerCase();
  } catch (e) {
    return String(link).split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  }
}

// Lowercase, punctuation -> space, collapse whitespace. Both titles and
// match terms go through this, so "Step-Sister", "step_sister" and
// "STEP SISTER" all become "step sister".
export function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Phrase match with word boundaries on normalized text: "sis" matches
// "my sis and me" but not "sissy"; "big sister" matches the phrase.
// BUG FIX (2026-11-18, found by live verification): the end-match used
// to compare lastIndexOf(...) directly with the expected position —
// but lastIndexOf returns -1 when absent, and the expected position is
// ALSO -1 when the term is exactly as long as the title, so every
// same-length title falsely matched ("MMD BB" matched "sister",
// "mother", "father", "family"...). The -1 guard below is load-bearing.
function phraseIn(haystackNorm, termNorm) {
  if (!termNorm) return false;
  if (haystackNorm === termNorm) return true;
  if (haystackNorm.indexOf(termNorm + " ") === 0) return true;
  var endIdx = haystackNorm.lastIndexOf(" " + termNorm);
  if (endIdx !== -1 && endIdx === haystackNorm.length - termNorm.length - 1) return true;
  return haystackNorm.indexOf(" " + termNorm + " ") !== -1;
}

// Each category's match terms are its own search terms from
// categories.config.json (XV queries with "+" as space, R34 tags with
// "_" as space) — the category's definition, reused, not re-invented.
// Family has no terms in the config (it is a plain "family" search),
// so it gets explicit terms here. xvPrimary / r34Primary are the
// category's FIRST search term per site: the sweep fetches that one
// plain category search and intersects it with the pool (Phase 2) —
// the site's own index is the ground truth for what belongs in a
// category, and titles alone are too terse on Rule34Video (its 3D
// titles are often just "3D compilation" with the relation only in
// the tags, which cards never carry).
function buildCategoryTerms() {
  var out = [];
  var categories = (config && config.categories) || [];
  for (var i = 0; i < categories.length; i++) {
    var c = categories[i];
    var terms = [];
    var seen = {};
    var push = function (t) {
      var n = normalizeText(String(t).replace(/\+/g, " "));
      if (n && !seen[n]) {
        seen[n] = true;
        terms.push(n);
      }
      // Plural form of the last word ("mom" -> "moms", "daddy" ->
      // "daddies", "step sister" -> "step sisters"): titles use
      // plurals constantly ("Team RWBY sucking off their Moms"), and
      // word-boundary matching treats "moms" as a different word
      // from "mom", so without the plural the video is missed.
      // Words already ending in "s" ("sis", "stepsis") are skipped.
      var words = n ? n.split(" ") : [];
      if (words.length > 0) {
        var last = words[words.length - 1];
        var plural = null;
        if (last.length >= 3 && last.charAt(last.length - 1) !== "s") {
          if (
            last.charAt(last.length - 1) === "y" &&
            last.length >= 2 &&
            "aeiou".indexOf(last.charAt(last.length - 2)) === -1
          ) {
            plural = last.slice(0, -1) + "ies";
          } else {
            plural = last + "s";
          }
        }
        if (plural) {
          words[words.length - 1] = plural;
          var pn = words.join(" ");
          if (!seen[pn]) {
            seen[pn] = true;
            terms.push(pn);
          }
        }
      }
    };
    (c.xvideosQueries || []).forEach(push);
    (c.rule34Tags || []).forEach(push);
    if (c.filter === "family") {
      push("family");
      push("stepfamily");
      push("step family");
    }
    // The site's own concept tags: "milf" is how Rule34Video tags a
    // mom video (its tag lists carry character names + "milf", almost
    // never a literal "mom"), and "incest"/"family" are the umbrella
    // tags that mark a video as relation content at all.
    if (c.filter === "rel_mom") {
      push("milf");
    }
    if (c.filter === "incest") {
      push("incest");
      push("family");
      push("stepfamily");
      push("step family");
    }
    // The abbreviated forms the user named (bigsis, stepsis, ...):
    // titles use them constantly, and word-boundary matching treats
    // "bigsis" as a different word from "big sister", so each form
    // needs its own term.
    if (c.filter === "rel_sister") {
      push("bigsis");
      push("big sis");
      push("lilsis");
      push("lil sis");
      push("little sis");
      push("step sis");
    }
    if (c.filter === "rel_brother") {
      push("bigbro");
      push("big bro");
      push("lilbro");
      push("lil bro");
      push("little bro");
      push("step bro");
    }
    var xvPrimary =
      c.filter === "family"
        ? "family"
        : (c.xvideosQueries && c.xvideosQueries[0]) || "";
    var r34Primary =
      c.filter === "family"
        ? "family"
        : (c.rule34Tags && c.rule34Tags[0]) || "";
    out.push({
      filter: c.filter,
      title: c.title,
      terms: terms,
      xvPrimary: String(xvPrimary).replace(/\+/g, " "),
      r34Primary: String(r34Primary),
    });
  }
  return out;
}

var CATEGORY_TERMS = buildCategoryTerms();

// First search term of a category on one site ("xvideos" or
// "rule34video"), for the Phase 2 category intersection. "" for
// Homepage (the pool itself) and for categories with no terms.
export function primaryTermFor(filter, site) {
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    if (CATEGORY_TERMS[i].filter !== filter) continue;
    if (site === "xvideos") return CATEGORY_TERMS[i].xvPrimary || "";
    return CATEGORY_TERMS[i].r34Primary || "";
  }
  return "";
}

export function isKnown3DFilter(filter) {
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    if (CATEGORY_TERMS[i].filter === filter) return true;
  }
  return false;
}

function titleMatchesTerms(title, terms) {
  var norm = normalizeText(title);
  if (!norm) return false;
  for (var i = 0; i < terms.length; i++) {
    if (phraseIn(norm, terms[i])) return true;
  }
  return false;
}

// Does this title name this category? (Used by the R34 Phase 2
// filter and by search mode.)
export function matchesCategory(title, filter) {
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    if (CATEGORY_TERMS[i].filter !== filter) continue;
    return titleMatchesTerms(title, CATEGORY_TERMS[i].terms);
  }
  return false;
}

// Which relation categories does this video belong to, from its title
// and/or its tag text? Returns an array of filters (never Homepage).
// The user's rule, implemented directly: a relation word (sister,
// bigsis, stepsis, mom, milf, ...) in the name or the tags puts the
// video in that category, and an incest/family tag marks it as
// relation content — so a video whose tags say "incest" and whose
// title says "sister" is a Sister video, and a video with an
// incest/family tag but no specific relation word belongs to Incest.
// A video matching nothing returns [] (it stays on Homepage).
export function classifyRelation(title, tagText) {
  var titleNorm = normalizeText(title);
  var tagNorm = normalizeText(tagText);
  var out = [];
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    var cat = CATEGORY_TERMS[i];
    if (cat.filter === "homepage") continue;
    if (cat.terms.length === 0) continue;
    var hit = false;
    for (var t = 0; t < cat.terms.length; t++) {
      if (phraseIn(titleNorm, cat.terms[t]) || phraseIn(tagNorm, cat.terms[t])) {
        hit = true;
        break;
      }
    }
    if (hit) out.push(cat.filter);
  }
  return out;
}

// Keep only what the card can carry. The bucket cache stores the pool
// once plus per-category index lists, so a video in three categories is
// stored once, not three times (kvStore values are capped at 1 MB).
function leanPost(post) {
  return {
    title: post.title || "",
    link: post.link || "",
    image: post.image || "",
    tag: post.tag,
    cornerTag: post.cornerTag,
    _dur: post._dur || 0,
  };
}

export function dedupePosts(posts) {
  var seen = {};
  var out = [];
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    if (!p || !p.link) continue;
    var key = normalizeLink(p.link);
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(p);
  }
  return out;
}

// Drop videos under 2 minutes. Duration unknown (_dur 0 — the card had
// no duration element) means KEEP: the user wants nothing missed, and
// an unknown duration is not proof the video is short. (Rule34Video
// already drops <120s while parsing, so this is a no-op there; XVideos
// needs it here.)
export function keepLongEnough(posts) {
  return posts.filter(function (p) {
    var d = (p && p._dur) || 0;
    return d === 0 || d >= 120;
  });
}

// Sort the pool into the 10 categories. Returns { pool, buckets } where
// buckets[filter] is an array of pool indices (cap 120 each). Homepage
// is the whole pool (cap 300); a video matching no category still lives
// on Homepage, so nothing collected is ever lost.
//
// A bucket has two sources, unioned: (1) title matching against the
// category's own terms, and (2) categoryHits — the per-category
// combined-search hits ("<category> 3d" / "<category> sfm") from
// Phase 2 of the sweep. Source (2) is what makes the categories
// work at all: the generic pool is almost all compilations, and its
// titles rarely name the relation (Rule34Video titles almost never
// do — the relation lives in the tags, which cards never carry).
export function bucketize(pool, categoryHits) {
  var buckets = {};
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    buckets[CATEGORY_TERMS[i].filter] = [];
  }
  var poolKeys = {};
  for (var p = 0; p < pool.length; p++) {
    poolKeys[normalizeLink(pool[p].link)] = p;
  }
  // Source (2) first: site-index ground truth.
  if (categoryHits) {
    for (var f in categoryHits) {
      if (!buckets[f]) continue;
      var hits = categoryHits[f] || [];
      for (var h = 0; h < hits.length; h++) {
        var idx = poolKeys[normalizeLink(hits[h].link)];
        if (idx !== undefined && buckets[f].indexOf(idx) === -1 && buckets[f].length < THREE_D_BUCKET_CAP) {
          buckets[f].push(idx);
        }
      }
    }
  }
  // Source (1): title matching.
  for (var p2 = 0; p2 < pool.length; p2++) {
    var post = pool[p2];
    for (var c = 0; c < CATEGORY_TERMS.length; c++) {
      var cat = CATEGORY_TERMS[c];
      if (cat.filter === "homepage") continue;
      if (cat.terms.length === 0) continue;
      if (buckets[cat.filter].length >= THREE_D_BUCKET_CAP) continue;
      if (buckets[cat.filter].indexOf(p2) !== -1) continue;
      if (titleMatchesTerms(post.title, cat.terms)) {
        buckets[cat.filter].push(p2);
      }
    }
  }
  buckets["homepage"] = pool.map(function (_, idx) {
    return idx;
  });
  return { pool: pool, buckets: buckets };
}

export const read3DCache = async function (kvStore) {
  if (!kvStore || typeof kvStore.get !== "function") return null;
  try {
    var raw = await kvStore.get(THREE_D_CACHE_KEY);
    var cached = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!cached || !cached.pool || !cached.buckets) return null;
    if (!cached.expiresAt || cached.expiresAt <= Date.now()) return null;
    return cached;
  } catch (e) {
    return null;
  }
};

export const write3DCache = async function (kvStore, pool, buckets) {
  if (!kvStore || typeof kvStore.set !== "function") return false;
  try {
    var payload = JSON.stringify({
      expiresAt: Date.now() + THREE_D_TTL_MS,
      pool: pool,
      buckets: buckets,
    });
    // 1 MB kvStore cap: the pool is capped at 300 lean posts (~150 KB),
    // so this should never trigger — but never let a cache write throw.
    if (payload.length > 900000) return false;
    await kvStore.set(THREE_D_CACHE_KEY, payload);
    return true;
  } catch (e) {
    return false;
  }
};

// The sweep, in three phases. Phase 1: search every keyword, tier
// order preserved, in small waves so the site does not rate-limit us
// (XVideos answered 429 when 11 searches were fired back-to-back in
// the probe). One failed keyword returns [] and never fails the sweep.
// Phase 2: per-category COMBINED searches — "<category> 3d" and
// "<category> sfm" — fetched through fetchCategory3D(filter, pool).
// This phase is what fills the category buckets: the generic keyword
// pool is almost all compilations and game characters, and a getMeta
// sample (2026-11-18) showed only 3/40 pool videos carry any
// relation tag at all, so title matching and plain-category
// intersection both find ~nothing. The combined search asks the
// site's index for both dimensions at once (category AND 3D).
// Phase 2b: the RELATION pool — fetched through fetchRelationPool()
// (provider-supplied, optional). It searches the incest/family 3D
// searches ("incest 3d", "family 3d", ...) and classifies each hit by
// its relation words (title and tags) via classifyRelation. This is
// the user's rule: most relation videos carry an incest or family
// tag, so the incest/family searches are where the relation videos
// actually are — the plain category combined searches rank generic
// 3D clips first and bury them. Hits with no specific relation word
// land in Incest. Phase 2b runs once per sweep (not once per
// category) and merges into categoryHits.
// The Phase 2/2b hits are appended to the pool (cap 400 total) so the
// buckets can reference them by index. Returns
// { pool, categoryHits } where categoryHits[filter] is the list of
// pool posts that belong to that category.
export const sweep3D = async function (fetchGrid, fetchCategory3D, fetchRelationPool) {
  var pool = [];
  for (var w = 0; w < THREE_D_KEYWORDS.length; w += THREE_D_WAVE_SIZE) {
    var wave = THREE_D_KEYWORDS.slice(w, w + THREE_D_WAVE_SIZE);
    var results = await Promise.all(
      wave.map(function (entry) {
        return Promise.resolve()
          .then(function () {
            return fetchGrid(entry.kw);
          })
          .catch(function () {
            return [];
          });
      })
    );
    for (var i = 0; i < results.length; i++) {
      var list = results[i] || [];
      for (var j = 0; j < list.length; j++) pool.push(list[j]);
    }
    if (w + THREE_D_WAVE_SIZE < THREE_D_KEYWORDS.length) {
      await sleep(THREE_D_WAVE_GAP_MS);
    }
  }
  pool = dedupePosts(pool);
  pool = keepLongEnough(pool);
  pool = pool.slice(0, THREE_D_PHASE1_CAP).map(leanPost);
  var categoryHits = {};
  if (typeof fetchCategory3D === "function" && pool.length > 0) {
    var filters = [];
    for (var c = 0; c < CATEGORY_TERMS.length; c++) {
      if (CATEGORY_TERMS[c].filter !== "homepage") filters.push(CATEGORY_TERMS[c].filter);
    }
    for (var w2 = 0; w2 < filters.length; w2 += THREE_D_WAVE_SIZE) {
      var wave2 = filters.slice(w2, w2 + THREE_D_WAVE_SIZE);
      var catResults = await Promise.all(
        wave2.map(function (filter) {
          return Promise.resolve()
            .then(function () {
              return fetchCategory3D(filter, pool);
            })
            .catch(function () {
              return [];
            });
        })
      );
      for (var k = 0; k < wave2.length; k++) {
        categoryHits[wave2[k]] = dedupePosts(keepLongEnough(catResults[k] || []));
      }
      if (w2 + THREE_D_WAVE_SIZE < filters.length) {
        await sleep(THREE_D_WAVE_GAP_MS);
      }
    }
    // Phase 2b: the relation pool (incest/family 3D searches,
    // classified by relation words). Merged into categoryHits.
    if (typeof fetchRelationPool === "function") {
      try {
        var relationHits = await fetchRelationPool(pool);
        if (relationHits) {
          for (var rf in relationHits) {
            var existing = categoryHits[rf] || [];
            categoryHits[rf] = dedupePosts(
              keepLongEnough(existing.concat(relationHits[rf] || []))
            );
          }
        }
      } catch (e) {
        // A failed relation pool never fails the sweep — Phase 2
        // already filled the buckets with what it found.
      }
    }
    // Append the Phase 2/2b hits to the pool so the buckets (index lists)
    // can point at them. Homepage is the pool, so nothing is lost.
    var poolKeys = {};
    for (var p = 0; p < pool.length; p++) poolKeys[normalizeLink(pool[p].link)] = true;
    for (var f3 in categoryHits) {
      var hits = categoryHits[f3];
      for (var h = 0; h < hits.length; h++) {
        var key = normalizeLink(hits[h].link);
        if (!key || poolKeys[key]) continue;
        if (pool.length >= THREE_D_POOL_CAP) break;
        poolKeys[key] = true;
        pool.push(leanPost(hits[h]));
      }
    }
  }
  return { pool: pool, categoryHits: categoryHits };
};

// Read the cached buckets, or sweep + build + cache them. Returns
// { pool, buckets } or null when there is nothing usable (caller falls
// back to the normal feed — never a black screen).
export const ensure3DPool = async function (ctx) {
  var kvStore = ctx && ctx.kvStore;
  var fetchGrid = ctx && ctx.fetchGrid;
  var fetchCategory3D = ctx && ctx.fetchCategory3D;
  var fetchRelationPool = ctx && ctx.fetchRelationPool;
  if (typeof fetchGrid !== "function") return null;
  try {
    var cached = await read3DCache(kvStore);
    if (cached) return cached;
    var swept = await sweep3D(fetchGrid, fetchCategory3D, fetchRelationPool);
    if (!swept || !swept.pool || swept.pool.length === 0) return null;
    var built = bucketize(swept.pool, swept.categoryHits);
    await write3DCache(kvStore, built.pool, built.buckets);
    return built;
  } catch (e) {
    return null;
  }
};

// Background warm-up for the OFF state: refresh the cache at most once
// an hour, fire-and-forget. The timestamp is set BEFORE the sweep so
// nine simultaneous category loads cannot start nine sweeps. If the
// sandbox cuts the floating promise short, nothing breaks — the next
// toggle-ON call simply sweeps on demand.
export const warm3DInBackground = function (ctx) {
  var kvStore = ctx && ctx.kvStore;
  if (!kvStore || typeof kvStore.get !== "function") return Promise.resolve(false);
  return Promise.resolve()
    .then(function () {
      return kvStore.get(THREE_D_WARM_KEY);
    })
    .catch(function () {
      return 0;
    })
    .then(function (lastWarm) {
      var last = typeof lastWarm === "number" ? lastWarm : parseInt(lastWarm, 10) || 0;
      if (Date.now() - last < THREE_D_WARM_INTERVAL_MS) return false;
      return Promise.resolve()
        .then(function () {
          return kvStore.set(THREE_D_WARM_KEY, Date.now());
        })
        .catch(function () {})
        .then(function () {
          return ensure3DPool(ctx);
        })
        .then(function () {
          return true;
        })
        .catch(function () {
          return false;
        });
    });
};

// One page of one bucket. Page 1 = posts 0-59, page 2 = 60-119, and so
// on; Homepage pages through the whole pool.
export function getBucketPosts(cached, filter, page) {
  if (!cached || !cached.pool || !cached.buckets) return null;
  if (!isKnown3DFilter(filter)) return null;
  var indices = cached.buckets[filter];
  if (!Array.isArray(indices)) return null;
  var pageNum = Math.max(1, page || 1);
  var start = (pageNum - 1) * THREE_D_PAGE_SIZE;
  var slice = indices.slice(start, start + THREE_D_PAGE_SIZE);
  var out = [];
  for (var i = 0; i < slice.length; i++) {
    var post = cached.pool[slice[i]];
    if (post) out.push(post);
  }
  return out;
}

// Search mode (toggle ON): keep the query's results that are also in
// the verified 3D pool. The pool was built by the site's own keyword
// index, so the intersection is exact — no guessing from titles.
export function intersectWithPool(posts, cached) {
  if (!cached || !cached.pool) return posts || [];
  var poolKeys = {};
  for (var i = 0; i < cached.pool.length; i++) {
    poolKeys[normalizeLink(cached.pool[i].link)] = true;
  }
  return (posts || []).filter(function (p) {
    return p && p.link && poolKeys[normalizeLink(p.link)];
  });
}

// Search mode, third leg: when the query itself names a category
// ("sister", "step mom", "aunt"), return that category's bucket. This
// is what makes a plain query return results on Rule34Video, where
// the pool titles rarely name the relation.
export function poolCategorySearch(cached, query) {
  if (!cached || !cached.pool || !cached.buckets) return [];
  var out = [];
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    var cat = CATEGORY_TERMS[i];
    if (cat.filter === "homepage") continue;
    if (cat.terms.length === 0) continue;
    if (!titleMatchesTerms(query, cat.terms)) continue;
    var idxs = cached.buckets[cat.filter] || [];
    for (var j = 0; j < idxs.length; j++) {
      var post = cached.pool[idxs[j]];
      if (post) out.push(post);
    }
  }
  return out;
}

// Search mode, second leg: videos in the verified 3D pool whose title
// names the query. This is what makes a plain query like "sister"
// return the Sister bucket on Rule34Video, where a combined
// "/search/<query>-3d/" does NOT narrow (verified live 2026-11-18: it
// returns the same videos as the plain query). No network — the pool
// is already cached.
export function poolTitleSearch(cached, query) {
  if (!cached || !cached.pool) return [];
  var q = normalizeText(query);
  if (!q) return [];
  return cached.pool.filter(function (p) {
    return p && p.title && phraseIn(normalizeText(p.title), q);
  });
}

// Last-resort title check for search mode when the pool is unavailable:
// keep results whose title names a 3D keyword. Weaker than the pool
// intersection (tags are invisible), but better than showing everything.
export function titleMatchesAnyKeyword(title) {
  var norm = normalizeText(title);
  if (!norm) return false;
  for (var i = 0; i < THREE_D_KEYWORDS.length; i++) {
    if (phraseIn(norm, normalizeText(THREE_D_KEYWORDS[i].kw))) return true;
  }
  return false;
}
