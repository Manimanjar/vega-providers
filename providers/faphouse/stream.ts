import { Stream, ProviderContext } from "../types";
import { getBaseUrl, recordRedirect } from "./domain";

"use strict";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

    // Retrieve optional user session cookie from settings
    let sessionCookie = "";
    if (kvStore && typeof kvStore.get === "function") {
      try {
        sessionCookie = (await kvStore.get("sessionCookie")) || "";
      } catch (e) {}
    }

    const cookieHeader = sessionCookie
      ? `siteMode=desktop; locale=en; ${sessionCookie.trim()}`
      : "siteMode=desktop; locale=en;";

    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        Cookie: cookieHeader,
      },
      signal,
      timeout: 10000,
      maxRedirects: 3,
    });

    if (res.request && res.request.responseURL) {
      await recordRedirect(kvStore, targetUrl, res.request.responseURL);
    }

    const html = res.data || "";
    const $ = cheerio.load(html);

    const defaultHeaders = {
      Referer: `${baseUrl}/`,
      "User-Agent": DEFAULT_USER_AGENT,
      Cookie: cookieHeader,
    };

    // 1. Check if user is authenticated and view is allowed
    let isFullAccess = false;
    let videoId = "";
    let studioId = "";

    const vsMatch = html.match(/<script id="view-state-data"[^>]*>([\s\S]*?)<\/script>/i);
    if (vsMatch) {
      try {
        const vs = JSON.parse(vsMatch[1]);
        if (vs.video) {
          videoId = String(vs.video.videoId || "");
          studioId = String(vs.video.studioId || "");
          if (vs.video.videoViewAllowed === true) {
            isFullAccess = true;
          }
        }
      } catch (e) {}
    }

    // If session cookie is provided, attempt unlock API
    if (sessionCookie && videoId && !isFullAccess) {
      try {
        const unlockRes = await axios.post(
          `${baseUrl}/api/unlock/video/${videoId}`,
          { studioId: studioId ? parseInt(studioId, 10) : undefined },
          {
            headers: {
              "User-Agent": DEFAULT_USER_AGENT,
              "Content-Type": "application/json",
              Referer: targetUrl,
              Cookie: cookieHeader,
            },
            timeout: 5000,
            signal,
          }
        );
        if (unlockRes.status >= 200 && unlockRes.status < 300) {
          isFullAccess = true;
        }
      } catch (e) {}
    }

    // 2. Check for full video source or HLS streams
    let fullHlsMatch = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (fullHlsMatch && !fullHlsMatch[0].includes("/trailer/")) {
      streams.push({
        server: "FapHouse HLS Full Stream",
        link: fullHlsMatch[0],
        type: "m3u8",
        headers: defaultHeaders,
      });
    }

    // 3. Extract direct video source from HTML5 video tag, fallback data or preload
    let rawSource =
      $("video#video-trailer source").first().attr("src") ||
      $("video#video-trailer").attr("data-fallback") ||
      $("video source").first().attr("src") ||
      $("link[as='fetch'][href*='.mp4']").first().attr("href") ||
      "";

    if (!rawSource) {
      const match = html.match(
        /https?:\/\/video-nss\.fhcdnmedia\.online\/[^\s"'<>]+\.mp4/i
      );
      if (match) rawSource = match[0];
    }

    if (!rawSource && streams.length === 0) {
      return [];
    }

    if (rawSource) {
      const qualMatch = rawSource.match(/\/trailer\/(\d+)\.mp4/i);
      const detectedQual = qualMatch ? qualMatch[1] : "1080";
      const candidateQualities = ["2160", "1080", "720", "480"];

      const labelPrefix = isFullAccess
        ? "FapHouse Direct CDN"
        : "FapHouse Preview (Free Trailer)";

      const probePromises = candidateQualities.map(async (q) => {
        const qUrl = rawSource.replace(/\/trailer\/\d+\.mp4/i, `/trailer/${q}.mp4`);
        try {
          const headRes = await axios.head(qUrl, {
            headers: defaultHeaders,
            timeout: 2500,
            signal,
            validateStatus: (s: number) => s >= 200 && s < 400,
          });
          if (headRes.status >= 200 && headRes.status < 400) {
            return { q, url: qUrl, ok: true };
          }
        } catch (e) {}
        return { q, url: qUrl, ok: false };
      });

      const probeResults = await Promise.all(probePromises);
      for (const r of probeResults) {
        if (r.ok) {
          streams.push({
            server: `${labelPrefix} (${r.q}p)`,
            link: r.url,
            type: "mp4",
            quality: `${r.q}p`,
            headers: defaultHeaders,
          });
        }
      }

      if (streams.length === 0) {
        streams.push({
          server: `${labelPrefix} (${detectedQual}p)`,
          link: rawSource,
          type: "mp4",
          quality: `${detectedQual}p`,
          headers: defaultHeaders,
        });
      }
    }

    return streams;
  } catch (err) {
    return [];
  }
};
