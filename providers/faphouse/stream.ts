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

    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${baseUrl}/`,
        Cookie: "siteMode=desktop; locale=en;",
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

    // 1. Extract direct video source from HTML5 video tag or preload links
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

    if (!rawSource) {
      return [];
    }

    const defaultHeaders = {
      Referer: `${baseUrl}/`,
      "User-Agent": DEFAULT_USER_AGENT,
    };

    // 2. Identify base pattern and probe candidate qualities in parallel
    const qualMatch = rawSource.match(/\/trailer\/(\d+)\.mp4/i);
    const detectedQual = qualMatch ? qualMatch[1] : "1080";
    const candidateQualities = ["2160", "1080", "720", "480"];

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
          server: `FapHouse Direct CDN (${r.q}p)`,
          link: r.url,
          type: "mp4",
          quality: `${r.q}p`,
          headers: defaultHeaders,
        });
      }
    }

    // 3. Fallback if probing was blocked or inconclusive
    if (streams.length === 0) {
      streams.push({
        server: `FapHouse Direct CDN (${detectedQual}p)`,
        link: rawSource,
        type: "mp4",
        quality: `${detectedQual}p`,
        headers: defaultHeaders,
      });
    }

    return streams;
  } catch (err) {
    return [];
  }
};
