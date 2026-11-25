import { Stream, ProviderContext } from "../types";
import { getBaseUrl } from "./domain";

"use strict";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function getStream(
  linkOrOptions: any,
  typeArg?: string,
  signalArg?: any,
  providerContextArg?: ProviderContext,
  isDownloadArg?: boolean
): Promise<Stream[]> {
  let link = "";
  let signal: any = null;
  let providerContext: ProviderContext | null = null;
  let isDownload = false;

  if (
    linkOrOptions &&
    typeof linkOrOptions === "object" &&
    ("providerContext" in linkOrOptions || "link" in linkOrOptions)
  ) {
    link = linkOrOptions.link || "";
    signal = linkOrOptions.signal || null;
    providerContext = linkOrOptions.providerContext || null;
    isDownload = Boolean(linkOrOptions.isDownload);
  } else {
    link = linkOrOptions || "";
    signal = signalArg || null;
    providerContext = providerContextArg || null;
    isDownload = Boolean(isDownloadArg);
  }

  const kvStore = providerContext?.kvStore;
  const axios = providerContext?.axios;
  const cheerio = providerContext?.cheerio;

  if (!axios || !cheerio || !link) return [];

  const baseUrl = await getBaseUrl(kvStore, axios);

  try {
    const pageRes = await axios.get(link, {
      timeout: 8000,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: baseUrl,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    const pageHtml = String(pageRes.data || "");
    const $ = cheerio.load(pageHtml);

    const streams: Stream[] = [];
    const headers = {
      Referer: `${baseUrl}/`,
      "User-Agent": USER_AGENT,
    };

    // 1. Check direct contentURL in metadata
    let directUrl = $('meta[itemprop="contentURL"]').attr("content") || "";

    // 2. Check source tags
    if (!directUrl) {
      $("source").each((_: any, el: any) => {
        const src = $(el).attr("src") || "";
        if (src && (src.includes(".mp4") || src.includes(".m3u8")) && !directUrl) {
          directUrl = src;
        }
      });
    }

    // 3. Check regex match for pvtcdn or mp4
    if (!directUrl) {
      const pvtMatch = pageHtml.match(
        /https?:\/\/[a-zA-Z0-9_.-]*(?:pvtcdn\.com|ddose007)[^\s"'<>]+\.mp4/i
      );
      if (pvtMatch) directUrl = pvtMatch[0];
    }

    if (!directUrl) {
      const anyMp4 = pageHtml.match(
        /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i
      );
      if (anyMp4) directUrl = anyMp4[0];
    }

    if (directUrl) {
      const isM3u8 = directUrl.includes(".m3u8");
      streams.push({
        server: "Ddose Direct High Speed (1080p)",
        link: directUrl,
        type: isM3u8 ? "m3u8" : "mp4",
        quality: "1080",
        headers,
      });

      return streams;
    }

    return [];
  } catch (e: any) {
    return [];
  }
}
