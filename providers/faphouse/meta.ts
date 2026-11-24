import { Info, ProviderContext } from "../types";
import { getBaseUrl, recordRedirect } from "./domain";
import { upgradeFaphouseImageUrl } from "./posts";

"use strict";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseDurationSeconds(text: string): number {
  if (!text) return 0;
  const parts = text.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < parts.length; i++) s = s * 60 + parts[i];
  return s;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio, kvStore } = providerContext;
  let safeWebUrl = link || "";

  try {
    const baseUrl = await getBaseUrl(kvStore, axios);
    let targetUrl = link;
    if (!targetUrl.startsWith("http")) {
      targetUrl = `${baseUrl}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
    }
    safeWebUrl = targetUrl;

    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        Cookie: "siteMode=desktop; locale=en;",
      },
      timeout: 10000,
      maxRedirects: 3,
    });

    if (res.request && res.request.responseURL) {
      await recordRedirect(kvStore, targetUrl, res.request.responseURL);
    }

    const html = res.data || "";
    const $ = cheerio.load(html);

    // Title
    let title =
      $("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      $("title").text().trim() ||
      "FapHouse Video";
    title = title.replace(/\s*\|\s*Faphouse.*$/i, "").trim();

    // Poster / Image
    let poster =
      $("meta[property='og:image']").attr("content") ||
      $("video#video-trailer").attr("poster") ||
      $("[data-poster-src]").attr("data-poster-src") ||
      $("img.t-i").first().attr("src") ||
      "";
    poster = upgradeFaphouseImageUrl(poster);

    // Synopsis / Description
    let synopsis =
      $("meta[property='og:description']").attr("content") ||
      $("meta[name='description']").attr("content") ||
      "";
    if (!synopsis) {
      synopsis = `Watch ${title} in HD on FapHouse.`;
    }

    // Tags / Categories (scoped strictly to video info section, never navbar/related)
    const tags: string[] = [];
    $(".video-info-details__categories a.vid-c[href*='/c/']").each((_: any, a: any) => {
      const t = $(a).text().trim();
      if (t && !tags.includes(t) && !t.includes("All") && t.length < 30) {
        tags.push(t);
      }
    });

    // Cast / Models / Studios (scoped strictly to video info section)
    const cast: string[] = [];
    $(
      ".video-info-details__studio-link, .video-info-details__categories a.vid-c[href*='/models/'], .video-info-details__categories a.vid-c[href*='/pornstars/']"
    ).each((_: any, a: any) => {
      const name = $(a).text().trim();
      if (name && !cast.includes(name) && !name.includes("Join") && !name.includes("See more")) {
        cast.push(name);
      }
    });

    let durationSec = 600;
    let views = 1500;

    // Extract structured JSON if present
    const vsMatch = html.match(/<script id="view-state-data"[^>]*>([\s\S]*?)<\/script>/i);
    if (vsMatch) {
      try {
        const vs = JSON.parse(vsMatch[1]);
        if (vs.video) {
          if (typeof vs.video.duration === "number" && vs.video.duration > 0) {
            durationSec = vs.video.duration;
          }
          if (Array.isArray(vs.video.pornstarNames)) {
            vs.video.pornstarNames.forEach((n: string) => {
              if (n && !cast.includes(n)) cast.push(n);
            });
          }
          if (vs.video.studioName && !cast.includes(vs.video.studioName)) {
            cast.push(vs.video.studioName);
          }
        }
      } catch (e) {}
    }

    // Fallback duration parse from HTML
    if (durationSec === 600) {
      const durEl = $(".t-vi span, .video-info__duration").first().text().trim();
      if (durEl) {
        const parsed = parseDurationSeconds(durEl);
        if (parsed > 0) durationSec = parsed;
      }
    }

    return {
      title,
      synopsis,
      image: poster,
      poster: poster,
      imdbId: "",
      type: "movie",
      tags: tags.length > 0 ? tags : ["HD", "Adult"],
      cast: cast,
      rating: "8.5/10",
      views,
      duration: durationSec,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: title || "Watch Full Video",
              link: safeWebUrl,
              type: "movie",
            },
          ],
        },
      ],
    };
  } catch (err) {
    // Fail-safe fallback to prevent any synopsis crashes in Vega App
    const fallbackTitle = "FapHouse Video";
    return {
      title: fallbackTitle,
      synopsis: `Watch ${fallbackTitle} on FapHouse.`,
      image: "https://assets-nss.fhcdnmedia.online/9d3f29d8666549ad223adec08efdc848cffcf297/fap-site/default/images/favicons/favicon-96x96.png",
      poster: "https://assets-nss.fhcdnmedia.online/9d3f29d8666549ad223adec08efdc848cffcf297/fap-site/default/images/favicons/favicon-96x96.png",
      imdbId: "",
      type: "movie",
      tags: ["HD", "Adult"],
      cast: [],
      rating: "8.0/10",
      views: 1000,
      duration: 600,
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
