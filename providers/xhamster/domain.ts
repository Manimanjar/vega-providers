"use strict";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
export const DEFAULT_BASE_URL = "https://xhamster.com";
const BASE_CACHE_KEY = "xhamster_baseUrlCacheV1";
const LEARNED_KEY = "xhamster_learnedDomain";

export const CANDIDATE_MIRRORS = [
  "https://xhamster.com",
  "https://xhamster.desi",
];

let memoryCache = { url: "", expiresAt: 0 };

/**
 * Probes candidate mirrors in parallel and returns the first healthy alive mirror.
 * A mirror only counts as healthy if its homepage actually carries a video
 * list (contains "videoThumbProps"). A bare HTTP 200 is NOT enough — some
 * lookalike domains (e.g. xhamster.one, a different site) answer 200 with
 * no video data at all. The site also randomly serves a JS shell page with
 * no video list; a mirror that rolls a shell is simply not picked this time
 * and the caller falls back to the default domain (whose listing fetch
 * retries until it lands a full page).
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
          },
          maxRedirects: 3,
        })
        .then((res: any) => {
          const body = typeof res.data === "string" ? res.data : "";
          const isRealListing =
            res.status >= 200 &&
            res.status < 400 &&
            body.includes("videoThumbProps");
          if (!resolved && isRealListing) {
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
 * Resolves the active XHamster base domain with multi-tier failover and auto-update:
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
      if (res.data && res.data.xhamster && res.data.xhamster.url) {
        const remoteUrl = res.data.xhamster.url.replace(/\/+$/, "");
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

/**
 * Rewrites a link's origin to the active base URL origin, so links the site
 * returns under its canonical domain keep working when the user is on a
 * mirror (or vice versa). Path, query and hash are preserved.
 */
export function rewriteToBase(link: string, baseUrl: string): string {
  if (!link || !baseUrl) return link;
  try {
    const baseOrigin = new URL(baseUrl).origin;
    const u = new URL(link);
    if (u.origin !== baseOrigin) {
      u.protocol = new URL(baseOrigin).protocol;
      u.host = new URL(baseOrigin).host;
      return u.toString();
    }
    return link;
  } catch (e) {
    return link;
  }
}
