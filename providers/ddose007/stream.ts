import { Stream, ProviderContext } from "../types";
import { getBaseUrl } from "./domain";

"use strict";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// The generic embed URL the site puts in VideoObject.contentUrl for
// Terabox-hosted posts. It returns HTTP 404, so it must never be served
// as a stream (it would only produce a dead player).
const DEAD_EMBED_MP4 = "https://video.downloaddirect.xyz/embed.mp4";

function isPlayableMp4(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return false;
  if (!/\.mp4(\?|#|$)/i.test(clean)) return false;
  if (clean === DEAD_EMBED_MP4 || clean.endsWith("/embed.mp4")) return false;
  return true;
}

/**
 * Extract the direct video URL from a post page (verified 2026-11-25).
 * The page carries a JSON-LD VideoObject whose contentUrl is the real
 * file (e.g. https://video.downloaddirect.xyz/<uuid>.mp4). Terabox-hosted
 * posts only carry the dead generic embed.mp4 there and their real video
 * lives inside the Terabox iframe, which has no direct link — those
 * return no stream rather than a broken one.
 */
function extractVideoUrl(pageHtml: string): string {
  // 1. JSON-LD VideoObject contentUrl (most reliable).
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
          if (obj && obj["@type"] === "VideoObject" && obj.contentUrl) {
            const url = String(obj.contentUrl).trim();
            if (isPlayableMp4(url)) return url;
            // A VideoObject whose contentUrl is the dead embed means this
            // post is Terabox-hosted: stop here instead of falling through
            // to a regex that would return the same dead URL.
            if (url === DEAD_EMBED_MP4 || url.endsWith("/embed.mp4")) return "";
          }
        }
      } catch (e) {}
    }
  }

  // 2. Any direct .mp4 URL in the page (covers posts without JSON-LD).
  const anyMp4 = pageHtml.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
  if (anyMp4 && isPlayableMp4(anyMp4[0])) {
    return anyMp4[0].replace(/\\+$/, "");
  }

  return "";
}

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
    const directUrl = extractVideoUrl(pageHtml);

    if (directUrl) {
      return [
        {
          server: "Ddose Direct",
          link: directUrl,
          type: "mp4",
          quality: "HD",
          headers: {
            Referer: `${baseUrl}/`,
            "User-Agent": USER_AGENT,
          },
        },
      ];
    }

    return [];
  } catch (e: any) {
    return [];
  }
}
