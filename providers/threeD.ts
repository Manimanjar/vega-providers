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
var THREE_D_POOL_CAP = 600; // max videos stored in the cached pool
var THREE_D_PHASE1_CAP = 300; // Phase 1 (generic keywords) leaves room
// for the per-category combined-search hits appended by Phase 2.
var THREE_D_BUCKET_CAP = 120; // max videos per category bucket (2 pages)
var THREE_D_WAVE_SIZE = 5; // keywords fetched per wave (XVideos 429s on hammering)
var THREE_D_WAVE_GAP_MS = 400; // pause between waves

// ---------------------------------------------------------------------------
// Category pool cache — maximum content, nothing skipped (user, 2026-11-18).
//
// The problem it fixes: the old multi_query fetched page N of every
// search term, merged them (~450 videos for a big category), sorted,
// and returned only the first 60. The other ~390 videos of that
// term-page were silently dropped and NEVER appeared on any app page —
// page N+1 fetches a different term-page entirely. So ~87% of each
// term-page was hidden. That is the single biggest content loss in the
// normal feed, and it is what "nothing to skip and miss" means.
//
// The fix: keep the FULL merged pool for a term-page in kvStore (which
// survives sandbox re-evaluation; module memory does not) and serve it
// in 60-video slices across consecutive app pages, so every video is
// eventually shown. A small manifest records each term-page's pool size
// so an app page number maps to the right term-page + offset. Pools
// expire after 1 hour. If kvStore is unavailable the helper falls back
// to the old behaviour (first 60 of the fetched term-page) instead of
// breaking the feed.
// ---------------------------------------------------------------------------
var CAT_POOL_META_KEY = "catPoolMetaV1";
var CAT_POOL_KEY = "catPoolV1";
var CAT_POOL_TTL_MS = 3600000; // 1 hour
var CAT_POOL_PAGE_SIZE = 60;

async function kvGetJson(kvStore, key) {
  try {
    if (!kvStore || typeof kvStore.get !== "function") return null;
    var raw = await kvStore.get(key);
    if (!raw) return null;
    var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null;
  }
}

