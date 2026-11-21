"use strict";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
export const DEFAULT_BASE_URL = "https://faphouse2.com";
const BASE_CACHE_KEY = "faphouse_baseUrlCacheV1";
const LEARNED_KEY = "faphouse_learnedDomain";

const CANDIDATE_MIRRORS = [
  "https://faphouse2.com",
  "https://faphouse.com",
  "https://pl.faphouse.com",
  "https://de.faphouse.com",
  "https://fr.faphouse.com",
  "https://it.faphouse.com",
  "https://es.faphouse.com",
];

let memoryCache = { url: "", expiresAt: 0 };

/**
 * Probes candidate mirrors in parallel and returns the first healthy alive mirror.
 */
async function probeMirrors(axios: any, mirrors: string[]): Promise<string | null> {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  return new Promise((resolve) => {
    let resolved = false;
    let pending = mirrors.length;

    for (const mirror of mirrors) {
      axios
        .get(mirror, {
          timeout: 4000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Cookie": "siteMode=desktop; locale=en;",
          },
          maxRedirects: 3,
        })
        .then((res: any) => {
          if (!resolved && res.status >= 200 && res.status < 400) {
            resolved = true;
            let origin = mirror;
            if (res.request && res.request.responseURL) {
              try {
                origin = new URL(res.request.responseURL).origin;
              } catch (e) {}
            }
            resolve(origin.replace(/\/+$/, ""));
          }
        })
        .catch(() => {})
        .finally(() => {
          pending--;
          if (pending === 0 && !resolved) resolve(null);
        });
    }

    setTimeout(() => {
      if (!resolved) resolve(null);
    }, 4500);
  });
}

/**
 * Resolves the active FapHouse base domain with multi-tier failover and auto-update:
 * 1. User manual override from settings
 * 2. In-memory cached URL (30 min TTL)
 * 3. Persistent cache from kvStore
 * 4. Learned domain from kvStore (auto-redirect)
 * 5. urls.json from GitHub
 * 6. Parallel mirror health probe
 * 7. Hardcoded default mirror fallback
 */
export async function getBaseUrl(kvStore: any, axios: any): Promise<string> {
  // 1. User settings override
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const clean = custom.trim().replace(/\/+$/, "");
        if (clean !== DEFAULT_BASE_URL) return clean;
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
          memoryCache = cached;
          return cached.url;
        }
      }
    } catch (e) {}
  }

  // 4. Persistent learned domain
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get(LEARNED_KEY);
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        const clean = learned.trim().replace(/\/+$/, "");
        memoryCache = { url: clean, expiresAt: now + 1800000 };
        return clean;
      }
    } catch (e) {}
  }

  // 5. Remote urls.json
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3500 });
      if (res.data && res.data.faphouse && res.data.faphouse.url) {
        const remoteUrl = res.data.faphouse.url.replace(/\/+$/, "");
        memoryCache = { url: remoteUrl, expiresAt: now + 1800000 };
        if (kvStore && typeof kvStore.set === "function") {
          try {
            await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
          } catch (e) {}
        }
        return remoteUrl;
      }
    } catch (e) {}
  }

  // 6. Parallel mirror health probe
  const probed = await probeMirrors(axios, CANDIDATE_MIRRORS);
  if (probed) {
    memoryCache = { url: probed, expiresAt: now + 1800000 };
    if (kvStore && typeof kvStore.set === "function") {
      try {
        await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
      } catch (e) {}
    }
    return probed;
  }

  // 7. Hardcoded default mirror fallback
  return DEFAULT_BASE_URL;
}

/**
 * Automatically records a redirect to learn the active domain when a request
 * gets redirected to a new domain name.
 */
export async function recordRedirect(
  kvStore: any,
  requestedUrl: string,
  finalUrl: string
): Promise<void> {
  if (!requestedUrl || !finalUrl || requestedUrl === finalUrl) return;
  try {
    const origOrigin = new URL(requestedUrl).origin.replace(/\/+$/, "");
    const finalOrigin = new URL(finalUrl).origin.replace(/\/+$/, "");
    if (origOrigin !== finalOrigin && finalOrigin.startsWith("http")) {
      memoryCache = { url: finalOrigin, expiresAt: Date.now() + 1800000 };
      if (kvStore && typeof kvStore.set === "function") {
        await kvStore.set(LEARNED_KEY, finalOrigin);
        await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
      }
    }
  } catch (e) {}
}
