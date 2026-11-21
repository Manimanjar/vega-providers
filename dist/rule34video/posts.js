// @vega-provider rule34video
// @vega-version 2.4.0
"use strict";
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

// providers/rule34video/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts,
  upgradeRule34ImageUrl: () => upgradeRule34ImageUrl
});
module.exports = __toCommonJS(posts_exports);

// providers/categories.config.json
var categories_config_default = {
  categories: [
    {
      filter: "homepage",
      mode: "random_feed",
      rule34Tags: [],
      title: "Homepage",
      xvideosQueries: []
    },
    {
      filter: "family",
      mode: "keep_existing",
      rule34Tags: [
        "family",
        "stepfamily",
        "step_family"
      ],
      title: "Family",
      xvideosQueries: [
        "family",
        "stepfamily",
        "step+family"
      ]
    },
    {
      filter: "incest",
      mode: "multi_query",
      rule34Tags: [
        "incest",
        "family",
        "taboo"
      ],
      title: "Incest",
      xvideosQueries: [
        "taboo",
        "stepfamily",
        "taboo+family"
      ]
    },
    {
      filter: "rel_sister",
      mode: "multi_query",
      rule34Tags: [
        "sister",
        "stepsister",
        "cousin",
        "sis",
        "stepsis",
        "older_sister",
        "younger_sister",
        "twin_sister",
        "cousin_sister",
        "cousin_sis",
        "step_sister",
        "sisters",
        "stepsisters",
        "cousins",
        "sister-in-law",
        "step_sister_in_law"
      ],
      title: "Sister",
      xvideosQueries: [
        "sister",
        "stepsister",
        "cousin",
        "stepsis",
        "sis",
        "big+sister",
        "little+sister",
        "twin+sister",
        "cousin+sis",
        "cousin+sister",
        "cousin+stepsis",
        "cousin+step+sister",
        "step+sister",
        "sisters",
        "stepsisters",
        "cousins",
        "sister+in+law",
        "step+sister+in+law"
      ]
    },
    {
      filter: "rel_brother",
      mode: "multi_query",
      rule34Tags: [
        "brother",
        "stepbrother",
        "cousin_brother",
        "bro",
        "stepbro",
        "older_brother",
        "younger_brother",
        "cousin_bro",
        "step_brother",
        "brother-in-law",
        "brothers",
        "stepbrothers"
      ],
      title: "Brother",
      xvideosQueries: [
        "brother",
        "stepbrother",
        "cousin+brother",
        "stepbro",
        "bro",
        "big+brother",
        "younger+brother",
        "cousin+bro",
        "cousin+stepbrother",
        "step+brother",
        "brother+in+law",
        "brothers",
        "stepbrothers"
      ]
    },
    {
      filter: "rel_mom",
      mode: "multi_query",
      rule34Tags: [
        "mother",
        "mom",
        "stepmother",
        "stepmom",
        "mommy",
        "mother_and_son",
        "cousin_mom",
        "cousin_mother",
        "step_mother",
        "step_mom",
        "mother-in-law",
        "moms",
        "mothers",
        "stepmoms",
        "stepmothers"
      ],
      title: "Mom",
      xvideosQueries: [
        "mom",
        "mother",
        "stepmom",
        "stepmother",
        "mommy",
        "mama",
        "cousin+mom",
        "cousin+mother",
        "step+mother",
        "step+mom",
        "mother+in+law",
        "moms",
        "mothers",
        "stepmoms",
        "stepmothers",
        "maa"
      ]
    },
    {
      filter: "rel_daughter",
      mode: "multi_query",
      rule34Tags: [
        "daughter",
        "stepdaughter",
        "father_and_daughter",
        "mother_and_daughter",
        "cousin_daughter",
        "step_daughter",
        "daughter-in-law",
        "in_laws",
        "in_law",
        "daughters",
        "stepdaughters",
        "granddaughter",
        "granddaughters"
      ],
      title: "Daughter",
      xvideosQueries: [
        "daughter",
        "stepdaughter",
        "daddy+daughter",
        "cousin+daughter",
        "step+daughter",
        "daughter+in+law",
        "in+laws",
        "in+law",
        "daughters",
        "stepdaughters",
        "granddaughter",
        "granddaughters"
      ]
    },
    {
      filter: "rel_father",
      mode: "multi_query",
      rule34Tags: [
        "father",
        "dad",
        "stepfather",
        "stepdad",
        "daddy",
        "cousin_dad",
        "cousin_father",
        "step_father",
        "father-in-law",
        "fathers",
        "stepfathers",
        "papa"
      ],
      title: "Father",
      xvideosQueries: [
        "father",
        "dad",
        "stepdad",
        "stepfather",
        "daddy",
        "cousin+dad",
        "cousin+father",
        "step+father",
        "father+in+law",
        "fathers",
        "stepfathers",
        "papa",
        "paa"
      ]
    },
    {
      filter: "rel_aunt",
      mode: "multi_query",
      rule34Tags: [
        "aunt",
        "auntie",
        "aunty",
        "stepaunt",
        "aunt_and_nephew",
        "cousin_aunt",
        "cousin_auntie",
        "step_aunt",
        "aunts"
      ],
      title: "Aunt",
      xvideosQueries: [
        "aunt",
        "auntie",
        "aunty",
        "stepaunt",
        "cousin+aunt",
        "cousin+auntie",
        "step+aunt",
        "aunts",
        "stepaunts"
      ]
    },
    {
      filter: "rel_grandma",
      mode: "multi_query",
      rule34Tags: [
        "grandma",
        "grandmother",
        "granny",
        "grand_mother",
        "grannies",
        "grandmothers",
        "grandmas",
        "step_grandma"
      ],
      title: "Grandma",
      xvideosQueries: [
        "grandma",
        "grandmother",
        "granny",
        "grand+mother",
        "grannies",
        "grandmama",
        "grandmothers",
        "grandmas",
        "step+grandma"
      ]
    },
    {
      filter: "rel_grandpa",
      mode: "multi_query",
      rule34Tags: [
        "grandpa",
        "grandfather",
        "grand_father",
        "grandpas",
        "grandfathers",
        "step_grandpa"
      ],
      title: "Grandpa",
      xvideosQueries: [
        "grandpa",
        "grandfather",
        "grand+father",
        "grandad",
        "grandpapa",
        "grandpas",
        "grandfathers",
        "step+grandpa"
      ]
    },
    {
      filter: "rel_son",
      mode: "multi_query",
      rule34Tags: [
        "son",
        "stepson",
        "step_son",
        "sons",
        "stepsons",
        "grandson",
        "grandsons"
      ],
      title: "Son",
      xvideosQueries: [
        "son",
        "stepson",
        "step+son",
        "sons",
        "stepsons",
        "grandson",
        "grandsons"
      ]
    },
    {
      filter: "rel_other",
      mode: "multi_query",
      rule34Tags: [
        "uncle",
        "niece",
        "nephew",
        "uncles",
        "nieces",
        "nephews",
        "step_uncle",
        "step_nephew",
        "step_niece"
      ],
      title: "Other",
      xvideosQueries: [
        "uncle",
        "niece",
        "nephew",
        "uncles",
        "nieces",
        "nephews",
        "step+uncle",
        "step+nephew",
        "step+niece",
        "grandparent"
      ]
    }
  ]
};

