// @vega-provider ddose007
// @vega-version 1.0.4
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

// providers/ddose007/posts.ts
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

// providers/ddose007/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://ddose007.co";
var BASE_CACHE_KEY = "ddose007_baseUrlCacheV4";
var LEARNED_KEY = "ddose007_learnedDomainV2";
var CANDIDATE_MIRRORS = [
  "https://ddose007.co",
  "https://ddose007.cc"
];
var memoryCache = { url: "", expiresAt: 0 };
async function isHealthyMirror(axios, mirror) {
  try {
    const res = await axios.get(mirror, {
      timeout: 4500,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      maxRedirects: 3
    });
    if (res.status >= 200 && res.status < 400) {
      const dataStr = typeof res.data === "string" ? res.data : "";
      if (!dataStr.includes("Just a moment...") && !dataStr.includes("cf-mitigated") && !res.headers?.["cf-mitigated"]) {
        return true;
      }
    }
  } catch (e) {
  }
  return false;
}
async function probeMirrors(axios, mirrors) {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  for (const mirror of mirrors) {
    const ok = await isHealthyMirror(axios, mirror);
    if (ok) return mirror.replace(/\/+$/, "");
  }
  return null;
}
async function getBaseUrl(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const clean = custom.trim().replace(/\/+$/, "");
        if (clean !== DEFAULT_BASE_URL && !clean.includes("ddose007.cc") && !clean.includes("instavipclub")) {
          return clean;
        }
      }
    } catch (e) {
    }
  }
  const now = Date.now();
  if (memoryCache.url && now < memoryCache.expiresAt) {
    return memoryCache.url;
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached = typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > now) {
          memoryCache.url = String(cached.url).replace(/\/+$/, "");
          memoryCache.expiresAt = cached.expiresAt;
          return memoryCache.url;
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get(LEARNED_KEY);
      if (learned && typeof learned === "string" && learned.startsWith("http") && !learned.includes("instavipclub")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  let githubMirrors = CANDIDATE_MIRRORS;
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3e3 });
      if (res.data && res.data.ddose007) {
        const entry = res.data.ddose007;
        if (Array.isArray(entry.mirrors) && entry.mirrors.length > 0) {
          githubMirrors = entry.mirrors;
        }
        if (entry.url && entry.url.startsWith("http")) {
          const cleanUrl = entry.url.replace(/\/+$/, "");
          if (await isHealthyMirror(axios, cleanUrl)) {
            memoryCache.url = cleanUrl;
            memoryCache.expiresAt = now + 18e5;
            if (kvStore && typeof kvStore.set === "function") {
              try {
                await kvStore.set(
                  BASE_CACHE_KEY,
                  JSON.stringify({ url: cleanUrl, expiresAt: now + 18e5 })
                );
              } catch (e) {
              }
            }
            return cleanUrl;
          }
        }
      }
    } catch (e) {
    }
  }
  if (axios) {
    const probed = await probeMirrors(axios, githubMirrors);
    if (probed) {
      memoryCache.url = probed;
      memoryCache.expiresAt = now + 18e5;
      if (kvStore && typeof kvStore.set === "function") {
        try {
          await kvStore.set(LEARNED_KEY, probed);
          await kvStore.set(
            BASE_CACHE_KEY,
            JSON.stringify({ url: probed, expiresAt: now + 18e5 })
          );
        } catch (e) {
        }
      }
      return probed;
    }
  }
  return DEFAULT_BASE_URL;
}
function recordRedirect(res, currentBase, kvStore) {
  if (res && res.request && res.request.responseURL) {
    try {
      const u = new URL(res.request.responseURL);
      const origin = u.origin.replace(/\/+$/, "");
      if (origin && origin.startsWith("http") && origin !== currentBase && !origin.includes("instavipclub")) {
        memoryCache.url = origin;
        memoryCache.expiresAt = Date.now() + 18e5;
        kvStore?.set(LEARNED_KEY, origin);
        kvStore?.set(
          BASE_CACHE_KEY,
          JSON.stringify({ url: origin, expiresAt: Date.now() + 18e5 })
        );
      }
    } catch (e) {
    }
  }
}

