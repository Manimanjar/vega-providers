// @vega-provider ddose007
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

// providers/ddose007/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});
module.exports = __toCommonJS(stream_exports);

// providers/ddose007/domain.ts
var URLS_ENDPOINT = "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://instavipclub.com";
var BASE_CACHE_KEY = "ddose007_baseUrlCacheV1";
var LEARNED_KEY = "ddose007_learnedDomain";
var CANDIDATE_MIRRORS = [
  "https://instavipclub.com",
  "https://instavipclub.net",
  "https://ddose007.cc",
  "https://ddose007.net",
  "https://ddose007.com"
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
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
      if (res.data && res.data.ddose007) {
        const entry = res.data.ddose007;
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

// providers/ddose007/stream.ts
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function safeUnpackJs(js) {
  if (!js) return "";
  try {
    const evalMatch = js.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\('\|'\)\)\)/) || js.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\("\\|"\)\)\)/);
    if (evalMatch) {
      const code = evalMatch[0].replace(/^eval/, "");
      return Function(`"use strict"; return (${code})`)();
    }
  } catch (e) {
  }
  return js;
}
async function getStream(linkOrOptions, typeArg, signalArg, providerContextArg, isDownloadArg) {
  let link = "";
  let signal = null;
  let providerContext = null;
  let isDownload = false;
  if (linkOrOptions && typeof linkOrOptions === "object" && ("providerContext" in linkOrOptions || "link" in linkOrOptions)) {
    link = linkOrOptions.link || "";
    signal = linkOrOptions.signal || null;
    providerContext = linkOrOptions.providerContext || null;
    isDownload = Boolean(linkOrOptions.isDownload);
  } else {
    link = linkOrOptions || "";
    signal = signalArg || null;
    providerContext = providerContextArg || null;
    isDownload = Boolean(isDownloadArg);
  }
  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;
  if (!axios || !cheerio || !link) return [];
  const baseUrl = await getBaseUrl(kvStore, axios);
  try {
    const pageRes = await axios.get(link, {
      timeout: 8e3,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: baseUrl,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
    const pageHtml = String(pageRes.data || "");
    const $ = cheerio.load(pageHtml);
    let fileCode = "";
    $("iframe").each((_, el) => {
      const src = $(el).attr("data-src") || $(el).attr("src") || "";
      const m = src.match(/(?:streamfiles?\.net)\/(?:e\/)?([a-zA-Z0-9_-]+)/);
      if (m && !fileCode) {
        fileCode = m[1].replace(/\.html$/, "");
      }
    });
    if (!fileCode) {
      $('a[href*="streamfile"]').each((_, el) => {
        const href = $(el).attr("href") || "";
        const m = href.match(/(?:streamfiles?\.net)\/(?:e\/)?([a-zA-Z0-9_-]+)/);
        if (m && !fileCode) {
          fileCode = m[1].replace(/\.html$/, "");
        }
      });
    }
    if (!fileCode) {
      const rawMatch = pageHtml.match(
        /(?:streamfiles?\.net)\/(?:e\/)?([a-zA-Z0-9_-]+)\.html/
      );
      if (rawMatch) {
        fileCode = rawMatch[1];
      }
    }
    if (!fileCode) return [];
    const postBody = `op=play&file_code=${fileCode}&embed=1&u=%2Fe%2F${fileCode}.html&ref=${encodeURIComponent(
      link
    )}`;
    const dlRes = await axios.post("https://streamfile.net/dl", postBody, {
      timeout: 9e3,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `https://streamfile.net/e/${fileCode}.html`,
        Origin: "https://streamfile.net",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, text/javascript, */*; q=0.01"
      }
    });
    const dlData = dlRes.data || {};
    const jsCode = dlData.js || "";
    const htmlCode = dlData.html || "";
    const unpacked = safeUnpackJs(jsCode);
    const combined = `${unpacked}
${jsCode}
${htmlCode}`;
    let masterM3u8 = "";
    const m3u8Match = combined.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*\b/);
    if (m3u8Match) {
      masterM3u8 = m3u8Match[0];
    }
    if (!masterM3u8) {
      const cleanM3u8 = combined.match(/https?:\/\/[a-zA-Z0-9_.-]+\.site\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
      if (cleanM3u8) {
        masterM3u8 = cleanM3u8[0];
      }
    }
    if (!masterM3u8) return [];
    const streams = [];
    const headers = {
      Referer: "https://streamfile.net/",
      Origin: "https://streamfile.net",
      "User-Agent": USER_AGENT
    };
    streams.push({
      server: "Fast CDN (Adaptive Auto)",
      link: masterM3u8,
      type: "m3u8",
      quality: "auto",
      headers
    });
    if (masterM3u8.includes(".urlset/master.m3u8")) {
      if (masterM3u8.includes(`${fileCode}_x`)) {
        const u1080 = masterM3u8.replace(
          /,[^,]*\.urlset\/master\.m3u8/,
          `/${fileCode}_x/index-v1-a1.m3u8`
        );
        streams.push({
          server: "Fast CDN (1080p FHD)",
          link: u1080,
          type: "m3u8",
          quality: "1080",
          headers
        });
      }
      if (masterM3u8.includes(`${fileCode}_h`)) {
        const u720 = masterM3u8.replace(
          /,[^,]*\.urlset\/master\.m3u8/,
          `/${fileCode}_h/index-v1-a1.m3u8`
        );
        streams.push({
          server: "Fast CDN (720p HD)",
          link: u720,
          type: "m3u8",
          quality: "720",
          headers
        });
      }
      if (masterM3u8.includes(`${fileCode}_n`)) {
        const u480 = masterM3u8.replace(
          /,[^,]*\.urlset\/master\.m3u8/,
          `/${fileCode}_n/index-v1-a1.m3u8`
        );
        streams.push({
          server: "Fast CDN (480p SD)",
          link: u480,
          type: "m3u8",
          quality: "480",
          headers
        });
      }
      if (masterM3u8.includes(`${fileCode}_l`)) {
        const u360 = masterM3u8.replace(
          /,[^,]*\.urlset\/master\.m3u8/,
          `/${fileCode}_l/index-v1-a1.m3u8`
        );
        streams.push({
          server: "Fast CDN (360p Low)",
          link: u360,
          type: "m3u8",
          quality: "360",
          headers
        });
      }
    }
    if (isDownload) {
      streams.sort((a, b) => {
        const qA = parseInt(a.quality || "0", 10) || 0;
        const qB = parseInt(b.quality || "0", 10) || 0;
        return qB - qA;
      });
    }
    return streams;
  } catch (e) {
    return [];
  }
}
