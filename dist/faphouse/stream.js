// @vega-provider faphouse
// @vega-version 1.0.1
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

// providers/faphouse/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);

// providers/faphouse/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://faphouse2.com";
var BASE_CACHE_KEY = "faphouse_baseUrlCacheV1";
var LEARNED_KEY = "faphouse_learnedDomain";
var CANDIDATE_MIRRORS = [
  "https://faphouse2.com",
  "https://faphouse.com",
  "https://pl.faphouse.com",
  "https://de.faphouse.com",
  "https://fr.faphouse.com",
  "https://it.faphouse.com",
  "https://es.faphouse.com"
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Cookie": "siteMode=desktop; locale=en;"
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
      if (res.data && res.data.faphouse && res.data.faphouse.url) {
        const remoteUrl = res.data.faphouse.url.replace(/\/+$/, "");
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

// providers/faphouse/stream.ts
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
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
    let sessionCookie = "";
    if (kvStore && typeof kvStore.get === "function") {
      try {
        sessionCookie = await kvStore.get("sessionCookie") || "";
      } catch (e) {
      }
    }
    const cookieHeader = sessionCookie ? `siteMode=desktop; locale=en; ${sessionCookie.trim()}` : "siteMode=desktop; locale=en;";
    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        Cookie: cookieHeader
      },
      signal,
      timeout: 1e4,
      maxRedirects: 3
    });
    if (res.request && res.request.responseURL) {
      await recordRedirect(kvStore, targetUrl, res.request.responseURL);
    }
    const html = res.data || "";
    const $ = cheerio.load(html);
    const defaultHeaders = {
      Referer: `${baseUrl}/`,
      "User-Agent": DEFAULT_USER_AGENT,
      Cookie: cookieHeader
    };
    let isFullAccess = false;
    let videoId = "";
    let studioId = "";
    const vsMatch = html.match(/<script id="view-state-data"[^>]*>([\s\S]*?)<\/script>/i);
    if (vsMatch) {
      try {
        const vs = JSON.parse(vsMatch[1]);
        if (vs.video) {
          videoId = String(vs.video.videoId || "");
          studioId = String(vs.video.studioId || "");
          if (vs.video.videoViewAllowed === true) {
            isFullAccess = true;
          }
        }
      } catch (e) {
      }
    }
    if (sessionCookie && videoId && !isFullAccess) {
      try {
        const unlockRes = await axios.post(
          `${baseUrl}/api/unlock/video/${videoId}`,
          { studioId: studioId ? parseInt(studioId, 10) : void 0 },
          {
            headers: {
              "User-Agent": DEFAULT_USER_AGENT,
              "Content-Type": "application/json",
              Referer: targetUrl,
              Cookie: cookieHeader
            },
            timeout: 5e3,
            signal
          }
        );
        if (unlockRes.status >= 200 && unlockRes.status < 300) {
          isFullAccess = true;
        }
      } catch (e) {
      }
    }
    let fullHlsMatch = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (fullHlsMatch && !fullHlsMatch[0].includes("/trailer/")) {
      streams.push({
        server: "FapHouse HLS Full Stream",
        link: fullHlsMatch[0],
        type: "m3u8",
        headers: defaultHeaders
      });
    }
    let rawSource = $("video#video-trailer source").first().attr("src") || $("video#video-trailer").attr("data-fallback") || $("video source").first().attr("src") || $("link[as='fetch'][href*='.mp4']").first().attr("href") || "";
    if (!rawSource) {
      const match = html.match(
        /https?:\/\/video-nss\.fhcdnmedia\.online\/[^\s"'<>]+\.mp4/i
      );
      if (match) rawSource = match[0];
    }
    if (!rawSource && streams.length === 0) {
      return [];
    }
    if (rawSource) {
      const qualMatch = rawSource.match(/\/trailer\/(\d+)\.mp4/i);
      const detectedQual = qualMatch ? qualMatch[1] : "1080";
      const candidateQualities = ["2160", "1080", "720", "480"];
      const labelPrefix = isFullAccess ? "FapHouse Direct CDN" : "FapHouse Preview (Free Trailer)";
      const probePromises = candidateQualities.map(async (q) => {
        const qUrl = rawSource.replace(/\/trailer\/\d+\.mp4/i, `/trailer/${q}.mp4`);
        try {
          const headRes = await axios.head(qUrl, {
            headers: defaultHeaders,
            timeout: 2500,
            signal,
            validateStatus: (s) => s >= 200 && s < 400
          });
          if (headRes.status >= 200 && headRes.status < 400) {
            return { q, url: qUrl, ok: true };
          }
        } catch (e) {
        }
        return { q, url: qUrl, ok: false };
      });
      const probeResults = await Promise.all(probePromises);
      for (const r of probeResults) {
        if (r.ok) {
          streams.push({
            server: `${labelPrefix} (${r.q}p)`,
            link: r.url,
            type: "mp4",
            quality: `${r.q}p`,
            headers: defaultHeaders
          });
        }
      }
      if (streams.length === 0) {
        streams.push({
          server: `${labelPrefix} (${detectedQual}p)`,
          link: rawSource,
          type: "mp4",
          quality: `${detectedQual}p`,
          headers: defaultHeaders
        });
      }
    }
    return streams;
  } catch (err) {
    return [];
  }
};