async function kvSetJson(kvStore, key, value) {
  try {
    if (!kvStore || typeof kvStore.set !== "function") return false;
    await kvStore.set(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

// Fetch (or read from cache) the full merged pool for one term-page of a
// category, and record its size in the manifest. fetchTermPage(tp)
// returns the merged, sorted, deduped posts for term-page tp. Pools are
// stored per (filter, term-page) so going back to an earlier app page
// does not re-fetch; kvStore sets are best-effort (a full store just
// means the next request re-fetches, never a broken feed).
async function getPoolForTermPage(kvStore, filter, tp, fetchTermPage) {
  var now = Date.now();
  var cached = await kvGetJson(kvStore, CAT_POOL_KEY + ":" + filter + ":" + tp);
  if (
    cached &&
    cached.tp === tp &&
    Array.isArray(cached.posts) &&
    cached.ts &&
    now - cached.ts < CAT_POOL_TTL_MS
  ) {
    return cached.posts;
  }
  var posts = (await fetchTermPage(tp)) || [];
  var meta = await kvGetJson(kvStore, CAT_POOL_META_KEY + ":" + filter);
  var sizes = meta && Array.isArray(meta.sizes) ? meta.sizes : [];
  if (!meta || !meta.ts || now - meta.ts > CAT_POOL_TTL_MS) sizes = [];
  while (sizes.length < tp) sizes.push(0);
  sizes[tp - 1] = posts.length;
  await kvSetJson(kvStore, CAT_POOL_META_KEY + ":" + filter, {
    sizes: sizes,
    ts: now,
  });
  await kvSetJson(kvStore, CAT_POOL_KEY + ":" + filter + ":" + tp, {
    tp: tp,
    posts: posts,
    ts: now,
  });
  return posts;
}

// The 60-video slice for app page `page` of a category, drawn from the
// pooled stream of all term-pages so nothing is ever dropped.
// opts: { kvStore, filter, page, fetchTermPage }
export async function getPooledCategoryPage(opts) {
  var kvStore = opts.kvStore;
  var filter = opts.filter;
  var page = Math.max(1, opts.page || 1);
  var fetchTermPage = opts.fetchTermPage;
  var PAGE = CAT_POOL_PAGE_SIZE;
  var globalStart = (page - 1) * PAGE;
  var now = Date.now();
  try {
    var meta = await kvGetJson(kvStore, CAT_POOL_META_KEY + ":" + filter);
    var sizes = meta && Array.isArray(meta.sizes) ? meta.sizes : [];
    if (!meta || !meta.ts || now - meta.ts > CAT_POOL_TTL_MS) sizes = [];
    // Map the global index to (term-page, offset) using the manifest.
    // Term-pages not yet fetched have size 0 in the manifest; if the
    // index lands beyond every fetched pool, the next term-page is
    // fetched below and the manifest fills in.
    var acc = 0;
    var tp = 1;
    var offset = globalStart;
    var found = false;
    for (var i = 0; i < sizes.length; i++) {
      if (globalStart < acc + sizes[i]) {
        tp = i + 1;
        offset = globalStart - acc;
        found = true;
        break;
      }
      acc += sizes[i];
    }
    if (!found) {
      tp = sizes.length + 1;
      offset = globalStart - acc;
    }
    // A 60-video slice can straddle two term-pages (e.g. the last 30
    // of tp1 plus the first 30 of tp2), so accumulate across term-pages
    // until the page is full or the stream runs out.
    var result = [];
    var remaining = PAGE;
    var curTp = tp;
    var curOffset = offset;
    var guard = 0;
    while (remaining > 0 && guard < 20) {
      guard++;
      var pool = await getPoolForTermPage(kvStore, filter, curTp, fetchTermPage);
      if (!pool || pool.length === 0) break;
      if (curOffset >= pool.length) {
        curOffset -= pool.length;
        curTp++;
        continue;
      }
      var take = pool.slice(curOffset, curOffset + remaining);
      for (var k = 0; k < take.length; k++) result.push(take[k]);
      remaining -= take.length;
      curOffset += take.length;
      if (curOffset >= pool.length) {
        curTp++;
        curOffset = 0;
      } else {
        break;
      }
    }
    return result;
  } catch (e) {
    // kvStore trouble: fall back to the old behaviour (first 60 of the
    // fetched term-page) rather than breaking the feed.
    var fallback = (await fetchTermPage(Math.max(1, page))) || [];
    return fallback.slice(0, PAGE);
  }
}

// ---- Search pool cache (user, 2026-11-18: "only page 1 search results
// are shown") ----
// ROOT CAUSE (proven live 2026-11-18): in 3D mode, getSearchPosts built
// its result from poolTitleSearch + poolCategorySearch, which return the
// SAME full set of matching pool videos on every app page, then sliced
// it to the first 60 — so app pages 1, 2 and 3 were the same videos
// (XVideos "sister": 174 posts across 3 pages but only 72 unique, 102
// dupes; Rule34Video "sister": 111 posts but only 37 unique, 74 dupes).
// The user scrolled and kept seeing page 1 again.
// FIX: a search is now a POOL, like the category pool above. One kvStore
// entry per normalized query holds every video fetched so far (3D pool
// matches first, then site search pages in the site's own order,
// deduped), and each app page serves a different 60-video slice of it.
// Site pages are fetched LAZILY — only as many as the requested slice
// needs — so a search for a rare keyword stays fast, and scrolling
// deeper keeps fetching further site pages until the site runs out or
// the pool-size cap (2000 videos, ~33 app pages) is hit. Nothing is
// ever shown twice, and every site page is eventually reachable.
// kvStore trouble falls back to the old behaviour (just the requested
// site page) instead of breaking the search.
var SEARCH_POOL_KEY = "searchPoolV1";
var SEARCH_POOL_TTL_MS = 3600000; // 1 hour
var SEARCH_POOL_PAGE_SIZE = 60;
// Pool-size cap, NOT a page cap (user, 2026-11-18): a search must fetch
// ALL of its pages and dedupe across the full set, not just the first
// few pages. The old SEARCH_MAX_SITE_PAGES = 10 stopped at ~240 videos,
// so a search with many pages never showed the rest. Now the pool keeps
// fetching further site pages as the user scrolls until the site runs
// out — capped only by pool size, so the stored pool stays inside the
// kvStore 1MB limit (a post is ~300 bytes JSON; 2000 posts ≈ 600KB).
// 2000 videos is ~33 app pages of scrolling.
var SEARCH_MAX_POOL_POSTS = 2000;

// opts: { kvStore, query, page, fetchSitePage, extraPosts }
// query is the NORMALIZED search string (lowercase, single spaces) and
// is the pool's key. fetchSitePage(sp) returns the parsed posts for
// site search page sp (1-based), already filtered for the current mode
// (3D intersection included). extraPosts are the 3D pool matches for
// the query (same on every call); [] in normal mode.
export async function getPooledSearchPage(opts) {
  var kvStore = opts.kvStore;
  var query = opts.query || "";
  var page = Math.max(1, opts.page || 1);
  var fetchSitePage = opts.fetchSitePage;
  var extraPosts = opts.extraPosts || [];
  var PAGE = SEARCH_POOL_PAGE_SIZE;
  var now = Date.now();
  var key = SEARCH_POOL_KEY + ":" + query;
  try {
    var cached = await kvGetJson(kvStore, key);
    var pool = [];
    var fetchedPages = 0;
    // nextStart is the global index where the next FORWARD page must
    // begin. It is what makes the slices gap-proof: if an early page
    // was served short (the pool was thin because a site page 502'd),
    // the next forward page starts where the last one ENDED, not at
    // its fixed (page-1)*60 index — otherwise the videos between the
    // short slice's end and the fixed index would never be shown.
    // Backward requests (re-opening an earlier page) use their fixed
    // slice, because that content was already served and is stable.
    var nextStart = 0;
    if (
      cached &&
      Array.isArray(cached.posts) &&
      cached.ts &&
      now - cached.ts < SEARCH_POOL_TTL_MS
    ) {
      pool = cached.posts;
      fetchedPages = cached.fetchedPages || 0;
      nextStart = cached.nextStart || 0;
    }
    // 3D pool matches go first (verified 3D, most relevant in 3D mode)
    // and are merged on every call — dedupe keeps them to one copy.
    if (extraPosts.length > 0) {
      pool = dedupePosts(extraPosts.concat(pool));
    }
    // Fetch more site pages until the pool covers the requested slice.
    // Site pages arrive in the site's own order and are appended, so
    // the stream order is stable across calls and pages never overlap.
    // The pool is NOT capped by site pages: it keeps fetching further
    // site pages as the user scrolls deeper, until the site genuinely
    // runs out (5 empty pages in a row) or the pool-size cap is hit.
    // Every video fetched is deduped against the WHOLE pool, so a
    // video that appears on site page 1 and again on site page 15 is
    // shown once. A site page can come back empty for a TRANSIENT
    // reason (XVideos 429 rate-limit, Rule34Video 502) as well as
    // because the site is genuinely out of results — so an empty page
    // is RETRIED once (after a short pause, which usually clears a
    // 429/502) and only then counted as empty, and only 5 empty pages
    // in a row end the fetch. A single failed page must never strand
    // the user on a short or empty app page while further site pages
    // still hold content.
    var emptyStreak = 0;
    // The fetch target is the END of the slice we are about to serve
    // (which may be nextStart+60 for a forward page, not page*60).
    var wantEnd = Math.max(page * PAGE, nextStart + PAGE);
    while (pool.length < wantEnd && pool.length < SEARCH_MAX_POOL_POSTS) {
      var sp = fetchedPages + 1;
      var pagePosts = [];
      try {
        pagePosts = (await fetchSitePage(sp)) || [];
      } catch (e) {
        pagePosts = [];
      }
      if (pagePosts.length === 0) {
        // One retry after a pause: a 429/502 is usually gone by then.
        try {
          await new Promise(function (r) {
            setTimeout(r, 1200);
          });
          pagePosts = (await fetchSitePage(sp)) || [];
        } catch (e) {
          pagePosts = [];
        }
      }
      fetchedPages = sp;
      if (pagePosts.length === 0) {
        emptyStreak++;
        if (emptyStreak >= 5) break;
        continue;
      }
      emptyStreak = 0;
      var before = pool.length;
      pool = dedupePosts(pool.concat(pagePosts));
      // Nothing new: the site is repeating itself (or every video on
      // the page was already in the pool) — stop instead of looping.
      if (pool.length === before) break;
    }
    // Serve the slice. pageStarts/pageEnds record the exact global
    // range each app page served, so re-opening a page returns the
    // SAME videos it showed the first time — even if the pool has
    // grown since (a re-request must not suddenly serve 60 videos
    // when it first served 30, or those extra videos would duplicate
    // the next page). A page served for the first time starts at
    // nextStart — the end of the last forward slice — so a short early
    // page can never strand videos in a gap: the next page continues
    // exactly where the last one ended instead of jumping to its
    // fixed (page-1)*60 index.
    var pageStarts = cached && cached.pageStarts ? cached.pageStarts : {};
    var pageEnds = cached && cached.pageEnds ? cached.pageEnds : {};
    var isFirstServe =
      pageStarts[page] === undefined || pageStarts[page] === null;
    var start;
    var end;
    if (isFirstServe) {
      start = nextStart;
      end = start + PAGE;
      pageStarts[page] = start;
    } else {
      start = pageStarts[page];
      end = pageEnds[page] !== undefined && pageEnds[page] !== null
        ? pageEnds[page]
        : start + PAGE;
    }
    var slice = pool.slice(start, end);
    // Only a first serve advances nextStart and records its end; a
    // re-request must not move either, or later pages would shift.
    if (isFirstServe && slice.length > 0) {
      pageEnds[page] = start + slice.length;
      if (start + slice.length > nextStart) {
        nextStart = start + slice.length;
      }
    }
    await kvSetJson(kvStore, key, {
      posts: pool,
      fetchedPages: fetchedPages,
      nextStart: nextStart,
      pageStarts: pageStarts,
      pageEnds: pageEnds,
      ts: now,
    });
    return slice;
  } catch (e) {
    // kvStore trouble: fall back to the old behaviour (just the
    // requested site page) rather than breaking the search.
    var fallback = (await fetchSitePage(page)) || [];
    return fallback.slice(0, PAGE);
  }
}

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
      // Cousin (user, 2026-11-18): cousin videos belong to Sister —
      // "cousin", "cousin sis", "cousin sister", "cousin stepsis",
      // "cousin step sister". The bare word "cousin" is a Sister
      // term; the cousin rule in matchesRelationWords stops a
      // "cousin brother" video landing in Sister as well.
      push("cousin");
      push("cousin sis");
      push("cousin sister");
      push("cousin stepsis");
      push("cousin step sister");
      push("cousin stepsister");
      push("cousin step sis");
    }
    if (c.filter === "rel_brother") {
      push("bigbro");
      push("big bro");
      push("lilbro");
      push("lil bro");
      push("little bro");
      push("step bro");
      push("cousin brother");
      push("cousin bro");
      push("cousin stepbrother");
      push("cousin step brother");
      push("cousin stepbro");
      push("cousin step bro");
    }
    if (c.filter === "rel_mom") {
      push("cousin mom");
      push("cousin mother");
      push("cousin stepmom");
      push("cousin stepmother");
    }
    if (c.filter === "rel_daughter") {
      push("cousin daughter");
      push("cousin stepdaughter");
    }
    if (c.filter === "rel_father") {
      push("cousin dad");
      push("cousin father");
      push("cousin stepdad");
      push("cousin stepfather");
      push("cousin daddy");
    }
    if (c.filter === "rel_aunt") {
      push("cousin aunt");
      push("cousin auntie");
      push("cousin aunty");
      push("cousin stepaunt");
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

// Cousin rule (user, 2026-11-18): the bare word "cousin" belongs to
// Sister, but a cousin phrase naming another relation ("cousin
// brother", "cousin bro", "cousin dad", "cousin mom", ...) belongs to
// THAT relation — a "cousin brother" video must not also land in
// Sister just because it contains the word "cousin". These phrases
// are the ones that disambiguate a bare "cousin" match.
var COUSIN_OTHER_PHRASES = [
  "cousin brother", "cousin bro", "cousin stepbrother",
  "cousin step brother", "cousin stepbro", "cousin step bro",
  "cousin dad", "cousin father", "cousin stepdad",
  "cousin stepfather", "cousin daddy",
  "cousin mom", "cousin mother", "cousin stepmom", "cousin stepmother",
  "cousin daughter", "cousin stepdaughter",
  "cousin aunt", "cousin auntie", "cousin aunty", "cousin stepaunt",
  "cousin uncle", "cousin nephew", "cousin niece", "cousin son",
];

export function hasCousinOtherPhrase(text) {
  var norm = normalizeText(text);
  if (!norm) return false;
  for (var i = 0; i < COUSIN_OTHER_PHRASES.length; i++) {
    if (phraseIn(norm, COUSIN_OTHER_PHRASES[i])) return true;
  }
  return false;
}

// Word-boundary match of a free-text string against a category's word
// list, with the cousin rule applied: when the filter is Sister and
// the text names a cousin of another relation, the bare word "cousin"
// does not count for Sister. Shared by the engine and by
// Rule34Video's own word lists (posts.ts imports it), so the rule is
// identical on both sites.
export function matchesRelationWords(text, words, filter) {
  var norm = normalizeText(text);
  if (!norm) return false;
  var skipBareCousin = filter === "rel_sister" && hasCousinOtherPhrase(norm);
  for (var i = 0; i < words.length; i++) {
    var term = normalizeText(words[i]);
    if (!term) continue;
    if (skipBareCousin && term === "cousin") continue;
    if (phraseIn(norm, term)) return true;
  }
  return false;
}

// Search terms for one category on one site, for the Phase 2 combined
// searches ("<term> 3d" / "<term> sfm"). The user wants each category
// searched by MULTIPLE similar words, not just the first one — so
// this returns the first `maxN` terms of the category's own list
// (reordered in the config so the most distinct terms come first:
// the plain word, the step- form, then the cousin form). Default 3:
// more terms mostly re-find the same videos, and each extra term
// costs a site search in the sweep.
export function searchTermsFor(filter, site, maxN) {
  var n = maxN || 3;
  var categories = (config && config.categories) || [];
  for (var i = 0; i < categories.length; i++) {
    var c = categories[i];
    if (c.filter !== filter) continue;
    var raw = site === "xvideos" ? c.xvideosQueries || [] : c.rule34Tags || [];
    var out = [];
    var seen = {};
    for (var j = 0; j < raw.length && out.length < n; j++) {
      var t = String(raw[j] || "").replace(/\+/g, " ").trim();
      if (!t) continue;
      var key = t.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(t);
    }
    return out;
  }
  return [];
}

function titleMatchesTerms(title, terms, filter) {
  var norm = normalizeText(title);
  if (!norm) return false;
  var skipBareCousin = filter === "rel_sister" && hasCousinOtherPhrase(norm);
  for (var i = 0; i < terms.length; i++) {
    var term = terms[i];
    if (skipBareCousin && term === "cousin") continue;
    if (phraseIn(norm, term)) return true;
  }
  return false;
}

// Does this title name this category? (Used by the R34 Phase 2
// filter and by search mode.)
export function matchesCategory(title, filter) {
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    if (CATEGORY_TERMS[i].filter !== filter) continue;
    return titleMatchesTerms(title, CATEGORY_TERMS[i].terms, filter);
  }
  return false;
}

// Which relation categories does this video belong to, from its title
// and/or its tag text? Returns an array of filters (never Homepage).
// The user's rule, implemented directly: a relation word (sister,
// bigsis, stepsis, mom, milf, cousin, cousin brother, ...) in the
// name or the tags puts the video in that category, and an
// incest/family tag marks it as relation content — so a video whose
// tags say "incest" and whose title says "sister" is a Sister video,
// and a video with an incest/family tag but no specific relation word
// belongs to Incest. A video matching nothing returns [] (it stays
// on Homepage).
export function classifyRelation(title, tagText) {
  var out = [];
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    var cat = CATEGORY_TERMS[i];
    if (cat.filter === "homepage") continue;
    if (cat.terms.length === 0) continue;
    if (
      matchesRelationWords(title, cat.terms, cat.filter) ||
      matchesRelationWords(tagText, cat.terms, cat.filter)
    ) {
      out.push(cat.filter);
    }
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
      if (titleMatchesTerms(post.title, cat.terms, cat.filter)) {
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
    // 1 MB kvStore cap: the pool is capped at 600 lean posts (~300 KB),
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
    // The appends are INTERLEAVED round-robin across categories: the
    // old code appended category by category in config order, so when
    // the pool filled up the later categories (Brother, Mom, ...)
    // lost their hits entirely while Family/Incest/Sister kept
    // everything. Round-robin gives every category a fair share of
    // the remaining slots, so no category is silently starved.
    var poolKeys = {};
    for (var p = 0; p < pool.length; p++) poolKeys[normalizeLink(pool[p].link)] = true;
    var hitLists = [];
    for (var f3 in categoryHits) {
      var dedupedHits = [];
      var hitSeen = {};
      (categoryHits[f3] || []).forEach(function (h) {
        var k = normalizeLink(h.link);
        if (!k || hitSeen[k] || poolKeys[k]) return;
        hitSeen[k] = true;
        dedupedHits.push(h);
      });
      if (dedupedHits.length > 0) hitLists.push(dedupedHits);
    }
    var maxHits = 0;
    for (var hl = 0; hl < hitLists.length; hl++) maxHits = Math.max(maxHits, hitLists[hl].length);
    for (var hi = 0; hi < maxHits && pool.length < THREE_D_POOL_CAP; hi++) {
      for (var hj = 0; hj < hitLists.length && pool.length < THREE_D_POOL_CAP; hj++) {
        var hit = hitLists[hj][hi];
        if (!hit) continue;
        var key = normalizeLink(hit.link);
        if (!key || poolKeys[key]) continue;
        poolKeys[key] = true;
        pool.push(leanPost(hit));
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
    if (!titleMatchesTerms(query, cat.terms, cat.filter)) continue;
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