// providers/ddose007/posts.ts
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function normalizeUrl(url, baseUrl) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
function wrapImageProxy(imageUrl, baseUrl) {
  if (!imageUrl) return "";
  if (imageUrl.includes("pvtcdn.com")) {
    return `https://vega-tv.vercel.app/api/proxy?url=${encodeURIComponent(
      imageUrl
    )}&referer=${encodeURIComponent(baseUrl + "/")}`;
  }
  return imageUrl;
}
function getCategoryConfig(filter) {
  return categories_config_default.categories.find((c) => c.filter === filter);
}
function parseVideoBlocks($, baseUrl) {
  const posts = [];
  const seen = /* @__PURE__ */ new Set();
  $(".video-block").each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a.thumb, a.infos, a").first();
    const titleEl = $el.find("span.title, a.infos").first();
    const imgEl = $el.find("img.video-img, img").first();
    const durationEl = $el.find(".duration").first();
    const viewsEl = $el.find(".views-number").first();
    let link = linkEl.attr("href") || "";
    if (!link || link === "#" || link.startsWith("javascript:")) return;
    link = normalizeUrl(link, baseUrl);
    if (seen.has(link)) return;
    seen.add(link);
    let image = imgEl.attr("data-src") || imgEl.attr("src") || imgEl.attr("data-lazy-src") || "";
    if (image.startsWith("data:")) {
      image = imgEl.attr("data-src") || "";
    }
    image = wrapImageProxy(normalizeUrl(image, baseUrl), baseUrl);
    let title = titleEl.text().trim() || linkEl.attr("title") || imgEl.attr("alt") || "Untitled";
    title = title.replace(/\s+/g, " ").trim();
    if (!title || title.length < 2) return;
    const tag = durationEl.text().trim() || void 0;
    const cornerTag = viewsEl.text().trim() || void 0;
    posts.push({
      title,
      link,
      image,
      tag,
      cornerTag
    });
  });
  return posts;
}
async function getPosts(filterOrOptions, pageArg, signalArg, providerContextArg) {
  let filter = "";
  let page = 1;
  let signal = null;
  let providerContext = null;
  if (filterOrOptions && typeof filterOrOptions === "object" && ("providerContext" in filterOrOptions || "page" in filterOrOptions || "filter" in filterOrOptions)) {
    filter = filterOrOptions.filter || "";
    page = filterOrOptions.page || 1;
    signal = filterOrOptions.signal || null;
    providerContext = filterOrOptions.providerContext || null;
  } else {
    filter = filterOrOptions || "";
    page = pageArg || 1;
    signal = signalArg || null;
    providerContext = providerContextArg || null;
  }
  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;
  if (!axios || !cheerio) return [];
  const baseUrl = await getBaseUrl(kvStore, axios);
  let targetUrl = baseUrl;
  if (!filter || filter === "homepage") {
    targetUrl = page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}/`;
  } else {
    const catCfg = getCategoryConfig(filter);
    if (catCfg) {
      const query = (catCfg.title || filter).toLowerCase();
      const q = encodeURIComponent(query);
      targetUrl = page === 1 ? `${baseUrl}/?s=${q}` : `${baseUrl}/page/${page}/?s=${q}`;
    } else {
      const cleanFilter = filter.replace(/^\/+|\/+$/g, "");
      targetUrl = page === 1 ? `${baseUrl}/${cleanFilter}/` : `${baseUrl}/${cleanFilter}/page/${page}/`;
    }
  }
  try {
    const res = await axios.get(targetUrl, {
      timeout: 9e3,
      signal,
      headers: {
        ...providerContext?.commonHeaders || {},
        "User-Agent": USER_AGENT,
        Referer: `${baseUrl}/`,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
    recordRedirect(res, baseUrl, kvStore);
    const $ = cheerio.load(res.data);
    return parseVideoBlocks($, baseUrl);
  } catch (e) {
    return [];
  }
}
async function getSearchPosts(queryOrOptions, pageArg, signalArg, providerContextArg) {
  let searchQuery = "";
  let page = 1;
  let signal = null;
  let providerContext = null;
  if (queryOrOptions && typeof queryOrOptions === "object" && ("providerContext" in queryOrOptions || "page" in queryOrOptions || "searchQuery" in queryOrOptions)) {
    searchQuery = queryOrOptions.searchQuery || "";
    page = queryOrOptions.page || 1;
    signal = queryOrOptions.signal || null;
    providerContext = queryOrOptions.providerContext || null;
  } else {
    searchQuery = queryOrOptions || "";
    page = pageArg || 1;
    signal = signalArg || null;
    providerContext = providerContextArg || null;
  }
  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;
  if (!axios || !cheerio || !searchQuery) return [];
  const baseUrl = await getBaseUrl(kvStore, axios);
  const q = encodeURIComponent(searchQuery);
  const targetUrl = page === 1 ? `${baseUrl}/?s=${q}` : `${baseUrl}/page/${page}/?s=${q}`;
  try {
    const res = await axios.get(targetUrl, {
      timeout: 8e3,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: baseUrl,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
    recordRedirect(res, baseUrl, kvStore);
    const $ = cheerio.load(res.data);
    return parseVideoBlocks($, baseUrl);
  } catch (e) {
    return [];
  }
}
