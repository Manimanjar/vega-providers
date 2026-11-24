import { Info, LinkListGroup, DirectLink, ProviderContext } from "../types";
import { getBaseUrl, recordRedirect } from "./domain";
import { upgradeImageUrl } from "./posts";

"use strict";

function parseDurationSeconds(text: string): number {
  if (!text) return 0;
  let totalMinutes = 0;
  const hoursMatch = text.match(/(\d+)\s*(?:h|hr|hours?)/i);
  const minsMatch = text.match(/(\d+)\s*(?:m|min|minutes?)/i);
  if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) totalMinutes += parseInt(minsMatch[1], 10);
  return totalMinutes > 0 ? totalMinutes * 60 : 0;
}

async function parseLinkmakePage(
  linkmakeUrl: string,
  axios: any,
  cheerio: any,
  isSeries: boolean,
  referer?: string
): Promise<LinkListGroup[]> {
  try {
    const res = await axios.get(linkmakeUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: referer || "https://linkmake.in/",
      },
      timeout: 10000,
    });

    const html = res.data || "";
    const $ = cheerio.load(html);
    const groups: LinkListGroup[] = [];

    // Check if there are episode markers in the HTML
    // e.g. 🔰~~×××( Episode -01)×××~~🔰
    const hasEpisodes = /Episode\s*[-–]?\s*\d+/i.test(html);

    if (hasEpisodes) {
      // Split by episode segments
      const centerDiv = $("center > div").first();
      const containerHtml = centerDiv.length > 0 ? centerDiv.html() || "" : html;

      // Match segments like: (Episode -01) ... until next (Episode -02)
      const epRegex = /(?:🔰\s*~*×*\s*\(?\s*)?(Episode\s*[-–]?\s*\d+)(?:\s*\)?\s*~*×*\s*🔰)?([\s\S]*?)(?=(?:🔰\s*~*×*\s*\(?\s*)?Episode\s*[-–]?\s*\d+|$)/gi;
      let match: RegExpExecArray | null;

      while ((match = epRegex.exec(containerHtml)) !== null) {
        const epTitle = match[1].trim();
        const epHtml = match[2];
        const $ep = cheerio.load(`<div>${epHtml}</div>`);
        const epDirectLinks: DirectLink[] = [];

        $ep(".dlink a, a[href*='filesdl'], a[href*='linkmake']").each((_: any, a: any) => {
          let href = $ep(a).attr("href");
          let title = $ep(a).text().trim() || "Watch";
          if (
            href &&
            href.startsWith("http") &&
            !href.includes("/Tg/") &&
            !href.includes("t.me") &&
            !title.toLowerCase().includes("telegram") &&
            href !== linkmakeUrl
          ) {
            if (href.includes("filesdl") && href.includes("/drive/")) {
              href = href.replace("/drive/", "/cloud/");
            }
            title = title.replace(/^download\s+/i, "");
            epDirectLinks.push({
              title,
              link: href,
              type: "movie",
            });
          }
        });

        if (epDirectLinks.length > 0) {
          groups.push({
            title: epTitle,
            directLinks: epDirectLinks,
          });
        }
      }
    }

    // If no episode groups found or it's a regular movie
    if (groups.length === 0) {
      const directLinks: DirectLink[] = [];
      $(".dlink a, a[href*='filesdl'], a[href*='linkmake']").each((_: any, a: any) => {
        let href = $(a).attr("href");
        let title = $(a).text().trim() || "Watch";
        if (
          href &&
          href.startsWith("http") &&
          !href.includes("/Tg/") &&
          !href.includes("t.me") &&
          !title.toLowerCase().includes("telegram") &&
          href !== linkmakeUrl
        ) {
          if (href.includes("filesdl") && href.includes("/drive/")) {
            href = href.replace("/drive/", "/cloud/");
          }
          title = title.replace(/^download\s+/i, "");
          directLinks.push({
            title,
            link: href,
            type: "movie",
          });
        }
      });

      if (directLinks.length > 0) {
        groups.push({
          title: "All Available Qualities",
          directLinks,
        });
      }
    }

    return groups;
  } catch (err: any) {
    console.error("Linkmake parse error:", err?.message || err);
    return [];
  }
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBaseUrl(kvStore, axios);
  const movieUrl = link.startsWith("http")
    ? link
    : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  try {
    const res = await axios.get(movieUrl, {
      headers: {
        ...commonHeaders,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${baseUrl}/`,
      },
      timeout: 12000,
    });

    recordRedirect(res, baseUrl, kvStore);

    const html = res.data || "";
    const $ = cheerio.load(html);

    const title =
      $("h2").first().text().trim() ||
      $(".movie-info .fname:contains('Name') span").text().trim() ||
      $("title").text().replace(/»\s*FilmyFly.*/i, "").trim() ||
      "Movie";

    let rawImage =
      $('meta[property="og:image"]').attr("content") ||
      $(".movie-cover").attr("src") ||
      "";
    let image = upgradeImageUrl(rawImage);

    const synopsis =
      $(".movie-info .fname:contains('Description') span").text().trim() ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    // Tags / Genres
    const tags: string[] = [];
    const genreText = $(".movie-info .fname:contains('Genre') span").text().trim();
    if (genreText) {
      genreText.split(",").forEach((g: string) => {
        const clean = g.trim();
        if (clean && !tags.includes(clean)) tags.push(clean);
      });
    }

    // Duration
    const durationText = $(".movie-info .fname:contains('Duration') span").text().trim();
    const durationSec = parseDurationSeconds(durationText);

    // Type detection (Series vs Movie)
    const isSeries =
      /Web[- ]?Series|Season|\bS0\d|\bS\d{2}|Episode/i.test(title) ||
      /Web[- ]?Series/i.test(genreText) ||
      /Web[- ]?Series/i.test($(".brcrmb").text());

    // Extract all download button links on the page
    const downloadPageUrls: { title: string; url: string }[] = [];
    $(".dlbtn a, a.bg2, a[href*='linkmake'], a[href*='filesdl']").each(
      (_: any, el: any) => {
        const href = $(el).attr("href");
        const btnText = $(el).text().trim() || "Download Movie";
        if (
          href &&
          href.startsWith("http") &&
          !href.includes("/Tg/") &&
          !href.includes("t.me") &&
          !btnText.toLowerCase().includes("telegram")
        ) {
          downloadPageUrls.push({ title: btnText, url: href });
        }
      }
    );

    const linkList: LinkListGroup[] = [];

    // Follow each link protector / download URL to extract actual video links
    for (const dl of downloadPageUrls) {
      if (dl.url.includes("linkmake.in")) {
        const groups = await parseLinkmakePage(dl.url, axios, cheerio, isSeries, movieUrl);
        if (groups.length > 0) {
          linkList.push(...groups);
        } else {
          // Fallback if linkmake page failed to load
          linkList.push({
            title: dl.title,
            directLinks: [
              {
                title: dl.title,
                link: dl.url,
                type: "movie",
              },
            ],
          });
        }
      } else {
        // Direct download link already on page
        linkList.push({
          title: dl.title,
          directLinks: [
            {
              title: dl.title,
              link: dl.url,
              type: "movie",
            },
          ],
        });
      }
    }

    // Safety fallback: if no download buttons found, point to movieUrl itself
    if (linkList.length === 0) {
      linkList.push({
        title: "Default Stream",
        directLinks: [
          {
            title: title,
            link: movieUrl,
            type: "movie",
          },
        ],
      });
    }

    const info: any = {
      title,
      synopsis: synopsis || `Watch ${title} on FilmyFly.`,
      image,
      poster: image,
      imdbId: "",
      type: isSeries ? "series" : "movie",
      tags: tags.length > 0 ? tags : ["Movie"],
      cast: [],
      rating: "8.0/10",
      linkList,
    };

    if (durationSec > 0) info.duration = durationSec;

    return info;
  } catch (err: any) {
    console.error("FilmyFly getMeta error:", err?.message || err);
    return {
      title: "Movie",
      synopsis: "Watch movie on FilmyFly.",
      image: "",
      poster: "",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "8.0/10",
      linkList: [
        {
          title: "Stream",
          directLinks: [{ title: "Stream", link: movieUrl, type: "movie" }],
        },
      ],
    } as any;
  }
};
