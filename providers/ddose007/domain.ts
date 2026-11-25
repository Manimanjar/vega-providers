"use strict";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://ddose007.co";
const BASE_CACHE_KEY = "ddose007_baseUrlCacheV4";
const LEARNED_KEY = "ddose007_learnedDomainV2";

const CANDIDATE_MIRRORS = [
  "https://ddose007.co",
  "https://ddose007.cc",
];

let memoryCache = { url: "", expiresAt: 0 };

async function isHealthyMirror(axios: any, mirror: string): Promise<boolean> {
  try {
    const res = await axios.get(mirror, {
      timeout: 4500,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      maxRedirects: 3,
    });
    if (res.status >= 200 && res.status < 400) {
      const dataStr = typeof res.data === "string" ? res.data : "";
      if (
        !dataStr.includes("Just a moment...") &&
        !dataStr.includes("cf-mitigated") &&
        !res.headers?.["cf-mitigated"]
      ) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

/**
 * Probes candidate mirrors in order and returns the first healthy alive mirror.
 */
async function probeMirrors(axios: any, mirrors: string[]): Promise<string | null> {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  for (const mirror of mirrors) {
    const ok = await isHealthyMirror(axios, mirror);
    if (ok) return mirror.replace(/\/+$/, "");
  }
  return null;
}

/**
 * Resolves the active Ddose007 base domain with multi-tier failover and auto-update.
 */
export async function getBaseUrl(kvStore: any, axios: any): Promise<string> {
  // 1. User settings override
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const clean = custom.trim().replace(/\/+$/, "");
        if (clean !== DEFAULT_BASE_URL && !clean.includes("ddose007.cc") && !clean.includes("instavipclub")) {
          return clean;
        }
      }
    } catch (e) {}
  }

  const now = Date.now();

  // 2. In-memory cache
  if (memoryCache.url && now < memoryCache.expiresAt) {
    return memoryCache.url;
  }

  // 3. Persistent cache from kvStore
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached =
          typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > now) {
          memoryCache.url = String(cached.url).replace(/\/+$/, "");
          memoryCache.expiresAt = cached.expiresAt;
          return memoryCache.url;
        }
      }
    } catch (e) {}
  }

  // 4. Check previously learned domain (verify it's not a blocked/old domain)
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get(LEARNED_KEY);
      if (
        learned &&
        typeof learned === "string" &&
        learned.startsWith("http") &&
        !learned.includes("instavipclub")
      ) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  // 5. Fetch urls.json from GitHub and verify health
  let githubMirrors = CANDIDATE_MIRRORS;
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3000 });
      if (res.data && res.data.ddose007) {
        const entry = res.data.ddose007;
        if (Array.isArray(entry.mirrors) && entry.mirrors.length > 0) {
          githubMirrors = entry.mirrors;
        }
        if (entry.url && entry.url.startsWith("http")) {
          const cleanUrl = entry.url.replace(/\/+$/, "");
          if (await isHealthyMirror(axios, cleanUrl)) {
            memoryCache.url = cleanUrl;
            memoryCache.expiresAt = now + 1800000;
            if (kvStore && typeof kvStore.set === "function") {
              try {
                await kvStore.set(
                  BASE_CACHE_KEY,
                  JSON.stringify({ url: cleanUrl, expiresAt: now + 1800000 })
                );
              } catch (e) {}
            }
            return cleanUrl;
          }
        }
      }
    } catch (e) {}
  }

  // 6. Mirror probe
  if (axios) {
    const probed = await probeMirrors(axios, githubMirrors);
    if (probed) {
      memoryCache.url = probed;
      memoryCache.expiresAt = now + 1800000;
      if (kvStore && typeof kvStore.set === "function") {
        try {
          await kvStore.set(LEARNED_KEY, probed);
          await kvStore.set(
            BASE_CACHE_KEY,
            JSON.stringify({ url: probed, expiresAt: now + 1800000 })
          );
        } catch (e) {}
      }
      return probed;
    }
  }

  return DEFAULT_BASE_URL;
}

/**
 * Intercepts HTTP response URL and updates the learned domain if Ddose007 redirected to a new TLD.
 */
export function recordRedirect(res: any, currentBase: string, kvStore: any) {
  if (res && res.request && res.request.responseURL) {
    try {
      const u = new URL(res.request.responseURL);
      const origin = u.origin.replace(/\/+$/, "");
      if (
        origin &&
        origin.startsWith("http") &&
        origin !== currentBase &&
        !origin.includes("instavipclub")
      ) {
        memoryCache.url = origin;
        memoryCache.expiresAt = Date.now() + 1800000;
        kvStore?.set(LEARNED_KEY, origin);
        kvStore?.set(
          BASE_CACHE_KEY,
          JSON.stringify({ url: origin, expiresAt: Date.now() + 1800000 })
        );
      }
    } catch (e) {}
  }
}
