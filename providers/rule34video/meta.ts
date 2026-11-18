import { Info, ProviderContext } from "../types";
import { parsePartTitle, fetchSeriesParts } from "../series";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://rule34video.com";
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
    const cachedEntry = memoryCache.data["rule34video"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 4000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        const entry = res.data["rule34video"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("rule34video_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
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
  const url = link.startsWith("http")
    ? link
    : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  try {
    const res = await axios.get(url, {
      headers: {
        ...commonHeaders,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl + "/",
      },
      maxRedirects: 5,
    });

    const html = res.data;
    const $ = cheerio.load(html);

    if (url.includes("/tags/") || url.includes("/categories/")) {
      const directLinks: { title: string; link: string; type: "movie" }[] = [];
      $(".item.thumb, [data-video-card-id]").each((_, element) => {
        const $el = $(element);
        const linkEl = $el.find("a.th, a[href*='/video/']").first();
        const rawHref = linkEl.attr("href") || "";
        const rawTitle =
          linkEl.attr("title") ||
          $el.find("img.thumb").attr("alt") ||
          linkEl.text().trim();

        if (rawHref && rawTitle) {
          const abs = rawHref.startsWith("http")
            ? rawHref
            : `${baseUrl}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;
          directLinks.push({
            title: rawTitle,
            link: abs,
            type: "movie",
          });
        }
      });

      const tagTitle =
        $("h1").first().text().trim() ||
        $("title").text().replace(/- Rule34Video/i, "").trim() ||
        "Tag Playlist";

      const firstImage =
        $(".item.thumb img").first().attr("src") ||
        `${baseUrl}/apple-touch-icon.png`;

      return {
        title: tagTitle,
        synopsis: "",
        image: firstImage,
        poster: firstImage,
        imdbId: "",
        type: "series",
        linkList: [
          {
            title: "Videos",
            directLinks: directLinks.length > 0 ? directLinks : [{ title: tagTitle, link: url, type: "movie" }],
          },
        ],
      };
    }

    const title =
      $("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      $("title").text().replace(/- Rule34Video/i, "").trim() ||
      "Video";

    // The video's own poster is the JSON-LD thumbnailUrl
    // (contents/videos_screenshots/<id>/preview.jpg). og:image is
    // empty on this site, and .wrap_image is the CATEGORY cover
    // (contents/categories/<id>/s1_<id>.jpg) — using it made the
    // detail screen show a wrong low-quality image instead of the
    // video's own thumbnail (user report 2026-11-18: the detail
    // thumbnail "changes" from the good list thumbnail to what looks
    // like a uploader/category image). Fall back to constructing the
    // preview URL from the video ID in the link (same pattern the
    // site uses: bucket = floor(id / 10000) * 10000).
    var thumbMatch = html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i);
    var image = (thumbMatch && thumbMatch[1]) || "";
    if (!image) {
      var idMatch = url.match(/\/video\/(\d+)/);
      if (idMatch) {
        var vid = parseInt(idMatch[1], 10);
        var bucket = Math.floor(vid / 10000) * 10000;
        image = baseUrl + "/contents/videos_screenshots/" + bucket + "/" + vid + "/preview.jpg";
      }
    }

    const is4k = html.includes("2160p") || html.includes("4k") || html.includes("_4k");
    const is1080p = html.includes("1080p");
    const quality = is4k ? "2160p" : (is1080p ? "1080p" : "720p");

    // The video's own tags live in .vp-tags (tag_vote_chip links).
    // The old code returned no tags at all, so the detail screen
    // showed no tags and "No synopsis available".
    const tags: string[] = [];
    $('.vp-tags a[href*="/tags/"]').each((_, el) => {
      const tagText = $(el).text().trim();
      if (tagText && tagText !== "Tags" && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });

    // Duration is in the page's JSON-LD as ISO 8601, e.g. PT0H58M54S.
    // (The .time elements on the page belong to related videos.)
    let duration = "";
    const durMatch = html.match(
      /"duration":\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/i
    );
    if (durMatch) {
      const h = parseInt(durMatch[1] || "0", 10);
      const m = parseInt(durMatch[2] || "0", 10);
      const s = parseInt(durMatch[3] || "0", 10);
      duration =
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${m}:${String(s).padStart(2, "0")}`;
    }

    const synopsisParts = [
      `${title}${duration ? ` — ${duration}` : ""} • ${quality}.`,
    ];
    if (tags.length > 0) {
      synopsisParts.push(`Tags: ${tags.join(", ")}.`);
    }
    const synopsis = synopsisParts.join(" ");

    // Parts grouping: if this video is a numbered part of a series,
    // the detail becomes the series page — the first part's thumbnail
    // and every part listed below in order, like chapters in the
    // comics app. A failed search, or fewer than 2 parts, falls
    // through to the single video below — grouping can never hide a
    // video. (Only numbered parts expand here; a named part opened
    // directly still plays fine, and it appears in the parts list
    // when any numbered part of its series is opened.)
    var parsed = parsePartTitle(title);
    if (parsed && parsed.partNum != null) {
      var seriesParts = [];
      try {
        seriesParts = await fetchSeriesParts({
          axios: axios,
          cheerio: cheerio,
          baseUrl: baseUrl,
          site: "rule34video",
          baseTitle: parsed.base,
          commonHeaders: commonHeaders,
        });
      } catch (e) {
        seriesParts = [];
      }
      if (seriesParts.length >= 2) {
        var firstImage = (seriesParts[0] && seriesParts[0].image) || image;
        var seriesSynopsisParts = [
          parsed.base + " — " + seriesParts.length + " parts • " + quality + ".",
        ];
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
          tags: tags.length > 0 ? tags : undefined,
          rating: quality,
          webUrl: url,
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
      tags: tags.length > 0 ? tags : undefined,
      rating: quality,
      webUrl: url,
      linkList: [
        {
          title: "Stream Video",
          quality,
          directLinks: [
            {
              title,
              link: url,
              type: "movie",
            },
          ],
        },
      ],
    };
  } catch (err: any) {
    console.error("Rule34Video meta error:", err?.message || err);
    return {
      title: "Video Details",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: "Play",
              link: url,
              type: "movie",
            },
          ],
        },
      ],
    };
  }
};