// providers/threeD.ts
var THREE_D_TOGGLE_KEY = "only3D";
var CAT_POOL_META_KEY = "catPoolMetaV1";
var CAT_POOL_KEY = "catPoolV1";
var CAT_POOL_TTL_MS = 36e5;
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
var POOL_CHUNK_SIZE = 500;
async function readChunkedPool(kvStore, baseKey) {
  var meta = await kvGetJson(kvStore, baseKey);
  if (!meta || typeof meta !== "object") return null;
  var chunkCount = typeof meta.chunkCount === "number" ? meta.chunkCount : 0;
  var posts = [];
  for (var i = 0; i < chunkCount; i++) {
    var chunk = await kvGetJson(kvStore, baseKey + ":c" + i);
    if (chunk && Array.isArray(chunk.posts)) {
      for (var j = 0; j < chunk.posts.length; j++) {
        posts.push(chunk.posts[j]);
      }
    }
  }
  return { meta, posts };
}
async function writeChunkedPool(kvStore, baseKey, posts, meta) {
  var chunkCount = Math.ceil(posts.length / POOL_CHUNK_SIZE);
  for (var i = 0; i < chunkCount; i++) {
    var slice = posts.slice(i * POOL_CHUNK_SIZE, (i + 1) * POOL_CHUNK_SIZE);
    var ok = await kvSetJson(kvStore, baseKey + ":c" + i, { posts: slice });
    if (!ok) return false;
  }
  var fullMeta = {};
  for (var k in meta) fullMeta[k] = meta[k];
  fullMeta.chunkCount = chunkCount;
  return await kvSetJson(kvStore, baseKey, fullMeta);
}
async function getPoolForTermPage(kvStore, filter, tp, fetchTermPage) {
  var now = Date.now();
  var cached = await kvGetJson(kvStore, CAT_POOL_KEY + ":" + filter + ":" + tp);
  if (cached && cached.tp === tp && Array.isArray(cached.posts) && cached.ts && now - cached.ts < CAT_POOL_TTL_MS) {
    return cached.posts;
  }
  var posts = await fetchTermPage(tp) || [];
  var meta = await kvGetJson(kvStore, CAT_POOL_META_KEY + ":" + filter);
  var sizes = meta && Array.isArray(meta.sizes) ? meta.sizes : [];
  if (!meta || !meta.ts || now - meta.ts > CAT_POOL_TTL_MS) sizes = [];
  while (sizes.length < tp) sizes.push(0);
  sizes[tp - 1] = posts.length;
  await kvSetJson(kvStore, CAT_POOL_META_KEY + ":" + filter, {
    sizes,
    ts: now
  });
  await kvSetJson(kvStore, CAT_POOL_KEY + ":" + filter + ":" + tp, {
    tp,
    posts,
    ts: now
  });
  return posts;
}
async function getPooledCategoryPage(opts) {
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
    var fallback = await fetchTermPage(Math.max(1, page)) || [];
    return fallback.slice(0, PAGE);
  }
}
var SEARCH_POOL_KEY = "searchPoolV1";
var SEARCH_POOL_TTL_MS = 36e5;
var SEARCH_POOL_PAGE_SIZE = 60;
async function getPooledSearchPage(opts) {
  var kvStore = opts.kvStore;
  var query = opts.query || "";
  var page = Math.max(1, opts.page || 1);
  var fetchSitePage = opts.fetchSitePage;
  var fetchTermPage = opts.fetchTermPage;
  var terms = opts.terms;
  var extraPosts = opts.extraPosts || [];
  var PAGE = SEARCH_POOL_PAGE_SIZE;
  var now = Date.now();
  var key = SEARCH_POOL_KEY + ":" + query;
  try {
    var loaded = await readChunkedPool(kvStore, key);
    var cached = null;
    var pool = [];
    var fetchedPages = 0;
    var curTermIdx = 0;
    var curTermPage = 1;
    var nextStart = 0;
    if (loaded && loaded.meta && loaded.meta.ts && now - loaded.meta.ts < SEARCH_POOL_TTL_MS && Array.isArray(loaded.posts)) {
      cached = loaded.meta;
      pool = loaded.posts;
      fetchedPages = loaded.meta.fetchedPages || 0;
      curTermIdx = typeof loaded.meta.curTermIdx === "number" ? loaded.meta.curTermIdx : 0;
      curTermPage = typeof loaded.meta.curTermPage === "number" ? loaded.meta.curTermPage : 1;
      nextStart = loaded.meta.nextStart || 0;
    }
    if (extraPosts.length > 0) {
      pool = dedupePosts(extraPosts.concat(pool));
    }
    var wantEnd = Math.max(page * PAGE, nextStart + PAGE);
    if (Array.isArray(terms) && terms.length > 0 && typeof fetchTermPage === "function") {
      var emptyStreak = 0;
      var dupStreak = 0;
      while (pool.length < wantEnd && curTermIdx < terms.length) {
        var currentTerm = terms[curTermIdx];
        var pagePosts = [];
        try {
          pagePosts = await fetchTermPage(currentTerm, curTermPage) || [];
        } catch (e) {
          pagePosts = [];
        }
        if (pagePosts.length === 0) {
          try {
            await new Promise(function(r) {
              setTimeout(r, 1e3);
            });
            pagePosts = await fetchTermPage(currentTerm, curTermPage) || [];
          } catch (e) {
            pagePosts = [];
          }
        }
        if (pagePosts.length === 0) {
          emptyStreak++;
          if (emptyStreak >= 2) {
            emptyStreak = 0;
            curTermIdx++;
            curTermPage = 1;
            dupStreak = 0;
            continue;
          } else {
            curTermPage++;
            continue;
          }
        }
        emptyStreak = 0;
        var before = pool.length;
        pool = dedupePosts(pool.concat(pagePosts));
        curTermPage++;
        if (pool.length === before) {
          dupStreak++;
          if (dupStreak >= 15) {
            dupStreak = 0;
            curTermIdx++;
            curTermPage = 1;
          }
        } else {
          dupStreak = 0;
        }
      }
    } else if (typeof fetchSitePage === "function") {
      var emptyStreak = 0;
      var dupStreak = 0;
      while (pool.length < wantEnd) {
        var sp = fetchedPages + 1;
        var pagePosts = [];
        try {
          pagePosts = await fetchSitePage(sp) || [];
        } catch (e) {
          pagePosts = [];
        }
        if (pagePosts.length === 0) {
          try {
            await new Promise(function(r) {
              setTimeout(r, 1200);
            });
            pagePosts = await fetchSitePage(sp) || [];
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
        if (pool.length === before) {
          dupStreak++;
          if (dupStreak >= 15) break;
        } else {
          dupStreak = 0;
        }
      }
    }
    var pageStarts = cached && cached.pageStarts ? cached.pageStarts : {};
    var pageEnds = cached && cached.pageEnds ? cached.pageEnds : {};
    var isFirstServe = pageStarts[page] === void 0 || pageStarts[page] === null;
    var start;
    var end;
    if (isFirstServe) {
      start = nextStart;
      end = start + PAGE;
      pageStarts[page] = start;
    } else {
      start = pageStarts[page];
      end = pageEnds[page] !== void 0 && pageEnds[page] !== null ? pageEnds[page] : start + PAGE;
    }
    var slice = pool.slice(start, end);
    if (isFirstServe && slice.length > 0) {
      pageEnds[page] = start + slice.length;
      if (start + slice.length > nextStart) {
        nextStart = start + slice.length;
      }
    }
    await writeChunkedPool(kvStore, key, pool, {
      fetchedPages,
      curTermIdx,
      curTermPage,
      nextStart,
      pageStarts,
      pageEnds,
      ts: now
    });
    return slice;
  } catch (e) {
    if (typeof fetchSitePage === "function") {
      var fallback = await fetchSitePage(page) || [];
      return fallback.slice(0, PAGE);
    }
    return [];
  }
}
var THREE_D_KEYWORDS = [
  { kw: "3d", tier: 1 },
  { kw: "animation", tier: 1 },
  { kw: "gameplay", tier: 1 },
  { kw: "walkthrough", tier: 1 },
  { kw: "cg", tier: 1 },
  { kw: "cgi", tier: 1 },
  { kw: "sfm", tier: 1 },
  { kw: "mmd", tier: 1 },
  { kw: "blender", tier: 1 },
  { kw: "daz3d", tier: 1 },
  { kw: "vfx", tier: 2 },
  { kw: "sfx", tier: 2 },
  { kw: "fx", tier: 2 },
  { kw: "3d animation", tier: 1 },
  { kw: "3d cartoon", tier: 1 },
  { kw: "3d hentai", tier: 1 },
  { kw: "cartoon", tier: 3 }
];
var THREE_D_KEYWORD_STRINGS = THREE_D_KEYWORDS.map(function(k) {
  return k.kw;
});
var is3DOn = async function(kvStore) {
  if (!kvStore || typeof kvStore.get !== "function") return false;
  try {
    var raw = await kvStore.get(THREE_D_TOGGLE_KEY);
    return raw === true || raw === 1 || raw === "true" || raw === "1";
  } catch (e) {
    return false;
  }
};
function normalizeLink(link) {
  if (!link || typeof link !== "string") return "";
  try {
    var u = new URL(link);
    var path = u.pathname.replace(/\/+$/, "");
    return (u.protocol + "//" + u.host.toLowerCase() + path + u.search).toLowerCase();
  } catch (e) {
    return String(link).split("#")[0].replace(/\/+$/, "").toLowerCase();
  }
}
function normalizeText(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function buildCategoryTerms() {
  var out = [];
  var categories = categories_config_default && categories_config_default.categories || [];
  for (var i = 0; i < categories.length; i++) {
    var c = categories[i];
    var terms = [];
    var seen = {};
    var push = function(t) {
      var n = normalizeText(String(t).replace(/\+/g, " "));
      if (n && !seen[n]) {
        seen[n] = true;
        terms.push(n);
      }
      var words = n ? n.split(" ") : [];
      if (words.length > 0) {
        var last = words[words.length - 1];
        var plural = null;
        if (last.length >= 3 && last.charAt(last.length - 1) !== "s") {
          if (last.charAt(last.length - 1) === "y" && last.length >= 2 && "aeiou".indexOf(last.charAt(last.length - 2)) === -1) {
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
    if (c.filter === "rel_mom") {
      push("milf");
    }
    if (c.filter === "incest") {
      push("incest");
      push("family");
      push("stepfamily");
      push("step family");
    }
    if (c.filter === "rel_sister") {
      push("bigsis");
      push("big sis");
      push("lilsis");
      push("lil sis");
      push("little sis");
      push("step sis");
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
    var xvPrimary = c.filter === "family" ? "family" : c.xvideosQueries && c.xvideosQueries[0] || "";
    var r34Primary = c.filter === "family" ? "family" : c.rule34Tags && c.rule34Tags[0] || "";
    out.push({
      filter: c.filter,
      title: c.title,
      terms,
      xvPrimary: String(xvPrimary).replace(/\+/g, " "),
      r34Primary: String(r34Primary)
    });
  }
  return out;
}
var CATEGORY_TERMS = buildCategoryTerms();
function dedupePosts(posts) {
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

// providers/series.ts
function normalizeBase(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function wordCount(text) {
  var n = normalizeBase(text);
  return n ? n.split(" ").length : 0;
}
function stripTrailingDuration(title) {
  return String(title || "").replace(/\s+\d{1,2}:\d{2}\s*$/, "").replace(/\s+\d+\s*min\s*$/i, "").trim();
}
function isYearLike(num) {
  return Number.isInteger(num) && num >= 1900 && num <= 2100;
}
function parsePartTitle(title) {
  var clean = stripTrailingDuration(title);
  if (!clean) return null;
  var m;
  m = clean.match(/^(.*?)\s*[-–—:]?\s*minus\s+(\d+(?:\.\d+)?)\s*(.*)$/i);
  if (m && wordCount(m[1]) >= 2) {
    var minusBase = m[1].trim().replace(/[-–—:]+$/, "").trim();
    if (minusBase && wordCount(minusBase) >= 2) {
      return {
        base: minusBase,
        baseKey: normalizeBase(minusBase),
        partNum: null,
        partLabel: "Minus " + m[2],
        subtitle: (m[3] || "").trim()
      };
    }
  }
  m = clean.match(
    /^(.*?)\s*[-–—:]?\s*(?:part|pt\.?|volume|vol\.?|v\.?|episode|ep\.?|chapter|ch\.?|season|s\.?|book|bk\.?|#)\s*(\d+(?:\.\d+)?)\b\s*(.*)$/i
  );
  if (m) {
    var base1 = m[1].trim().replace(/[-–—:]+$/, "").trim();
    var num1 = parseFloat(m[2]);
    if (base1 && wordCount(base1) >= 2 && num1 < 1e3) {
      return {
        base: base1,
        baseKey: normalizeBase(base1),
        partNum: num1,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim()
      };
    }
  }
  m = clean.match(/^(.*?)\s*[-–—]\s*(\d+(?:\.\d+)?)\b\s*(.*)$/);
  if (m) {
    var base2 = m[1].trim();
    var num2 = parseFloat(m[2]);
    if (base2 && wordCount(base2) >= 2 && num2 < 1e3 && !isYearLike(num2)) {
      return {
        base: base2,
        baseKey: normalizeBase(base2),
        partNum: num2,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim()
      };
    }
  }
  m = clean.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*[-–—]?\s*(.*)$/);
  if (m) {
    var base3 = m[1].trim();
    var num3 = parseFloat(m[2]);
    if (base3 && wordCount(base3) >= 2 && num3 < 1e3 && !isYearLike(num3)) {
      return {
        base: base3,
        baseKey: normalizeBase(base3),
        partNum: num3,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim()
      };
    }
  }
  return null;
}
function naturalCompare(a, b) {
  var ax = String(a || "").toLowerCase().match(/(\d+(?:\.\d+)?|\D+)/g) || [];
  var bx = String(b || "").toLowerCase().match(/(\d+(?:\.\d+)?|\D+)/g) || [];
  var len = Math.max(ax.length, bx.length);
  for (var i = 0; i < len; i++) {
    var x = ax[i] || "";
    var y = bx[i] || "";
    if (x === y) continue;
    var nx = parseFloat(x);
    var ny = parseFloat(y);
    if (!isNaN(nx) && !isNaN(ny)) return nx - ny;
    return x < y ? -1 : 1;
  }
  return 0;
}
function sortParts(parts) {
  return parts.slice().sort(function(a, b) {
    var an = a.partNum;
    var bn = b.partNum;
    if (an != null && bn != null && an !== bn) return an - bn;
    if (an != null && bn == null) return -1;
    if (an == null && bn != null) return 1;
    return naturalCompare(a.title || "", b.title || "");
  });
}
function groupSeriesPosts(posts) {
  var input = Array.isArray(posts) ? posts : [];
  if (input.length === 0) return [];
  var groups = {};
  var groupOrder = [];
  var singles = [];
  var parsedByIndex = [];
  for (var i = 0; i < input.length; i++) {
    var p = input[i];
    var parsed = p && p.title ? parsePartTitle(p.title) : null;
    parsedByIndex.push(parsed);
    if (parsed && parsed.partNum != null) {
      var key = parsed.baseKey;
      if (!groups[key]) {
        groups[key] = { base: parsed.base, baseKey: key, parts: [], firstIndex: i };
        groupOrder.push(key);
      }
      groups[key].parts.push({
        title: p.title,
        link: p.link,
        image: p.image,
        tag: p.tag,
        cornerTag: p.cornerTag,
        _dur: p._dur || 0,
        partNum: parsed.partNum,
        partLabel: parsed.partLabel,
        subtitle: parsed.subtitle,
        index: i
      });
    } else {
      singles.push({ post: p, index: i, parsed });
    }
  }
  var liveGroups = {};
  for (var g = 0; g < groupOrder.length; g++) {
    var grp = groups[groupOrder[g]];
    if (grp.parts.length >= 2) {
      liveGroups[grp.baseKey] = grp;
    } else {
      for (var q = 0; q < grp.parts.length; q++) {
        var solo = grp.parts[q];
        singles.push({ post: input[solo.index], index: solo.index, parsed: parsedByIndex[solo.index] });
      }
    }
  }
  var attached = {};
  var remainingSingles = [];
  for (var s = 0; s < singles.length; s++) {
    var entry = singles[s];
    var post = entry.post;
    var titleNorm = normalizeBase(post && post.title);
    var joined = null;
    var joinLabel = null;
    if (titleNorm) {
      for (var k in liveGroups) {
        var lg = liveGroups[k];
        if (titleNorm === lg.baseKey) continue;
        if (titleNorm.indexOf(lg.baseKey + " ") === 0) {
          var rest = titleNorm.slice(lg.baseKey.length).trim();
          var restWords = rest ? rest.split(" ").length : 0;
          if (restWords >= 1 && restWords <= 6) {
            joined = lg;
            joinLabel = entry.parsed && entry.parsed.partLabel ? entry.parsed.partLabel : rest.split(" ").map(function(w) {
              return w.charAt(0).toUpperCase() + w.slice(1);
            }).join(" ");
            break;
          }
        }
      }
    }
    if (joined) {
      joined.parts.push({
        title: post.title,
        link: post.link,
        image: post.image,
        tag: post.tag,
        cornerTag: post.cornerTag,
        _dur: post._dur || 0,
        partNum: null,
        partLabel: joinLabel,
        subtitle: "",
        index: entry.index
      });
      attached[entry.index] = true;
    } else {
      remainingSingles.push(entry);
    }
  }
  var out = [];
  var emittedGroups = {};
  var singleByIndex = {};
  for (var r = 0; r < remainingSingles.length; r++) {
    singleByIndex[remainingSingles[r].index] = remainingSingles[r].post;
  }
  for (var i2 = 0; i2 < input.length; i2++) {
    if (singleByIndex[i2] !== void 0) {
      out.push(singleByIndex[i2]);
      continue;
    }
    if (attached[i2]) continue;
    var parsed2 = parsedByIndex[i2];
    if (parsed2 && parsed2.partNum != null && liveGroups[parsed2.baseKey]) {
      var lg2 = liveGroups[parsed2.baseKey];
      if (emittedGroups[lg2.baseKey]) continue;
      emittedGroups[lg2.baseKey] = true;
      var sorted = sortParts(lg2.parts);
      var first = sorted[0];
      var card = {
        title: first.title,
        link: first.link,
        image: first.image,
        tag: first.tag,
        _dur: first._dur || 0,
        cornerTag: sorted.length + " parts"
      };
      out.push(card);
      continue;
    }
    out.push(input[i2]);
  }
  return out;
}

// providers/rule34video/posts.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://rule34video.com";
var memoryCache = { data: null, expiresAt: 0 };
var BASE_CACHE_KEY = "rule34video_baseUrlCacheV1";
function formatDuration(totalSeconds) {
  var s = Math.max(0, Math.floor(totalSeconds || 0));
  if (!s) return "";
  var h = Math.floor(s / 3600);
  var m = Math.floor(s % 3600 / 60);
  var sec = s % 60;
  var mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" + mm : mm) + ":" + String(sec).padStart(2, "0");
}
function upgradeRule34ImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.includes("/contents/videos_screenshots/")) {
    return url.replace(/\/\d+x\d+\/\d+\.jpg$/i, "/preview.jpg");
  }
  return url;
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
    } catch (e) {
    }
  }
  var now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    var cachedEntry = memoryCache.data["rule34video"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        var cached = typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > Date.now()) {
          return String(cached.url).replace(/\/+$/, "");
        }
      }
    } catch (e) {
    }
  }
  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 2500 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 36e5;
        var entry = res.data["rule34video"];
        if (entry && entry.url) {
          var cleanEntry = entry.url.replace(/\/+$/, "");
          if (kvStore && typeof kvStore.set === "function") {
            try {
              await kvStore.set(
                BASE_CACHE_KEY,
                JSON.stringify({ url: cleanEntry, expiresAt: now + 36e5 })
              );
            } catch (e) {
            }
          }
          return cleanEntry;
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var learned = await kvStore.get("rule34video_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  return DEFAULT_BASE_URL;
}
function updateLearnedDomain(res, baseUrl, kvStore) {
  try {
    var finalUrl = res && res.request && (res.request.responseURL || res.request.res && res.request.res.responseUrl) || res && res.config && res.config.url;
    if (finalUrl && typeof finalUrl === "string") {
      var parsed = new URL(finalUrl);
      var origin = parsed.origin;
      if (origin && origin !== baseUrl && kvStore && typeof kvStore.set === "function") {
        kvStore.set("rule34video_learnedDomain", origin);
      }
    }
  } catch (e) {
  }
}
function compareTitle(a, b) {
  var ax = String(a).toLowerCase().split(/(\d+)/);
  var bx = String(b).toLowerCase().split(/(\d+)/);
  for (var i = 0; i < Math.max(ax.length, bx.length); i++) {
    if (ax[i] === void 0) return -1;
    if (bx[i] === void 0) return 1;
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
  var maxLength = groups.reduce(function(max, group) {
    return Math.max(max, group.length);
  }, 0);
  for (var i = 0; i < maxLength; i++) {
    for (var g = 0; g < groups.length; g++) {
      if (groups[g][i]) {
        result.push(groups[g][i]);
      }
    }
  }
  var seen = /* @__PURE__ */ new Set();
  return result.filter(function(post) {
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
      timeout: 12e3,
      headers: Object.assign({}, commonHeaders, {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl + "/"
      }),
      signal,
      maxRedirects: 5
    });
    updateLearnedDomain(res, baseUrl, kvStore);
    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];
    var seenVideoIds = /* @__PURE__ */ new Set();
    $(".item.thumb, [data-video-card-id]").each(function(_, element) {
      var $el = $(element);
      var linkEl = $el.find('a.th, a[href*="/video/"]').first();
      var rawHref = linkEl.attr("href") || "";
      var rawTitle = linkEl.attr("title") || $el.find("img.thumb").attr("alt") || linkEl.text().trim();
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
      var rawImg = img.attr("data-rd-src") || img.attr("src") || img.attr("data-rd-jpg") || "";
      var image = upgradeRule34ImageUrl(rawImg);
      var duration = $el.find(".time").first().text().trim();
      var durationSec = 0;
      if (duration) {
        var dParts = duration.split(":").map(function(part) {
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
      var durationText = formatDuration(durationSec) || duration || void 0;
      var cornerTag = durationText ? isHd ? durationText + " \u2022 HD" : durationText : isHd ? "HD" : void 0;
      var absoluteLink = rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;
      if (!image || image.indexOf("data:") === 0) {
        var idm = String(rawHref).match(/\/video\/(\d+)/);
        if (idm) {
          var vid2 = parseInt(idm[1], 10);
          var bucket2 = Math.floor(vid2 / 1e3) * 1e3;
          image = baseUrl + "/contents/videos_screenshots/" + bucket2 + "/" + vid2 + "/preview.jpg";
        }
      }
      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image,
        tag: durationText,
        _dur: durationSec,
        cornerTag
      });
    });
    posts.sort(function(a, b) {
      return compareTitle(a.title || "", b.title || "");
    });
    return posts;
  } catch (err) {
    console.error("Rule34Video posts error:", err && err.message ? err.message : err);
    return [];
  }
}
function getCategory(filter) {
  return categories_config_default.categories.find(function(category) {
    return category.filter === filter;
  });
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
      kvStore,
      query: "r34_3d_home",
      page,
      terms: THREE_D_KEYWORD_STRINGS,
      fetchTermPage: function(term, sp) {
        var cleanTerm = encodeURIComponent(term.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"));
        var targetUrl = sp > 1 ? baseUrl + "/search/" + cleanTerm + "/" + sp + "/" : baseUrl + "/search/" + cleanTerm + "/";
        return parseVideoGrid({
          url: targetUrl,
          baseUrl,
          axios,
          cheerio,
          commonHeaders,
          signal,
          kvStore,
          requireVideo: true
        });
      }
    });
  }
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
    rel_grandpa: "grandpa"
  };
  var tag = tagMap[filter];
  var catTerms = [];
  if (tag) {
    catTerms.push(tag + "-3d");
    catTerms.push(tag + "-animation");
    catTerms.push(tag + "-sfm");
    catTerms.push(tag + "-gameplay");
    catTerms.push(tag + "-cg");
  } else {
    var primaryTerm = primaryTermFor(filter, "rule34video") || filter;
    catTerms.push(primaryTerm.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-3d");
    catTerms.push(primaryTerm.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-animation");
  }
  return getPooledSearchPage({
    kvStore,
    query: "r34_3d_cat_" + filter,
    page,
    terms: catTerms,
    fetchTermPage: function(term, sp) {
      var cleanTerm = encodeURIComponent(term);
      var targetUrl = sp > 1 ? baseUrl + "/search/" + cleanTerm + "/" + sp + "/" : baseUrl + "/search/" + cleanTerm + "/";
      return parseVideoGrid({
        url: targetUrl,
        baseUrl,
        axios,
        cheerio,
        commonHeaders,
        signal,
        kvStore,
        requireVideo: true
      });
    }
  });
}
var getPostsImpl = async function(params) {
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
  var threeDContext = {
    baseUrl,
    axios,
    cheerio,
    commonHeaders,
    signal,
    kvStore
  };
  if (await is3DOn(kvStore)) {
    var threeDPosts = await get3DPostsForFilter(threeDContext, filter, page);
    if (threeDPosts && threeDPosts.length > 0) return threeDPosts;
  }
  if (category && category.mode === "keep_existing") {
    var familyUrl = page > 1 ? baseUrl + "/search/family/" + page + "/" : baseUrl + "/search/family/";
    return parseVideoGrid({
      url: familyUrl,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore
    });
  }
  if (category && category.mode === "random_feed") {
    var targetUrl = page === 1 ? baseUrl + "/" : baseUrl + "/" + page + "/";
    return parseVideoGrid({
      url: targetUrl,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore,
      requireVideo: true
    });
  }
  if (category && category.mode === "multi_query") {
    var tags = Array.isArray(category.rule34Tags) ? category.rule34Tags : [];
    if (tags.length === 0) {
      return [];
    }
    var fetchTermPage = async function(tp) {
      var tagResults = await Promise.all(
        tags.map(function(tag) {
          var cleanTag2 = encodeURIComponent(String(tag).trim().replace(/\s+/g, "-"));
          var searchUrl = tp > 1 ? baseUrl + "/search/" + cleanTag2 + "/" + tp + "/" : baseUrl + "/search/" + cleanTag2 + "/";
          return parseVideoGrid({
            url: searchUrl,
            baseUrl,
            axios,
            cheerio,
            commonHeaders,
            signal,
            kvStore,
            requireVideo: true
          });
        })
      );
      var merged = interleavePosts(tagResults);
      merged.sort(function(a, b) {
        return compareTitle(a.title || "", b.title || "");
      });
      return merged;
    };
    return getPooledCategoryPage({
      kvStore,
      filter,
      page,
      fetchTermPage
    });
  }
  if (filter === "/family/" || filter === "/family") {
    var familyUrl = page > 1 ? baseUrl + "/search/family/" + page + "/" : baseUrl + "/search/family/";
    return parseVideoGrid({
      url: familyUrl,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore
    });
  }
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
    baseUrl,
    axios,
    cheerio,
    commonHeaders,
    signal,
    kvStore
  });
};
var getPosts = async function(params) {
  var posts = await getPostsImpl(params);
  return groupSeriesPosts(posts || []);
};
var getSearchPostsImpl = async function(params) {
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
  var cleanQuery = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-"));
  var threeDOn = await is3DOn(kvStore);
  if (threeDOn) {
    var terms = THREE_D_KEYWORD_STRINGS.map(function(kw) {
      return cleanQuery + "-" + encodeURIComponent(kw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    });
    return getPooledSearchPage({
      kvStore,
      query: "3d:" + normQuery,
      page,
      terms,
      fetchTermPage: function(term, sp) {
        var targetUrl = sp > 1 ? baseUrl + "/search/" + term + "/" + sp + "/" : baseUrl + "/search/" + term + "/";
        return parseVideoGrid({
          url: targetUrl,
          baseUrl,
          axios,
          cheerio,
          commonHeaders,
          signal,
          kvStore,
          requireVideo: true
        });
      }
    });
  }
  var fetchSitePage = function(sp) {
    var targetUrl = sp > 1 ? baseUrl + "/search/" + cleanQuery + "/" + sp + "/" : baseUrl + "/search/" + cleanQuery + "/";
    return parseVideoGrid({
      url: targetUrl,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore,
      requireVideo: true
    });
  };
  return getPooledSearchPage({
    kvStore,
    query: normQuery,
    page,
    fetchSitePage
  });
};
var getSearchPosts = async function(params) {
  var posts = await getSearchPostsImpl(params);
  return groupSeriesPosts(posts || []);
};
