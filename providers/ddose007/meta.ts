import { Info, ProviderContext } from "../types";
import { getBaseUrl, recordRedirect } from "./domain";

"use strict";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function getMeta(
  linkOrOptions: any,
  providerContextArg?: ProviderContext
): Promise<Info> {
  let link = "";
  let signal: any = null;
  let providerContext: ProviderContext | null = null;

  if (
    linkOrOptions &&
    typeof linkOrOptions === "object" &&
    ("providerContext" in linkOrOptions || "link" in linkOrOptions)
  ) {
    link = linkOrOptions.link || "";
    signal = linkOrOptions.signal || null;
    providerContext = linkOrOptions.providerContext || null;
  } else {
    link = linkOrOptions || "";
    providerContext = providerContextArg || null;
  }

  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;

  if (!axios || !cheerio || !link) {
    return {
      title: "Unknown",
      type: "movie",
      linkList: [],
    };
  }

  const baseUrl = await getBaseUrl(kvStore, axios);

  try {
    const res = await axios.get(link, {
      timeout: 8000,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: baseUrl,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    recordRedirect(res, baseUrl, kvStore);

    const pageHtml = String(res.data || "");
    const $ = cheerio.load(pageHtml);

    // The post page carries a JSON-LD VideoObject with the reliable
    // title, description and thumbnail (verified 2026-11-25). Prefer it;
    // the meta/h1 fallbacks below cover pages without it.
    let ldTitle = "";
    let ldDesc = "";
    let ldImage = "";
    const ldMatches = pageHtml.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    if (ldMatches) {
      for (const block of ldMatches) {
        const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
        try {
          const data = JSON.parse(inner);
          const objects = Array.isArray(data) ? data : [data];
          for (const obj of objects) {
            if (obj && obj["@type"] === "VideoObject") {
              ldTitle = String(obj.name || "");
              ldDesc = String(obj.description || "");
              ldImage = String(obj.thumbnailUrl || "");
              break;
            }
          }
        } catch (e) {}
        if (ldTitle) break;
      }
    }

    let title =
      ldTitle ||
      $('meta[itemprop="name"]').attr("content") ||
      $('meta[property="og:title"]').attr("content") ||
      $(".video-title h1").first().text().trim() ||
      $("h1").first().text().trim() ||
      $("title").text().replace(/\s*\|\s*DDose007.*$/i, "").trim();

    title = title.replace(/\s+/g, " ").trim();

    const synopsis =
      ldDesc ||
      $('meta[itemprop="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      $(".video-details, .entry-content").first().text().trim() ||
      "";

    let image =
      ldImage ||
      $('meta[itemprop="thumbnailUrl"]').attr("content") ||
      $('meta[property="og:image"]').attr("content") ||
      $(".video-player img").first().attr("src") ||
      "";
    if (image && image.includes("pvtcdn.com")) {
      image = `https://vega-tv.vercel.app/api/proxy?url=${encodeURIComponent(
        image
      )}&referer=${encodeURIComponent(baseUrl + "/")}`;
    }

    const tags: string[] = [];
    $('.video-cat-tag a, a[rel="tag"]').each((_: any, el: any) => {
      const t = $(el).clone().children().remove().end().text().trim();
      if (t && !tags.includes(t)) tags.push(t);
    });

    const info: Info = {
      title,
      synopsis,
      image,
      poster: image,
      imdbId: "",
      type: "movie",
      tags: tags.length > 0 ? tags : undefined,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title,
              link,
              type: "movie",
            },
          ],
        },
      ],
    };

    return info;
  } catch (e: any) {
    return {
      title: "Video",
      type: "movie",
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: "Watch",
              link,
              type: "movie",
            },
          ],
        },
      ],
    };
  }
}
