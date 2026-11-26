import { Stream, ProviderContext } from "../types";
import {
  getBaseUrl,
  recordRedirect,
  rewriteToBase,
  CANDIDATE_MIRRORS,
} from "./domain";

"use strict";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
// The mobile page carries the plain, playable stream URLs (the desktop page
// only carries ciphered xplayerSettings URLs). Use a mobile UA so the site
// serves the mobile layout with its <noscript> video tag and HLS preload.
const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const MAX_STREAM_ATTEMPTS = 2;

function toMobileUrl(desktopUrl: string): string {
  try {
    const u = new URL(desktopUrl);
    if (!u.hostname.startsWith("m.")) {
      u.hostname = `m.${u.hostname}`;
    }
    return u.toString();
  } catch (e) {
    return desktopUrl;
  }
}

/**
 * Builds the mobile-page URLs to try, in order: the active mirror first,
 * then every other known mirror. Some videos' mobile pages carry no stream
 * URLs on one mirror but do on another, so a cross-mirror fallback is
 * required for reliable playback.
 */
function buildMobileCandidates(targetUrl: string): string[] {
  const candidates: string[] = [];
  const add = (u: string) => {
    if (u && !candidates.includes(u)) candidates.push(u);
  };
  add(toMobileUrl(targetUrl));
  for (const mirror of CANDIDATE_MIRRORS) {
    try {
      const mirrorHost = new URL(mirror).host;
      const u = new URL(targetUrl);
      u.host = mirrorHost;
      add(toMobileUrl(u.toString()));
    } catch (e) {}
  }
  // Also try the plain desktop URL's mobile form on the default domain.
  try {
    const u = new URL(targetUrl);
    u.host = new URL("https://xhamster.com").host;
    add(toMobileUrl(u.toString()));
  } catch (e) {}
  return candidates;
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, kvStore } = providerContext;
  const streams: Stream[] = [];

  try {
    const baseUrl = await getBaseUrl(kvStore, axios);
    let targetUrl = link;
    if (!targetUrl.startsWith("http")) {
      targetUrl = `${baseUrl}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
    }
    targetUrl = rewriteToBase(targetUrl, baseUrl);
    const mobileCandidates = buildMobileCandidates(targetUrl);

    let sessionCookie = "";
    if (kvStore && typeof kvStore.get === "function") {
      try {
        sessionCookie = (await kvStore.get("sessionCookie")) || "";
      } catch (e) {}
    }
    const cookieHeader = String(sessionCookie || "").trim();

    const defaultHeaders = {
      Referer: targetUrl,
      "User-Agent": DEFAULT_USER_AGENT,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    };

    let hlsUrl = "";
    let mp4Url = "";

    // Try each mirror's mobile page until one yields stream URLs.
    for (const mobileUrl of mobileCandidates) {
      if (hlsUrl && mp4Url) break;
      for (let attempt = 1; attempt <= MAX_STREAM_ATTEMPTS; attempt++) {
        try {
          const res = await axios.get(mobileUrl, {
            headers: {
              "User-Agent": MOBILE_USER_AGENT,
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              Referer: targetUrl,
              ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            },
            signal,
            timeout: 15000,
            maxRedirects: 3,
          });

          if (res.request && res.request.responseURL) {
            await recordRedirect(kvStore, mobileUrl, res.request.responseURL);
          }

          const html = res.data || "";
          const $ = cheerio.load(html);

          // 1. HLS master playlist (multi-quality 144p-1080p), preloaded by
          //    the mobile page: <link rel="preload" href="...m3u8" as="fetch">
          if (!hlsUrl) {
            const preload = $("link[rel='preload'][as='fetch'][href*='.m3u8']")
              .first()
              .attr("href");
            if (preload && preload.startsWith("http")) {
              hlsUrl = preload.trim();
            }
          }
          if (!hlsUrl) {
            const m3u8Match = html.match(
              /https?:\/\/[^\s"'<>]*?\.m3u8/i
            );
            if (m3u8Match && m3u8Match[0].includes("xhcdn.com")) {
              hlsUrl = m3u8Match[0].trim();
            }
          }

          // 2. Direct MP4 (480p) from the no-JS fallback video tag:
          //    <noscript><video src="...480p.h264.mp4" ...>
          //    NOTE: cheerio does NOT parse <noscript> content as DOM, so
          //    read it from the raw HTML with a regex instead.
          if (!mp4Url) {
            const noscriptMatch = html.match(
              /<noscript>\s*<video[^>]*src="([^"]+)"/i
            );
            if (noscriptMatch && noscriptMatch[1].startsWith("http")) {
              mp4Url = noscriptMatch[1].trim();
            }
          }
          if (!mp4Url) {
            // Non-greedy: stop at the first ".h264.mp4" so a playlist URL
            // like "...720p.h264.mp4.m3u8" is never captured as an MP4.
            const mp4Match = html.match(
              /https?:\/\/[^\s"'<>]*?\.h264\.mp4/i
            );
            if (mp4Match && !mp4Match[0].includes(".m3u8")) {
              mp4Url = mp4Match[0].trim();
            }
          }

          if (hlsUrl || mp4Url) break;
        } catch (e) {
          // Transient failure — retry below / move to next mirror.
        }
        if (attempt < MAX_STREAM_ATTEMPTS && !hlsUrl && !mp4Url) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      if (hlsUrl && mp4Url) break;
    }

    // HLS first (adaptive up to 1080p), direct MP4 as the safe fallback.
    if (hlsUrl) {
      streams.push({
        server: "XHamster HLS",
        link: hlsUrl,
        type: "m3u8",
        quality: "1080p",
        headers: defaultHeaders,
      });
    }
    if (mp4Url) {
      const qualMatch = mp4Url.match(/\/(\d+)p\.h264\.mp4/i);
      const qual = qualMatch ? `${qualMatch[1]}p` : "480p";
      streams.push({
        server: `XHamster Direct (${qual})`,
        link: mp4Url,
        type: "mp4",
        quality: qual,
        headers: defaultHeaders,
      });
    }

    return streams;
  } catch (err) {
    return [];
  }
};
