import { Info, ProviderContext } from "../types";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.pornhub.com";
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
      var res = await axios.get(URLS_ENDPOINT, { timeout: 4000 });
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
  const origMatch = cleanUrl.match(
    /(https?:\/\/[^\/]+)?(\/(?:c\d+\/)?videos\/\d+\/\d+\/\d+\/original\/[^\/?#]+\.(?:jpe?g|png|webp))/i
  );
  if (origMatch) {
    return "https://ei.phncdn.com" + origMatch[2];
  }
  cleanUrl = cleanUrl.replace(/https?:\/\/[a-z0-9.-]*phncdn\.com/i, "https://ei.phncdn.com");
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
    for (let retry = 0; retry < 2; retry++) {
      try {
        const apiUrl = `${base}/webmasters/video_by_id?id=${viewkey}&thumbsize=large`;
        const res = await axios.get(apiUrl, {
          headers: {
            Accept: "application/json, text/plain, */*",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: `${base}/`,
            Cookie: "platform=pc; bs=0",
          },
          timeout: 6000,
        });
        if (res.data && res.data.video) {
          return res.data.video;
        }
      } catch (e) {
        if (retry === 0) await new Promise((r) => setTimeout(r, 200));
      }
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

  const candidateBases = [
    baseUrl,
    "https://www.pornhub.com",
    "https://rt.pornhub.com",
    "https://de.pornhub.com",
    "https://www.pornhub.org",
    "https://www.pornhub.net",
  ].filter((b, idx, arr) => arr.indexOf(b) === idx);

  // 1. First, fetch from high-reliability Webmasters JSON API
  let apiVideo: any = null;
  if (viewkey) {
    apiVideo = await fetchVideoById(viewkey, axios, candidateBases);
  }

  // 2. Prepare base info from API data
  let title = apiVideo ? String(apiVideo.title || "").trim() : "";
  let image = "";
  if (apiVideo) {
    if (apiVideo.thumb) {
      image = upgradePornhubImageUrl(apiVideo.thumb);
    }
    if (!image && apiVideo.thumbs && Array.isArray(apiVideo.thumbs) && apiVideo.thumbs.length > 0) {
      const origThumb = apiVideo.thumbs.find((t: any) => t && t.src && t.src.includes("/original/"));
      if (origThumb && origThumb.src) {
        image = upgradePornhubImageUrl(origThumb.src);
      } else {
        const fl = apiVideo.thumbs.find((t: any) => t && t.src && (t.src.includes("pix-fl") || t.src.includes("ei.phncdn")));
        if (fl && fl.src) image = upgradePornhubImageUrl(fl.src);
      }
    }
    if (!image) {
      image = upgradePornhubImageUrl(apiVideo.default_thumb || "");
    }
  }

  let synopsis = title ? `Watch ${title} on PornHub.` : "";
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

  let views = apiVideo ? parseInt(apiVideo.views, 10) || 0 : 0;
  let rating = apiVideo ? Math.round(parseFloat(apiVideo.rating) || 0) : 0;
  let durationSec = apiVideo ? parseApiDuration(apiVideo.duration) : 0;

  // 3. Attempt HTML scrape for richer synopsis and page metadata
  const pathPart = viewkey ? `/view_video.php?viewkey=${viewkey}` : (link.startsWith("http") ? new URL(link).pathname + new URL(link).search : link);

  for (const curBase of candidateBases) {
    const targetUrl = `${curBase}${pathPart.startsWith("/") ? "" : "/"}${pathPart}`;
    try {
      const res = await axios.get(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-CH-UA": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
          "Sec-CH-UA-Mobile": "?0",
          "Sec-CH-UA-Platform": '"Windows"',
          Referer: `${curBase}/`,
          Cookie: "platform=pc; bs=0",
        },
        timeout: 7000,
        maxRedirects: 5,
      });

      if (res.request && res.request.responseURL && kvStore) {
        try {
          const origin = new URL(res.request.responseURL).origin.replace(/\/+$/, "");
          if (origin && origin.startsWith("http") && origin !== baseUrl) {
            kvStore.set("pornhub_learnedDomain", origin);
          }
        } catch (e) {}
      }

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

        const pageSynopsis =
          $('meta[name="description"]').attr("content") ||
          $('meta[property="og:description"]').attr("content");
        if (pageSynopsis) {
          synopsis = pageSynopsis;
        }

        const pageViews = parseViews($(".views").first().text());
        if (pageViews > 0) views = pageViews;

        const durMeta = $('meta[property="video:duration"]').attr("content");
        if (durMeta) {
          const d = parseInt(durMeta, 10) || 0;
          if (d > 0) durationSec = d;
        }

        // Additional tags from page
        $('a[href*="/video/tag/"], a[href*="/categories/"]').each(function (_: any, el: any) {
          const t = $(el).text().trim();
          if (t && !tags.includes(t) && tags.length < 30) tags.push(t);
        });

        break; // Successfully enriched from HTML
      }
    } catch (e) {
      // Try next mirror
    }
  }

  // Safety fallbacks if both API and HTML were incomplete
  if (!title) title = "Video";
  if (!synopsis) synopsis = `Watch ${title} on PornHub.`;

  const info: Info = {
    title,
    image,
    poster: image,
    synopsis,
    type: "movie",
    tags: tags.length > 0 ? tags : undefined,
    cast: cast.length > 0 ? cast : undefined,
    linkList: [
      {
        title: "Stream Video",
        directLinks: [
          {
            title: title || "Watch",
            link: link.startsWith("http") ? link : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`,
            type: "movie",
          },
        ],
      },
    ],
  };

  if (views > 0) info.views = views;
  if (rating > 0) {
    const r10 = rating > 10 ? (rating / 10).toFixed(1) : String(rating);
    info.rating = `${r10}/10`;
  }
  if (durationSec > 0) info.duration = durationSec;

  return info;
};
