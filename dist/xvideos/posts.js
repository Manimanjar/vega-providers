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

// providers/xvideos/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
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
      rule34Tags: [],
      title: "Family",
      xvideosQueries: []
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
var THREE_D_CACHE_KEY = "threeDCacheV1";
var THREE_D_WARM_KEY = "threeDWarmV1";
var THREE_D_TTL_MS = 36e5;
var THREE_D_WARM_INTERVAL_MS = 36e5;
var THREE_D_PAGE_SIZE = 60;
var THREE_D_POOL_CAP = 600;
var THREE_D_PHASE1_CAP = 300;
var THREE_D_BUCKET_CAP = 120;
var THREE_D_WAVE_SIZE = 5;
var THREE_D_WAVE_GAP_MS = 400;
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
  { kw: "cartoon", tier: 3 }
];
function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}
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
    return (u.protocol + "//" + u.host.toLowerCase() + path).toLowerCase();
  } catch (e) {
    return String(link).split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  }
}
function normalizeText(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function phraseIn(haystackNorm, termNorm) {
  if (!termNorm) return false;
  if (haystackNorm === termNorm) return true;
  if (haystackNorm.indexOf(termNorm + " ") === 0) return true;
  var endIdx = haystackNorm.lastIndexOf(" " + termNorm);
  if (endIdx !== -1 && endIdx === haystackNorm.length - termNorm.length - 1) return true;
  return haystackNorm.indexOf(" " + termNorm + " ") !== -1;
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
function isKnown3DFilter(filter) {
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    if (CATEGORY_TERMS[i].filter === filter) return true;
  }
  return false;
}
var COUSIN_OTHER_PHRASES = [
  "cousin brother",
  "cousin bro",
  "cousin stepbrother",
  "cousin step brother",
  "cousin stepbro",
  "cousin step bro",
  "cousin dad",
  "cousin father",
  "cousin stepdad",
  "cousin stepfather",
  "cousin daddy",
  "cousin mom",
  "cousin mother",
  "cousin stepmom",
  "cousin stepmother",
  "cousin daughter",
  "cousin stepdaughter",
  "cousin aunt",
  "cousin auntie",
  "cousin aunty",
  "cousin stepaunt",
  "cousin uncle",
  "cousin nephew",
  "cousin niece",
  "cousin son"
];
function hasCousinOtherPhrase(text) {
  var norm = normalizeText(text);
  if (!norm) return false;
  for (var i = 0; i < COUSIN_OTHER_PHRASES.length; i++) {
    if (phraseIn(norm, COUSIN_OTHER_PHRASES[i])) return true;
  }
  return false;
}
function matchesRelationWords(text, words, filter) {
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
function searchTermsFor(filter, site, maxN) {
  var n = maxN || 3;
  var categories = categories_config_default && categories_config_default.categories || [];
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
function classifyRelation(title, tagText) {
  var out = [];
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    var cat = CATEGORY_TERMS[i];
    if (cat.filter === "homepage") continue;
    if (cat.terms.length === 0) continue;
    if (matchesRelationWords(title, cat.terms, cat.filter) || matchesRelationWords(tagText, cat.terms, cat.filter)) {
      out.push(cat.filter);
    }
  }
  return out;
}
function leanPost(post) {
  return {
    title: post.title || "",
    link: post.link || "",
    image: post.image || "",
    tag: post.tag,
    cornerTag: post.cornerTag,
    _dur: post._dur || 0
  };
}
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
function keepLongEnough(posts) {
  return posts.filter(function(p) {
    var d = p && p._dur || 0;
    return d === 0 || d >= 120;
  });
}
function bucketize(pool, categoryHits) {
  var buckets = {};
  for (var i = 0; i < CATEGORY_TERMS.length; i++) {
    buckets[CATEGORY_TERMS[i].filter] = [];
  }
  var poolKeys = {};
  for (var p = 0; p < pool.length; p++) {
    poolKeys[normalizeLink(pool[p].link)] = p;
  }
  if (categoryHits) {
    for (var f in categoryHits) {
      if (!buckets[f]) continue;
      var hits = categoryHits[f] || [];
      for (var h = 0; h < hits.length; h++) {
        var idx = poolKeys[normalizeLink(hits[h].link)];
        if (idx !== void 0 && buckets[f].indexOf(idx) === -1 && buckets[f].length < THREE_D_BUCKET_CAP) {
          buckets[f].push(idx);
        }
      }
    }
  }
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
  buckets["homepage"] = pool.map(function(_, idx2) {
    return idx2;
  });
  return { pool, buckets };
}
var read3DCache = async function(kvStore) {
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
var write3DCache = async function(kvStore, pool, buckets) {
  if (!kvStore || typeof kvStore.set !== "function") return false;
  try {
    var payload = JSON.stringify({
      expiresAt: Date.now() + THREE_D_TTL_MS,
      pool,
      buckets
    });
    if (payload.length > 9e5) return false;
    await kvStore.set(THREE_D_CACHE_KEY, payload);
    return true;
  } catch (e) {
    return false;
  }
};
var sweep3D = async function(fetchGrid, fetchCategory3D, fetchRelationPool) {
  var pool = [];
  for (var w = 0; w < THREE_D_KEYWORDS.length; w += THREE_D_WAVE_SIZE) {
    var wave = THREE_D_KEYWORDS.slice(w, w + THREE_D_WAVE_SIZE);
    var results = await Promise.all(
      wave.map(function(entry) {
        return Promise.resolve().then(function() {
          return fetchGrid(entry.kw);
        }).catch(function() {
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
        wave2.map(function(filter) {
          return Promise.resolve().then(function() {
            return fetchCategory3D(filter, pool);
          }).catch(function() {
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
      }
    }
    var poolKeys = {};
    for (var p = 0; p < pool.length; p++) poolKeys[normalizeLink(pool[p].link)] = true;
    var hitLists = [];
    for (var f3 in categoryHits) {
      var dedupedHits = [];
      var hitSeen = {};
      (categoryHits[f3] || []).forEach(function(h) {
        var k2 = normalizeLink(h.link);
        if (!k2 || hitSeen[k2] || poolKeys[k2]) return;
        hitSeen[k2] = true;
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
  return { pool, categoryHits };
};
var ensure3DPool = async function(ctx) {
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
var warm3DInBackground = function(ctx) {
  var kvStore = ctx && ctx.kvStore;
  if (!kvStore || typeof kvStore.get !== "function") return Promise.resolve(false);
  return Promise.resolve().then(function() {
    return kvStore.get(THREE_D_WARM_KEY);
  }).catch(function() {
    return 0;
  }).then(function(lastWarm) {
    var last = typeof lastWarm === "number" ? lastWarm : parseInt(lastWarm, 10) || 0;
    if (Date.now() - last < THREE_D_WARM_INTERVAL_MS) return false;
    return Promise.resolve().then(function() {
      return kvStore.set(THREE_D_WARM_KEY, Date.now());
    }).catch(function() {
    }).then(function() {
      return ensure3DPool(ctx);
    }).then(function() {
      return true;
    }).catch(function() {
      return false;
    });
  });
};
function getBucketPosts(cached, filter, page) {
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
function intersectWithPool(posts, cached) {
  if (!cached || !cached.pool) return posts || [];
  var poolKeys = {};
  for (var i = 0; i < cached.pool.length; i++) {
    poolKeys[normalizeLink(cached.pool[i].link)] = true;
  }
  return (posts || []).filter(function(p) {
    return p && p.link && poolKeys[normalizeLink(p.link)];
  });
}
function poolCategorySearch(cached, query) {
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
function poolTitleSearch(cached, query) {
  if (!cached || !cached.pool) return [];
  var q = normalizeText(query);
  if (!q) return [];
  return cached.pool.filter(function(p) {
    return p && p.title && phraseIn(normalizeText(p.title), q);
  });
}
function titleMatchesAnyKeyword(title) {
  var norm = normalizeText(title);
  if (!norm) return false;
  for (var i = 0; i < THREE_D_KEYWORDS.length; i++) {
    if (phraseIn(norm, normalizeText(THREE_D_KEYWORDS[i].kw))) return true;
  }
  return false;
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
    /^(.*?)\s*[-–—:]?\s*(?:part|pt\.?|episode|ep\.?|chapter|ch\.?)\s*(\d+(?:\.\d+)?)\b\s*(.*)$/i
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

// providers/xvideos/posts.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.xvideos.com";
var memoryCache = { data: null, expiresAt: 0 };
var BASE_CACHE_KEY = "xvideos_baseUrlCacheV1";
function formatDuration(totalSeconds) {
  var s = Math.max(0, Math.floor(totalSeconds || 0));
  if (!s) return "";
  var h = Math.floor(s / 3600);
  var m = Math.floor(s % 3600 / 60);
  var sec = s % 60;
  var mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" + mm : mm) + ":" + String(sec).padStart(2, "0");
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
    var cachedEntry = memoryCache.data["xvideos"];
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
        var entry = res.data["xvideos"];
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
      var learned = await kvStore.get("xvideos_learnedDomain");
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
        kvStore.set("xvideos_learnedDomain", origin);
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
  try {
    var res = null;
    var lastErr = null;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        res = await axios.get(url, {
          timeout: 12e3,
          headers: Object.assign({}, commonHeaders, {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: baseUrl + "/",
            Origin: baseUrl,
            Accept: "*/*"
          }),
          signal,
          maxRedirects: 5
        });
        break;
      } catch (e) {
        lastErr = e;
        var status = e && e.response && e.response.status;
        if (status === 429 && attempt === 0) {
          await new Promise(function(resolve) {
            setTimeout(resolve, 2500);
          });
          continue;
        }
        throw e;
      }
    }
    if (!res) throw lastErr || new Error("no response");
    updateLearnedDomain(res, baseUrl, kvStore);
    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];
    var seenVideoIds = /* @__PURE__ */ new Set();
    $(".thumb-block").each(function(_, element) {
      var $el = $(element);
      var titleLink = $el.find("p.title a, .thumb-under p.title a, .title a").first();
      var rawTitle = titleLink.attr("title") || "";
      if (!rawTitle) {
        var cloned = titleLink.clone();
        cloned.find("span").remove();
        rawTitle = cloned.text().trim();
      }
      var rawHref = titleLink.attr("href") || $el.find(".thumb-inside a").first().attr("href") || $el.find("a").first().attr("href") || "";
      if (!rawHref) return;
      if (!rawTitle || /^(?:1080p?|720p?|480p?|4k|hd|cc|sd)(?:\s*(?:cc|hd))*$/i.test(rawTitle.trim())) {
        var parts = rawHref.split("/").filter(Boolean);
        var slug = parts[parts.length - 1] || "";
        rawTitle = decodeURIComponent(slug.replace(/[_-]+/g, " "));
      }
      var idMatch = rawHref.match(/\/video(?:\.([a-zA-Z0-9_-]+)|\/([0-9]+))/i);
      var videoId = idMatch ? idMatch[1] || idMatch[2] : rawHref;
      if (seenVideoIds.has(videoId)) {
        return;
      }
      seenVideoIds.add(videoId);
      var img = $el.find("img").first();
      var image = img.attr("data-src") || img.attr("data-srcset") || img.attr("src") || "";
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
      var durationText = formatDuration(durationSec) || duration || void 0;
      var cornerTag = durationText ? hdTag ? durationText + " \u2022 " + hdTag : durationText : hdTag || void 0;
      var absoluteLink = rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;
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
    console.error("XVideos posts error:", err && err.message ? err.message : err);
    return [];
  }
}
function getCategory(filter) {
  return categories_config_default.categories.find(function(category) {
    return category.filter === filter;
  });
}
function build3DContext(opts) {
  return {
    kvStore: opts.kvStore,
    fetchGrid: function(keyword) {
      var targetUrl = opts.baseUrl + "/?k=" + encodeURIComponent(keyword) + "&p=0";
      return parseVideoGrid({
        url: targetUrl,
        baseUrl: opts.baseUrl,
        axios: opts.axios,
        cheerio: opts.cheerio,
        commonHeaders: opts.commonHeaders,
        signal: opts.signal,
        kvStore: opts.kvStore
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
    fetchCategory3D: async function(filter, pool) {
      var terms = searchTermsFor(filter, "xvideos", 3);
      if (terms.length === 0) return [];
      var perTerm = [];
      for (var ti = 0; ti < terms.length; ti++) {
        var termResults = [];
        for (var ki = 0; ki < 2; ki++) {
          var kw = ki === 0 ? "3d" : "sfm";
          var targetUrl = opts.baseUrl + "/?k=" + encodeURIComponent(terms[ti] + " " + kw) + "&p=0";
          try {
            var grid = await parseVideoGrid({
              url: targetUrl,
              baseUrl: opts.baseUrl,
              axios: opts.axios,
              cheerio: opts.cheerio,
              commonHeaders: opts.commonHeaders,
              signal: opts.signal,
              kvStore: opts.kvStore
            });
            (grid || []).forEach(function(p) {
              termResults.push(p);
            });
          } catch (e) {
          }
          if (ti < terms.length - 1 || ki === 0) {
            await new Promise(function(resolve) {
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
    fetchRelationPool: async function(pool) {
      var queries = ["taboo 3d", "taboo sfm", "stepfamily 3d", "stepfamily sfm", "family 3d", "family sfm", "cousin 3d", "cousin sfm"];
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
            kvStore: opts.kvStore
          });
          groups.push(g || []);
        } catch (e) {
          groups.push([]);
        }
        if (qi < queries.length - 1) {
          await new Promise(function(resolve) {
            setTimeout(resolve, 800);
          });
        }
      }
      var out = {};
      groups.forEach(function(g2) {
        (g2 || []).forEach(function(p) {
          if (!p || !p.link) return;
          if (!titleMatchesAnyKeyword(p.title) && classifyRelation(p.title, "").length === 0) return;
          var filters = classifyRelation(p.title, "");
          if (filters.length === 0) filters = ["incest"];
          filters.forEach(function(f) {
            if (!out[f]) out[f] = [];
            out[f].push(p);
          });
        });
      });
      return out;
    }
  };
}
async function get3DPostsForFilter(ctx, filter, page) {
  var cached = await ensure3DPool(ctx);
  if (!cached) return null;
  return getBucketPosts(cached, filter, page);
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
  var threeDContext = build3DContext({
    baseUrl,
    axios,
    cheerio,
    commonHeaders,
    signal,
    kvStore
  });
  if (await is3DOn(kvStore)) {
    var threeDPosts = await get3DPostsForFilter(threeDContext, filter, page);
    if (threeDPosts) return threeDPosts;
  } else if (page <= 1) {
    warm3DInBackground(threeDContext);
  }
  if (category && category.mode === "keep_existing") {
    var pNum = page > 1 ? page - 1 : 0;
    var fUrl = pNum > 0 ? baseUrl + "/?k=family&sort=length&p=" + pNum : baseUrl + "/?k=family&sort=length";
    return parseVideoGrid({
      url: fUrl,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore
    });
  }
  if (category && category.mode === "random_feed") {
    var randomPage = Math.floor(Math.random() * 35) + 1;
    var randomUrl = baseUrl + "/new/" + randomPage + "/?_t=" + Date.now();
    var posts = await parseVideoGrid({
      url: randomUrl,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore
    });
    return posts;
  }
  if (category && category.mode === "multi_query") {
    var queries = Array.isArray(category.xvideosQueries) ? category.xvideosQueries : [];
    if (queries.length === 0) {
      return [];
    }
    var fetchTermPage = async function(tp) {
      var pageIndex2 = Math.max(0, tp - 1);
      var termResults = await Promise.all(
        queries.map(function(query) {
          var targetUrl2 = baseUrl + "/?k=" + encodeURIComponent(String(query).replace(/\+/g, " ")) + "&p=" + pageIndex2;
          return parseVideoGrid({
            url: targetUrl2,
            baseUrl,
            axios,
            cheerio,
            commonHeaders,
            signal,
            kvStore
          });
        })
      );
      var merged = interleavePosts(termResults);
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
    var pNum = page > 1 ? page - 1 : 0;
    var fUrl = pNum > 0 ? baseUrl + "/?k=family&sort=length&p=" + pNum : baseUrl + "/?k=family&sort=length";
    return parseVideoGrid({
      url: fUrl,
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
  var pageIndex = Math.max(0, page - 1);
  var targetUrl = baseUrl + "/?k=" + encodeURIComponent(searchQuery) + "&p=" + pageIndex;
  if (await is3DOn(kvStore)) {
    var threeDContext = build3DContext({
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore
    });
    var cached = await ensure3DPool(threeDContext);
    var plain = await parseVideoGrid({
      url: targetUrl,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore
    });
    var matched = cached ? intersectWithPool(plain, cached) : plain.filter(function(p) {
      return titleMatchesAnyKeyword(p.title);
    });
    var direct = await parseVideoGrid({
      url: baseUrl + "/?k=" + encodeURIComponent(searchQuery + " 3d") + "&p=" + pageIndex,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore
    });
    var merged = dedupePosts(
      keepLongEnough(
        matched.concat(
          direct,
          cached ? poolTitleSearch(cached, searchQuery) : [],
          cached ? poolCategorySearch(cached, searchQuery) : []
        )
      )
    );
    merged.sort(function(a, b) {
      return compareTitle(a.title || "", b.title || "");
    });
    return merged.slice(0, 60);
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
var getSearchPosts = async function(params) {
  var posts = await getSearchPostsImpl(params);
  return groupSeriesPosts(posts || []);
};
