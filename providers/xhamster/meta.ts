import { Info, ProviderContext } from "../types";
import { getBaseUrl, recordRedirect, rewriteToBase } from "./domain";

"use strict";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseInitials(html: string): any | null {
  if (!html) return null;
  const m = html.match(/window\.initials\s*=\s*\{/);
  if (!m || m.index === undefined) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch (e) {
            return null;
          }
        }
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
  const { axios, cheerio, kvStore } = providerContext;
  let safeWebUrl = link || "";

  try {
    const baseUrl = await getBaseUrl(kvStore, axios);
    let targetUrl = link;
    if (!targetUrl.startsWith("http")) {
      targetUrl = `${baseUrl}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
    }
    targetUrl = rewriteToBase(targetUrl, baseUrl);
    safeWebUrl = targetUrl;

    let sessionCookie = "";
    if (kvStore && typeof kvStore.get === "function") {
      try {
        sessionCookie = (await kvStore.get("sessionCookie")) || "";
      } catch (e) {}
    }
    const cookieHeader = String(sessionCookie || "").trim();

    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      timeout: 15000,
      maxRedirects: 3,
    });

    if (res.request && res.request.responseURL) {
      await recordRedirect(kvStore, targetUrl, res.request.responseURL);
    }

    const html = res.data || "";
    const $ = cheerio.load(html);
    const initials = parseInitials(html);
    const vm = (initials && initials.videoModel) || {};

    // Title
    let title =
      String(vm.title || "").trim() ||
      $("meta[property='og:title']").attr("content") ||
      $("title").text().trim() ||
      "XHamster Video";
    title = title.replace(/\s*\|\s*XHamster.*$/i, "").trim();

    // Poster / Image
    let poster =
      String(vm.imageURL || vm.thumbURL || "").trim() ||
      $("meta[property='og:image']").attr("content") ||
      "";
    poster = poster.trim();

    // Synopsis / Description
    let synopsis =
      String(vm.description || "").trim() ||
      $("meta[property='og:description']").attr("content") ||
      "";
    if (!synopsis) {
      synopsis = `Watch ${title} on XHamster.`;
    }

    // Tags + cast from the videoTagsComponent (categories, tags, pornstars).
    const tags: string[] = [];
    const cast: string[] = [];
    const tagList =
      (initials &&
        initials.videoTagsComponent &&
        initials.videoTagsComponent.tags) ||
      [];
    if (Array.isArray(tagList)) {
      for (const t of tagList) {
        if (!t || typeof t !== "object") continue;
        const name = String(t.name || "").trim();
        if (!name) continue;
        if (t.isPornstar) {
          if (!cast.includes(name)) cast.push(name);
        } else if (t.isCategory || t.isTag) {
          if (!tags.includes(name) && tags.length < 15) tags.push(name);
        }
      }
    }
    // Channel / uploader as cast.
    const landingName =
      vm.landing && vm.landing.name ? String(vm.landing.name).trim() : "";
    if (landingName && !cast.includes(landingName)) cast.push(landingName);
    const authorName =
      vm.author && vm.author.name ? String(vm.author.name).trim() : "";
    if (authorName && !cast.includes(authorName)) cast.push(authorName);

    // Views / duration / rating.
    const views =
      typeof vm.views === "number" ? vm.views : parseInt(vm.views, 10) || 0;
    const duration =
      typeof vm.duration === "number"
        ? vm.duration
        : parseInt(vm.duration, 10) || 0;
    let rating = "";
    const ratingVal =
      vm.rating && typeof vm.rating.value === "number"
        ? vm.rating.value
        : null;
    if (ratingVal !== null && ratingVal > 0) {
      rating = `${(ratingVal / 10).toFixed(1)}/10`;
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
      rating: rating || "8.0/10",
      views,
      duration,
      linkList: [
        {
          title: "Stream Video",
          directLinks: [
            {
              title: title || "Watch Video",
              link: safeWebUrl,
              type: "movie",
            },
          ],
        },
      ],
    };
  } catch (err) {
    // Fail-safe fallback to prevent any synopsis crashes in Vega App
    const fallbackTitle = "XHamster Video";
    return {
      title: fallbackTitle,
      synopsis: `Watch ${fallbackTitle} on XHamster.`,
      image: "https://xhamster.com/favicon.ico",
      poster: "https://xhamster.com/favicon.ico",
      imdbId: "",
      type: "movie",
      tags: ["HD", "Adult"],
      cast: [],
      rating: "8.0/10",
      views: 0,
      duration: 0,
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
