import { Info, ProviderContext } from "../types";
import { parsePartTitle, fetchSeriesParts, isExplicitSeriesTitle } from "../series";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://de.pornhub.com";
var memoryCache = { data: null as any, expiresAt: 0 };

async function getBase(kvStore: any, axios: any): Promise<string> {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        return custom.trim().replace(/\/+$/, "");
      }
    } catch (e) {}
  }
  var now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    var cachedEntry = memoryCache.data["pornhub"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }
  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 3000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        var entry = res.data["pornhub"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }
  return DEFAULT_BASE_URL;
}

function parseViews(text: any): number {
  var t = String(text || "").replace(/views?/i, "").trim();
  var m = t.match(/([\d.,]+)\s*([KM])?/i);
  if (!m) return 0;
  var n = parseFloat(m[1].replace(/,/g, "")) || 0;
  if (m[2] && m[2].toUpperCase() === "K") n *= 1000;
  if (m[2] && m[2].toUpperCase() === "M") n *= 1000000;
  return Math.round(n);
}

function parseApiDuration(text: any): number {
  var parts = String(text || "").split(":").map(function (p) {
    return parseInt(p, 10) || 0;
  });
  if (parts.length === 0) return 0;
  var s = 0;
  for (var i = 0; i < parts.length; i++) s = s * 60 + parts[i];
  return s;
}

