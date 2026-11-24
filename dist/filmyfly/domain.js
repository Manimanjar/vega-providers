// @vega-provider filmyfly
// @vega-version 1.0.3
"use strict";
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

// providers/filmyfly/domain.ts
var domain_exports = {};
__export(domain_exports, {
  getBaseUrl: () => getBaseUrl,
  recordRedirect: () => recordRedirect
});
module.exports = __toCommonJS(domain_exports);
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://filmyfly.haus";
var BASE_CACHE_KEY = "filmyfly_baseUrlCacheV1";
var LEARNED_KEY = "filmyfly_learnedDomain";
var DISCOVERY_API = "https://google.analytis.top/analytisa";
var CANDIDATE_MIRRORS = [
  "https://filmyfly.haus",
  "https://filmyfly.kred",
  "https://filmyfly.ee",
  "https://filmyfly.gift",
  "https://filmyfly.net",
  "https://filmyfly.ca",
  "https://filmyfly.info"
];
var memoryCache = { url: "", expiresAt: 0 };
function b64Decode(str) {
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(str, "base64").toString("utf8");
    } catch (e) {
    }
  }
  if (typeof atob === "function") {
    try {
      return atob(str);
    } catch (e) {
    }
  }
  return "";
}
async function fetchFromDiscoveryApi(axios) {
  if (!axios) return null;
  try {
    const now = /* @__PURE__ */ new Date();
    const v = now.getFullYear() * 1e6 + (now.getMonth() + 1) * 1e4 + now.getDate() * 100 + now.getHours() + 1;
    const res = await axios.get(`${DISCOVERY_API}?v=${v}`, {
      timeout: 3500,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (res.data && typeof res.data.c === "string") {
      const decoded = b64Decode(res.data.c);
      if (decoded && decoded.startsWith("http")) {
        const u = new URL(decoded);
        const origin = u.origin.replace(/\/+$/, "");
        if (origin.startsWith("http")) {
          return origin;
        }
      }
    }
  } catch (e) {
  }
  return null;
}
async function probeMirrors(axios, mirrors) {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  return new Promise((resolve) => {
    let resolved = false;
    let pending = mirrors.length;
    for (const mirror of mirrors) {
      axios.get(mirror, {
        timeout: 4e3,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        maxRedirects: 3
      }).then((res) => {
        if (!resolved && res.status >= 200 && res.status < 400) {
          resolved = true;
          let origin = mirror;
          if (res.request && res.request.responseURL) {
            try {
              origin = new URL(res.request.responseURL).origin;
            } catch (e) {
            }
          }
          resolve(origin.replace(/\/+$/, ""));
        }
      }).catch(() => {
      }).finally(() => {
        pending--;
        if (pending === 0 && !resolved) resolve(null);
      });
    }
    setTimeout(() => {
      if (!resolved) resolve(null);
    }, 4500);
  });
}
async function getBaseUrl(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const clean = custom.trim().replace(/\/+$/, "");
        if (clean !== DEFAULT_BASE_URL) return clean;
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
  if (axios) {
    const liveFromApi = await fetchFromDiscoveryApi(axios);
    if (liveFromApi) {
      memoryCache.url = liveFromApi;
      memoryCache.expiresAt = now + 18e5;
      if (kvStore && typeof kvStore.set === "function") {
        try {
          await kvStore.set(
            BASE_CACHE_KEY,
            JSON.stringify({ url: liveFromApi, expiresAt: now + 18e5 })
          );
          await kvStore.set(LEARNED_KEY, liveFromApi);
        } catch (e) {
        }
      }
      return liveFromApi;
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get(LEARNED_KEY);
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {
    }
  }
  let githubMirrors = CANDIDATE_MIRRORS;
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3e3 });
      if (res.data && res.data.filmyfly) {
        const entry = res.data.filmyfly;
        if (Array.isArray(entry.mirrors) && entry.mirrors.length > 0) {
          githubMirrors = entry.mirrors;
        }
        if (entry.url && entry.url.startsWith("http")) {
          const cleanUrl = entry.url.replace(/\/+$/, "");
          memoryCache.url = cleanUrl;
          memoryCache.expiresAt = now + 18e5;
          return cleanUrl;
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
      if (origin && origin.startsWith("http") && origin !== currentBase) {
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
