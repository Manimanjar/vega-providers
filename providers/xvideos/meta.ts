import { Info, ProviderContext } from "../types";
import { parsePartTitle, fetchSeriesParts } from "../series";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://www.xvideos.com";
const BASE_CACHE_KEY = "xvideos_baseUrlCacheV1";
let memoryCache = { data: null as any, expiresAt: 0 };

async function getBase(kvStore: any, axios: any): Promise<string> {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {}
  }

  const now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    const cachedEntry = memoryCache.data["xvideos"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("xvideos_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
    try {
      const cachedRaw = await kvStore.get(BASE_CACHE_KEY);
      if (cachedRaw) {
        const cached =
          typeof cachedRaw === "string" ? JSON.parse(cachedRaw) : cachedRaw;
        if (cached && cached.url && cached.expiresAt > now) {
          return String(cached.url).replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

function raceMirrors(
  candidateBases: string[],
  pathPart: string,
  axios: any,
  commonHeaders: any,
  maxAttemptsPerMirror = 3
): Promise<{ html: string; workingBase: string; effectiveUrl: string } | null> {
  return new Promise((resolve) => {
    let resolved = false;
    let pending = candidateBases.length;
    if (pending === 0) {
      resolve(null);
      return;
    }

    const attemptMirror = (curBase: string, attempt: number) => {
      if (resolved) return;
      const targetUrl = `${curBase}${pathPart}`;
      axios
        .get(targetUrl, {
          headers: {
            ...commonHeaders,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: `${curBase}/`,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          timeout: 4500,
          maxRedirects: 5,
        })
        .then((res: any) => {
          if (resolved) return;
          const html = typeof res.data === "string" ? res.data : "";
          if (html.includes("html5player") || html.length > 500) {
            resolved = true;
            const finalUrl = res.request?.res?.responseUrl || targetUrl;
            const hostMatch = finalUrl.match(/^https?:\/\/[^\/]+/);
            resolve({
              html,
              workingBase: hostMatch ? hostMatch[0] : curBase,
              effectiveUrl: finalUrl,
            });
            return;
          }
          pending--;
          if (pending === 0 && !resolved) resolve(null);
        })
        .catch((err: any) => {
          if (resolved) return;
          const status = err?.response?.status;
          if (!status && attempt < maxAttemptsPerMirror) {
            setTimeout(() => attemptMirror(curBase, attempt + 1), 100);
            return;
          }
          pending--;
          if (pending === 0 && !resolved) resolve(null);
        });
    };

    for (const curBase of candidateBases) {
      attemptMirror(curBase, 1);
    }
  });
}

function parseDurationSeconds(text: string): number {
  if (!text) return 0;
  let sec = 0;
  const hMatch = text.match(/(\d+)\s*h/i);
  const mMatch = text.match(/(\d+)\s*min/i);
  const sMatch = text.match(/(\d+)\s*sec/i);
  if (hMatch) sec += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) sec += parseInt(mMatch[1], 10) * 60;
  if (sMatch) sec += parseInt(sMatch[1], 10);
  return sec;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);

  let pathPart = link || "";
  if (pathPart.startsWith("http")) {
    try {
      const parsedUrl = new URL(pathPart);
      pathPart = parsedUrl.pathname + parsedUrl.search;
    } catch (e) {}
  }
  if (!pathPart.startsWith("/")) {
    pathPart = "/" + pathPart;
  }
  pathPart = pathPart.replace(/\/THUMBNUM\//gi, "/0/");

  const candidateBases = [
    baseUrl,
    "https://www.xvideos.com",
    "https://www.xvideos3.com",
    "https://www.xvideos2.com",
  ].filter((b, idx, arr) => b && arr.indexOf(b) === idx);

  let effectiveUrl = `${baseUrl}${pathPart}`;

  try {
    let winner = await raceMirrors(candidateBases, pathPart, axios, commonHeaders);
    if (!winner) {
      // One fast retry wave if all mirrors had a transient blip
      winner = await raceMirrors(candidateBases, pathPart, axios, commonHeaders);
    }
    if (!winner) {
      throw new Error("No HTML returned from any XVideos mirror");
    }

    const { html, workingBase } = winner;
    effectiveUrl = winner.effectiveUrl;
    if (kvStore && typeof kvStore.set === "function" && workingBase) {
      try {
        kvStore.set("xvideos_learnedDomain", workingBase);
      } catch (e) {}
    }

    const $ = cheerio.load(html);

    const playerTitleMatch = html.match(
      /html5player\.setVideoTitle\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const title =
      (playerTitleMatch ? playerTitleMatch[1] : null) ||
      $("h2.page-title, .page-title, title")
        .first()
        .text()
        .replace(/- XVIDEOS\.COM/i, "")
        .trim() ||
      "Video";

    // Prefer JPG thumbnails over .avif (React Native Android <Image> handles JPG reliably)
    const playerThumbMatch = html.match(
      /html5player\.setThumbUrl\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const playerThumb169Match = html.match(
      /html5player\.setThumbUrl169\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    const ogImage = $('meta[property="og:image"]').attr("content") || "";
    const thumb169 = playerThumb169Match ? playerThumb169Match[1] : "";
    const thumbStd = playerThumbMatch ? playerThumbMatch[1] : "";

    const image =
      (thumb169 && !thumb169.endsWith(".avif") ? thumb169 : "") ||
      (ogImage && !ogImage.endsWith(".avif") ? ogImage : "") ||
      thumbStd ||
      thumb169 ||
      ogImage ||
      "";

    const tags: string[] = [];
    $('.video-tags-list a[href^="/tags/"]').each((_: any, el: any) => {
      const tagText = $(el).text().trim();
      if (tagText && tagText !== "Edit tags" && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });

    const cast: string[] = [];
    $(
      '.video-tags-list a[href^="/models/"], .video-tags-list a[href^="/amateurs/"]'
    ).each((_: any, el: any) => {
      const name = $(el)
        .clone()
        .find(".count, .user-subscribe")
        .remove()
        .end()
        .text()
        .trim()
        .replace(/\s*\d+[kM]?$/, "");
      if (name && !cast.includes(name)) {
        cast.push(name);
      }
    });

    const duration = $(".duration, .video-duration").first().text().trim();
    const durationSec = parseDurationSeconds(duration);
    const quality =
      html.includes("setVideoUrlHigh") || html.includes("1080p")
        ? "1080p"
        : "720p";

    const ratingMatch = $(".rating-good-perc").first().text().trim().match(/(\d+)/);
    const ratingVal = ratingMatch ? (parseInt(ratingMatch[1], 10) / 10).toFixed(1) : "8.2";
    const ratingStr = `${ratingVal}/10`;

    const synopsisParts = [
      `${title}${duration ? ` — ${duration}` : ""} • ${quality}.`,
    ];
    if (cast.length > 0) {
      synopsisParts.push(`Starring ${cast.join(", ")}.`);
    }
    if (tags.length > 0) {
      synopsisParts.push(`Tags: ${tags.join(", ")}.`);
    }
    const synopsis = synopsisParts.join(" ");

    const parsed = parsePartTitle(title);
    if (parsed && parsed.partNum != null) {
      let seriesParts: any[] = [];
      try {
        seriesParts = await fetchSeriesParts({
          axios: axios,
          cheerio: cheerio,
          baseUrl: workingBase,
          site: "xvideos",
          baseTitle: parsed.base,
          commonHeaders: commonHeaders,
        });
      } catch (e) {
        seriesParts = [];
      }
      if (seriesParts.length >= 2) {
        const firstImage = (seriesParts[0] && seriesParts[0].image) || image;
        const seriesSynopsisParts = [
          parsed.base + " — " + seriesParts.length + " parts • " + quality + ".",
        ];
        if (cast.length > 0) {
          seriesSynopsisParts.push("Starring " + cast.join(", ") + ".");
        }
        if (tags.length > 0) {
          seriesSynopsisParts.push("Tags: " + tags.join(", ") + ".");
        }
        return {
          title: parsed.base,
          synopsis: seriesSynopsisParts.join(" "),
          image: firstImage,
          poster: firstImage,
          imdbId: "",
          type: "series",
          tags: tags,
          cast: cast,
          rating: ratingStr,
          duration: durationSec || 600,
          webUrl: effectiveUrl,
          linkList: [
            {
              title: "Parts",
              directLinks: seriesParts.map(function (p) {
                return { title: p.title, link: p.link, type: "movie" };
              }),
            },
          ],
        };
      }
    }

    return {
      title,
      synopsis,
      image,
      poster: image,
      imdbId: "",
      type: "movie",
      tags: tags,
      cast: cast,
      rating: ratingStr,
      duration: durationSec || 600,
      webUrl: effectiveUrl,
      linkList: [
        {
          title: "Stream Video",
          quality,
          directLinks: [
            {
              title: title,
              link: effectiveUrl,
              type: "movie",
            },
          ],
        },
      ],
    };
  } catch (err: any) {
    console.error("XVideos meta error:", err?.message || err);
    return {
      title: "XVideos Video",
      synopsis: "Watch video on XVideos.",
      image: "",
      poster: "",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "8.0/10",
      duration: 600,
      webUrl: effectiveUrl,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: "Play",
              link: effectiveUrl,
              type: "movie",
            },
          ],
        },
      ],
    };
  }
};