export function upgradePornhubImageUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  let cleanUrl = url.trim();

  // 1. If it contains an original master poster image (e.g. /original/<uuid>.jpg or /original/<uuid>.png),
  // strip any /plain/... resizing parameters or tokens and serve the master image directly from ei.phncdn.com.
  const origMatch = cleanUrl.match(
    /(?:https?:\/\/[^\/]+)?(\/(?:c\d+\/)?videos\/\d+\/\d+\/\d+\/original\/[^\/?#]+\.(?:jpe?g|png|webp))/i
  );
  if (origMatch && origMatch[1]) {
    return "https://ei.phncdn.com" + origMatch[1];
  }

  // 2. If it's already on unblocked Fastly (pix-fl) with token or Edgecast (pix-egi, ei), preserve it!
  if (
    cleanUrl.includes("pix-egi.phncdn.com") ||
    cleanUrl.includes("ei.phncdn.com") ||
    (cleanUrl.includes("pix-fl.phncdn.com") && cleanUrl.includes("hdnea="))
  ) {
    return cleanUrl;
  }

  // 3. Only rewrite pix-cdn77 -> pix-fl if it carries an hdnea token
  if (cleanUrl.includes("pix-cdn77.phncdn.com") && cleanUrl.includes("hdnea=")) {
    return cleanUrl.replace("pix-cdn77.phncdn.com", "pix-fl.phncdn.com");
  }

  return cleanUrl;
}

function extractViewkey(link: string): string | null {
  const m = String(link || "").match(/viewkey=([a-zA-Z0-9]+)/i);
  return m ? m[1] : null;
}

async function fetchVideoById(
  viewkey: string,
  axios: any,
  candidateBases: string[]
): Promise<any | null> {
  for (const base of candidateBases) {
    try {
      const apiUrl = `${base}/webmasters/video_by_id?id=${viewkey}&thumbsize=large_hd`;
      const res = await axios.get(apiUrl, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: `${base}/`,
          Cookie: "platform=pc; bs=0",
        },
        timeout: 3500,
      });
      if (res.data && res.data.video) {
        return res.data.video;
      }
    } catch (e) {
      // try next candidate base
    }
  }
  return null;
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
  const viewkey = extractViewkey(link);
  const safeWebUrl = link && link.startsWith("http")
    ? link
    : `https://de.pornhub.com${link && link.startsWith("/") ? "" : "/"}${link || ""}`;

  // Priority order: fastest responsive unblocked mirrors first
  const candidateBases = [
    "https://de.pornhub.com",
    "https://www.pornhub.org",
    baseUrl,
    "https://www.pornhub.com",
    "https://rt.pornhub.com",
    "https://www.pornhub.net",
  ].filter((b, idx, arr) => b && arr.indexOf(b) === idx);

  try {
    // 1. High-speed JSON API fetch (completes in ~150-250ms)
    let apiVideo: any = null;
    if (viewkey) {
      apiVideo = await fetchVideoById(viewkey, axios, candidateBases);
    }

    let title = apiVideo ? String(apiVideo.title || "").trim() : "";
    let image = "";

    if (apiVideo) {
      const metaCandidates = [apiVideo.default_thumb, apiVideo.thumb];
      if (apiVideo.thumbs && Array.isArray(apiVideo.thumbs)) {
        for (const t of apiVideo.thumbs) {
          if (t && t.src) metaCandidates.push(t.src);
        }
      }

      // Priority 1: master poster on ei.phncdn.com
      for (const c of metaCandidates) {
        if (c && typeof c === "string" && c.includes("/original/")) {
          const up = upgradePornhubImageUrl(c);
          if (up && up.includes("ei.phncdn.com")) {
            image = up;
            break;
          }
        }
      }

      // Priority 2: valid Fastly pix-fl or Edgecast ei/pix-egi
      if (!image) {
        for (const c of metaCandidates) {
          if (c && typeof c === "string") {
            const up = upgradePornhubImageUrl(c);
            if (
              up &&
              (up.includes("pix-fl.phncdn.com") ||
                up.includes("pix-egi.phncdn.com") ||
                up.includes("ei.phncdn.com"))
            ) {
              image = up;
              break;
            }
          }
        }
      }

      if (!image) {
        image = upgradePornhubImageUrl(apiVideo.default_thumb || apiVideo.thumb || "");
      }
    }

    let tags: string[] = [];
    if (apiVideo && Array.isArray(apiVideo.tags)) {
      tags = apiVideo.tags.map((t: any) => t.tag_name || t).filter(Boolean);
    }
    if (apiVideo && Array.isArray(apiVideo.categories)) {
      apiVideo.categories.forEach((c: any) => {
        const catName = c.category || c;
        if (catName && !tags.includes(catName)) tags.push(catName);
      });
    }

    const cast: string[] = [];
    if (apiVideo && Array.isArray(apiVideo.pornstars)) {
      apiVideo.pornstars.forEach((p: any) => {
        const name = p.pornstar_name || p;
        if (name && !cast.includes(name)) cast.push(name);
      });
    }

    let views = apiVideo ? parseInt(apiVideo.views, 10) || 1000 : 1000;
    let rawRating = apiVideo ? parseFloat(apiVideo.rating) || 0 : 0;
    let durationSec = apiVideo ? parseApiDuration(apiVideo.duration) : 600;

    // 2. Only attempt HTML scrape fallback if apiVideo was null
    if (!apiVideo) {
      const pathPart = viewkey
        ? `/view_video.php?viewkey=${viewkey}`
        : (link.startsWith("http") ? new URL(link).pathname + new URL(link).search : link);

      for (const curBase of candidateBases) {
        const targetUrl = `${curBase}${pathPart.startsWith("/") ? "" : "/"}${pathPart}`;
        try {
          const res = await axios.get(targetUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              Referer: `${curBase}/`,
              Cookie: "platform=pc; bs=0",
            },
            timeout: 3000,
            maxRedirects: 3,
          });

          const html = res.data || "";
          if (typeof html === "string" && html.length > 500) {
            const $ = cheerio.load(html);
            const htmlTitle =
              $("h1").first().text().trim() ||
              $("title").first().text().replace(/- Pornhub\.com/i, "").trim();
            if (htmlTitle && htmlTitle !== "Video") {
              title = htmlTitle;
            }

            const ogImg =
              $('meta[property="og:image"]').attr("content") ||
              $('meta[name="twitter:image"]').attr("content");
            if (ogImg) {
              image = upgradePornhubImageUrl(ogImg);
            }

            const pageViews = parseViews($(".views").first().text());
            if (pageViews > 0) views = pageViews;

            const durMeta = $('meta[property="video:duration"]').attr("content");
            if (durMeta) {
              const d = parseInt(durMeta, 10) || 0;
              if (d > 0) durationSec = d;
            }

            $('a[href*="/video/tag/"], a[href*="/categories/"]').each(function (_: any, el: any) {
              const t = $(el).text().trim();
              if (t && !tags.includes(t) && tags.length < 30) tags.push(t);
            });

            break;
          }
        } catch (e) {}
      }
    }

    // Default fallbacks to guarantee 0 crashes
    const finalTitle = title || (viewkey ? `PornHub Video ${viewkey}` : "PornHub Video");
    const finalImage = image || "https://ci.phncdn.com/www-static/images/pornhub_logo_straight.svg";
    const durationMin = Math.floor((durationSec || 600) / 60);
    const durationRemSec = (durationSec || 600) % 60;
    const durFormatted = `${durationMin}m ${durationRemSec}s`;

    let synopsis = `${finalTitle} • ${durFormatted}.`;
    if (cast.length > 0) synopsis += ` Starring ${cast.join(", ")}.`;
    if (tags.length > 0) synopsis += ` Tags: ${tags.slice(0, 8).join(", ")}.`;

    // Always format rating as a valid string "X.Y/10" to ensure ContentOverview.replace never fails
    const ratingStr = rawRating > 0
      ? (rawRating > 10 ? (rawRating / 10).toFixed(1) : rawRating.toFixed(1)) + "/10"
      : "7.2/10";

    // 3. Series / Parts Expansion:
    // Only query if it is an explicit numbered part of a series
    var parsed = parsePartTitle(finalTitle);
    if (parsed && parsed.partNum != null && isExplicitSeriesTitle(finalTitle)) {
      var seriesParts: any[] = [];
      try {
        seriesParts = await fetchSeriesParts({
          axios: axios,
          cheerio: cheerio,
          baseUrl: "https://de.pornhub.com",
          site: "pornhub",
          baseTitle: parsed.base,
          commonHeaders: commonHeaders,
        });
      } catch (e) {
        seriesParts = [];
      }

      if (seriesParts.length >= 2) {
        var firstImage = (seriesParts[0] && seriesParts[0].image) || finalImage;
        var cleanFirstImage = upgradePornhubImageUrl(firstImage);
        return {
          title: parsed.base || finalTitle,
          synopsis: `${parsed.base} — ${seriesParts.length} parts. ${cast.length > 0 ? "Starring " + cast.join(", ") + "." : ""}`,
          image: cleanFirstImage,
          poster: cleanFirstImage,
          imdbId: "",
          type: "series",
          tags: tags,
          cast: cast,
          rating: ratingStr,
          views: views,
          duration: durationSec,
          webUrl: safeWebUrl,
          linkList: [
            {
              title: "Parts",
              directLinks: seriesParts.map(function (p) {
                return {
                  title: p.title || "Part",
                  link: p.link && p.link.startsWith("http") ? p.link : `https://de.pornhub.com${p.link?.startsWith("/") ? "" : "/"}${p.link || ""}`,
                  type: "movie",
                };
              }),
            },
          ],
        };
      }
    }

    // 4. Return standard movie metadata
    return {
      title: finalTitle,
      synopsis: synopsis,
      image: finalImage,
      poster: finalImage,
      imdbId: "",
      type: "movie",
      tags: tags,
      cast: cast,
      rating: ratingStr,
      views: views,
      duration: durationSec,
      webUrl: safeWebUrl,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: finalTitle || "Watch",
              link: safeWebUrl,
              type: "movie",
            },
          ],
        },
      ],
    };
  } catch (err: any) {
    // Ultimate fail-safe: NEVER crash Vega App
    const fallbackTitle = viewkey ? `PornHub Video ${viewkey}` : "PornHub Video";
    return {
      title: fallbackTitle,
      synopsis: `Watch ${fallbackTitle} on PornHub.`,
      image: "https://ci.phncdn.com/www-static/images/pornhub_logo_straight.svg",
      poster: "https://ci.phncdn.com/www-static/images/pornhub_logo_straight.svg",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "7.0/10",
      views: 1000,
      duration: 600,
      webUrl: safeWebUrl,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: fallbackTitle,
              link: safeWebUrl,
              type: "movie",
            },
          ],
        },
      ],
    };
  }
};
