import { Info, ProviderContext } from "../types";

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
        Referer: baseUrl,
      },
      maxRedirects: 5,
    });

    const html = res.data;
    const $ = cheerio.load(html);

    const title =
      $("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      $("title").text().replace(/- Rule34Video/i, "").trim() ||
      "Video";

    const image =
      $("meta[property='og:image']").attr("content") ||
      $(".wrap_image img").first().attr("src") ||
      "";

    const tags: string[] = [];
    $("a.tag_item, .tags a, .tag-list a").each((_, el) => {
      const tagText = $(el).text().trim();
      if (tagText && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });

    const is4k = html.includes("2160p") || html.includes("4k") || html.includes("_4k");
    const is1080p = html.includes("1080p");
    const quality = is4k ? "2160p" : (is1080p ? "1080p" : "720p");

    return {
      title,
      synopsis: tags.length > 0 ? `Tags: ${tags.join(", ")}` : title,
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
