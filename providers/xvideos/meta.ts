import { Info, ProviderContext } from "../types";
import { parsePartTitle, fetchSeriesParts } from "../series";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;

  let baseUrl = "https://www.xvideos.com";
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        baseUrl = custom.trim().replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  const url = link.startsWith("http")
    ? link
    : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  try {
    const res = await axios.get(url, {
      headers: {
        ...commonHeaders,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl,
      },
    });

    const html = res.data;
    const $ = cheerio.load(html);

    // Extract title from html5player or DOM
    const playerTitleMatch = html.match(/html5player\.setVideoTitle\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    const title =
      (playerTitleMatch ? playerTitleMatch[1] : null) ||
      $("h2.page-title, .page-title, title").first().text().replace(/- XVIDEOS\.COM/i, "").trim() ||
      "Video";

    // Extract poster thumbnail
    const playerThumbMatch = html.match(/html5player\.setThumbUrl\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    const playerThumb169Match = html.match(/html5player\.setThumbUrl169\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    const image =
      (playerThumb169Match ? playerThumb169Match[1] : null) ||
      (playerThumbMatch ? playerThumbMatch[1] : null) ||
      $('meta[property="og:image"]').attr("content") ||
      "";

    // Extract tags — ONLY real /tags/ links. The old selector
    // ".video-metadata a" also grabbed the uploader and models with
    // their subscriber counts ("Scott Stark392k"), plus "Edit tags"
    // and "+", so the detail screen showed junk instead of tags.
    const tags: string[] = [];
    $('.video-tags-list a[href^="/tags/"]').each((_, el) => {
      const tagText = $(el).text().trim();
      if (tagText && tagText !== "Edit tags" && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });

    // Models / stars, without the subscriber counts stuck to the name.
    const cast: string[] = [];
    $(
      '.video-tags-list a[href^="/models/"], .video-tags-list a[href^="/amateurs/"]'
    ).each((_, el) => {
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

    // Extract duration and quality indicator
    const duration = $(".duration, .video-duration").first().text().trim();
    const quality =
      html.includes("setVideoUrlHigh") || html.includes("1080p")
        ? "1080p"
        : "720p";
    // XVideos pages have no real description — the meta description is
    // just "XVIDEOS <title> free". Build a useful synopsis from the
    // title, duration, quality, stars and tags instead of leaving the
    // detail screen on "No synopsis available".
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
          site: "xvideos",
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
          tags: tags.length > 0 ? tags : undefined,
          cast: cast.length > 0 ? cast : undefined,
          rating: duration || undefined,
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
      cast: cast.length > 0 ? cast : undefined,
      rating: duration || undefined,
      webUrl: url,
      linkList: [
        {
          title: "Stream Video",
          quality,
          directLinks: [
            {
              title: title,
              link: url,
              type: "movie",
            },
          ],
        },
      ],
    };
  } catch (err: any) {
    console.error("XVideos meta error:", err?.message || err);
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
