// @vega-provider xhamster
// @vega-version 1.0.0
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

// providers/xhamster/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);

// providers/xhamster/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://xhamster.com";
var BASE_CACHE_KEY = "xhamster_baseUrlCacheV1";
var LEARNED_KEY = "xhamster_learnedDomain";
var CANDIDATE_MIRRORS = [
  "https://xhamster.com",
  "https://xhamster.desi"
];
var memoryCache = { url: "", expiresAt: 0 };
async function probeMirrors(axios, mirrors) {
  if (!axios || !mirrors || mirrors.length === 0) return null;
  return new Promise((resolve) => {
    let resolved = false;
    let pending = mirrors.length;
    for (const mirror of mirrors) {
      axios.get(mirror, {
        timeout: 4e3,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        maxRedirects: 3
      }).then((res) => {
        const body = typeof res.data === "string" ? res.data : "";
        const isRealListing = res.status >= 200 && res.status < 400 && body.includes("videoThumbProps");
        if (!resolved && isRealListing) {
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
          memoryCache = cached;
          return cached.url;
        }
      }
    } catch (e) {
    }
  }
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get(LEARNED_KEY);
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        const clean = learned.trim().replace(/\/+$/, "");
        memoryCache = { url: clean, expiresAt: now + 18e5 };
        return clean;
      }
    } catch (e) {
    }
  }
  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 3500 });
      if (res.data && res.data.xhamster && res.data.xhamster.url) {
        const remoteUrl = res.data.xhamster.url.replace(/\/+$/, "");
        memoryCache = { url: remoteUrl, expiresAt: now + 18e5 };
        if (kvStore && typeof kvStore.set === "function") {
          try {
            await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
          } catch (e) {
          }
        }
        return remoteUrl;
      }
    } catch (e) {
    }
  }
  const probed = await probeMirrors(axios, CANDIDATE_MIRRORS);
  if (probed) {
    memoryCache = { url: probed, expiresAt: now + 18e5 };
    if (kvStore && typeof kvStore.set === "function") {
      try {
        await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
      } catch (e) {
      }
    }
    return probed;
  }
  return DEFAULT_BASE_URL;
}
async function recordRedirect(kvStore, requestedUrl, finalUrl) {
  if (!requestedUrl || !finalUrl || requestedUrl === finalUrl) return;
  try {
    const origOrigin = new URL(requestedUrl).origin.replace(/\/+$/, "");
    const finalOrigin = new URL(finalUrl).origin.replace(/\/+$/, "");
    if (origOrigin !== finalOrigin && finalOrigin.startsWith("http")) {
      memoryCache = { url: finalOrigin, expiresAt: Date.now() + 18e5 };
      if (kvStore && typeof kvStore.set === "function") {
        await kvStore.set(LEARNED_KEY, finalOrigin);
        await kvStore.set(BASE_CACHE_KEY, JSON.stringify(memoryCache));
      }
    }
  } catch (e) {
  }
}
function rewriteToBase(link, baseUrl) {
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

// providers/xhamster/stream.ts
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var MOBILE_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
var MAX_STREAM_ATTEMPTS = 2;
function toMobileUrl(desktopUrl) {
  try {
    const u = new URL(desktopUrl);
    if (!u.hostname.startsWith("m.")) {
      u.hostname = `m.${u.hostname}`;
    }
    return u.toString();
  } catch (e) {
    return desktopUrl;
  }
}
function buildMobileCandidates(targetUrl) {
  const candidates = [];
  const add = (u) => {
    if (u && !candidates.includes(u)) candidates.push(u);
  };
  add(toMobileUrl(targetUrl));
  for (const mirror of CANDIDATE_MIRRORS) {
    try {
      const mirrorHost = new URL(mirror).host;
      const u = new URL(targetUrl);
      u.host = mirrorHost;
      add(toMobileUrl(u.toString()));
    } catch (e) {
    }
  }
  try {
    const u = new URL(targetUrl);
    u.host = new URL("https://xhamster.com").host;
    add(toMobileUrl(u.toString()));
  } catch (e) {
  }
  return candidates;
}
var getStream = async function({
  link,
  type,
  signal,
  providerContext
}) {
  const { axios, cheerio, kvStore } = providerContext;
  const streams = [];
  try {
    const baseUrl = await getBaseUrl(kvStore, axios);
    let targetUrl = link;
    if (!targetUrl.startsWith("http")) {
      targetUrl = `${baseUrl}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
    }
    targetUrl = rewriteToBase(targetUrl, baseUrl);
    const mobileCandidates = buildMobileCandidates(targetUrl);
    let sessionCookie = "";
    if (kvStore && typeof kvStore.get === "function") {
      try {
        sessionCookie = await kvStore.get("sessionCookie") || "";
      } catch (e) {
      }
    }
    const cookieHeader = String(sessionCookie || "").trim();
    const defaultHeaders = {
      Referer: targetUrl,
      "User-Agent": DEFAULT_USER_AGENT,
      ...cookieHeader ? { Cookie: cookieHeader } : {}
    };
    let hlsUrl = "";
    let mp4Url = "";
    for (const mobileUrl of mobileCandidates) {
      if (hlsUrl && mp4Url) break;
      for (let attempt = 1; attempt <= MAX_STREAM_ATTEMPTS; attempt++) {
        try {
          const res = await axios.get(mobileUrl, {
            headers: {
              "User-Agent": MOBILE_USER_AGENT,
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              Referer: targetUrl,
              ...cookieHeader ? { Cookie: cookieHeader } : {}
            },
            signal,
            timeout: 15e3,
            maxRedirects: 3
          });
          if (res.request && res.request.responseURL) {
            await recordRedirect(kvStore, mobileUrl, res.request.responseURL);
          }
          const html = res.data || "";
          const $ = cheerio.load(html);
          if (!hlsUrl) {
            const preload = $("link[rel='preload'][as='fetch'][href*='.m3u8']").first().attr("href");
            if (preload && preload.startsWith("http")) {
              hlsUrl = preload.trim();
            }
          }
          if (!hlsUrl) {
            const m3u8Match = html.match(
              /https?:\/\/[^\s"'<>]*?\.m3u8/i
            );
            if (m3u8Match && m3u8Match[0].includes("xhcdn.com")) {
              hlsUrl = m3u8Match[0].trim();
            }
          }
          if (!mp4Url) {
            const noscriptMatch = html.match(
              /<noscript>\s*<video[^>]*src="([^"]+)"/i
            );
            if (noscriptMatch && noscriptMatch[1].startsWith("http")) {
              mp4Url = noscriptMatch[1].trim();
            }
          }
          if (!mp4Url) {
            const mp4Match = html.match(
              /https?:\/\/[^\s"'<>]*?\.h264\.mp4/i
            );
            if (mp4Match && !mp4Match[0].includes(".m3u8")) {
              mp4Url = mp4Match[0].trim();
            }
          }
          if (hlsUrl || mp4Url) break;
        } catch (e) {
        }
        if (attempt < MAX_STREAM_ATTEMPTS && !hlsUrl && !mp4Url) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      if (hlsUrl && mp4Url) break;
    }
    if (hlsUrl) {
      streams.push({
        server: "XHamster HLS",
        link: hlsUrl,
        type: "m3u8",
        quality: "1080p",
        headers: defaultHeaders
      });
    }
    if (mp4Url) {
      const qualMatch = mp4Url.match(/\/(\d+)p\.h264\.mp4/i);
      const qual = qualMatch ? `${qualMatch[1]}p` : "480p";
      streams.push({
        server: `XHamster Direct (${qual})`,
        link: mp4Url,
        type: "mp4",
        quality: qual,
        headers: defaultHeaders
      });
    }
    return streams;
  } catch (err) {
    return [];
  }
};
