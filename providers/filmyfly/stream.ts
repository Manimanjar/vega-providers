import { Stream, ProviderContext } from "../types";

"use strict";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractQuality(str: string): "2160" | "1080" | "720" | "480" | "auto" {
  if (/\b(?:2160p?|4k|uhd)\b/i.test(str)) return "2160";
  if (/\b(?:1080p?|fhd)\b/i.test(str)) return "1080";
  if (/\b(?:720p?)\b/i.test(str)) return "720";
  if (/\b(?:480p?|sd)\b/i.test(str)) return "480";
  if (/\bhd\b/i.test(str)) return "720";
  return "auto";
}

async function extractFromFilesdl(
  filesdlUrl: string,
  axios: any,
  cheerio: any,
  signal?: AbortSignal
): Promise<Stream[]> {
  const streams: Stream[] = [];
  const seen = new Set<string>();

  // Normalize /drive/ to /cloud/ to bypass DDoS challenge interstitial and get real Cloud Direct stream
  const targetUrl = filesdlUrl.replace("/drive/", "/cloud/");

  try {
    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://linkmake.in/",
      },
      signal,
      timeout: 10000,
    });

    const html = res.data || "";
    const $ = cheerio.load(html);

    const titleText = $(".title").first().text().trim() || "";
    const defaultQuality = extractQuality(titleText);
    const q = defaultQuality !== "auto" ? defaultQuality : "1080";

    // 1. Direct Download 10Gbps (Google Drive CDN via fffast / zdownload.php)
    const fffastLink = $("a[href*='zdownload.php'], a[href*='fffast']").first().attr("href");
    if (fffastLink && fffastLink.startsWith("http")) {
      const cleanFffast = fffastLink.replace(/&amp;/g, "&");
      try {
        const redRes = await axios.get(cleanFffast, {
          headers: { "User-Agent": USER_AGENT, Referer: targetUrl },
          maxRedirects: 0,
          validateStatus: (s: number) => s >= 200 && s < 400,
          timeout: 4000,
        });
        const location = redRes.headers.location;
        if (location && location.startsWith("http")) {
          seen.add(location);
          streams.push({
            server: `Google Direct Fast Stream (10Gbps) [${q}p]`,
            link: location,
            type: "mp4",
            quality: q,
            headers: { "User-Agent": USER_AGENT },
          });
        }
      } catch (e) {
        if (!seen.has(cleanFffast)) {
          seen.add(cleanFffast);
          streams.push({
            server: `Fast Direct Stream (10Gbps) [${q}p]`,
            link: cleanFffast,
            type: "mp4",
            quality: q,
            headers: { "User-Agent": USER_AGENT, Referer: targetUrl },
          });
        }
      }
    }

    // 2. Cloud Direct (.r2.dev direct high-speed video streaming)
    $("a[href*='.r2.dev']").each((_: any, el: any) => {
      let href = $(el).attr("href");
      if (!href || href.includes("t.me") || href.includes("telegram")) return;
      if (!href.startsWith("http")) return;
      href = href.replace(/&amp;/g, "&");

      // Add token if needed as per filesdl client script
      if (!href.includes("token=")) {
        const randToken = Math.floor(1000000000 + Math.random() * 9000000000);
        href = `${href}${href.includes("?") ? "&" : "?"}token=${randToken}`;
      }

      if (!seen.has(href)) {
        seen.add(href);
        const text = $(el).text().trim() || titleText;
        const itemQ = extractQuality(text) !== "auto" ? extractQuality(text) : q;

        streams.push({
          server: `Cloud Direct (High Speed) [${itemQ}p]`,
          link: href,
          type: "mp4",
          quality: itemQ,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: targetUrl,
          },
        });
      }
    });

    // 3. Pixeldrain Direct API (Directly streamable via /api/file/<id> with byte-range support)
    $("a[href*='pixeldrain.com/u/'], a[href*='iwebp.store/u/']").each((_: any, el: any) => {
      let href = $(el).attr("href");
      if (!href) return;
      href = href.replace(/&amp;/g, "&");
      const match = href.match(/\/u\/([a-zA-Z0-9]+)/);
      if (match) {
        const pid = match[1];
        if (pid.toLowerCase() === "bigxxx") return; // placeholder on filesdl for oversized files
        const streamUrl = `https://pixeldrain.com/api/file/${pid}`;
        if (!seen.has(streamUrl)) {
          seen.add(streamUrl);
          streams.push({
            server: `Pixeldrain Fast Stream [${q}p]`,
            link: streamUrl,
            type: "mp4",
            quality: q,
            headers: { "User-Agent": USER_AGENT },
          });
        }
      }
    });

    // 4. Fallback: Any direct media URL in raw HTML
    if (streams.length === 0) {
      const mediaRe = /https?:\/\/[^"'\s<>]+\.(?:mp4|mkv|m3u8)[^"'\s<>]*/gi;
      let m: RegExpExecArray | null;
      while ((m = mediaRe.exec(html)) !== null) {
        const u = m[0].replace(/&amp;/g, "&");
        if (!seen.has(u)) {
          seen.add(u);
          const isHls = u.includes(".m3u8");
          streams.push({
            server: isHls ? "Direct HLS Stream" : "Direct Video Stream",
            link: u,
            type: isHls ? "m3u8" : "mp4",
            quality: q,
            headers: { "User-Agent": USER_AGENT, Referer: targetUrl },
          });
        }
      }
    }
  } catch (err: any) {
    console.error("FilesDL parse error:", err?.message || err);
  }

  return streams;
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios, cheerio } = providerContext;
  if (!link) return [];

  // Normalize /drive/ to /cloud/ so highest qualities don't hit challenge page
  let cleanLink = link;
  if (cleanLink.includes("filesdl") && cleanLink.includes("/drive/")) {
    cleanLink = cleanLink.replace("/drive/", "/cloud/");
  }

  // Case 1: link is a direct video/stream URL
  if (/\.(m3u8|mp4|mkv)(\?|$)/i.test(cleanLink)) {
    const isHls = cleanLink.includes(".m3u8");
    return [
      {
        server: "Direct Stream",
        link: cleanLink,
        type: isHls ? "m3u8" : "mp4",
        quality: extractQuality(cleanLink),
        headers: { "User-Agent": USER_AGENT },
      },
    ];
  }

  // Case 2: link is a filesdl link (most common for directLinks)
  if (cleanLink.includes("filesdl") || cleanLink.includes("/cloud/") || cleanLink.includes("/drive/")) {
    return extractFromFilesdl(cleanLink, axios, cheerio, signal);
  }

  // Case 3: link is a linkmake.in protector link
  if (cleanLink.includes("linkmake.in")) {
    try {
      const res = await axios.get(cleanLink, {
        headers: { "User-Agent": USER_AGENT },
        signal,
        timeout: 10000,
      });
      const html = res.data || "";
      const $ = cheerio.load(html);

      // Extract all filesdl links (including 1080p and 2160p/4K)
      const filesdlUrls: string[] = [];
      const seenFurls = new Set<string>();
      $(".dlink a, a[href*='filesdl']").each((_: any, a: any) => {
        let href = $(a).attr("href");
        if (href && href.startsWith("http")) {
          if (href.includes("/drive/")) href = href.replace("/drive/", "/cloud/");
          if (!seenFurls.has(href)) {
            seenFurls.add(href);
            filesdlUrls.push(href);
          }
        }
      });

      const batchResults = await Promise.all(
        filesdlUrls.slice(0, 10).map((furl) =>
          extractFromFilesdl(furl, axios, cheerio, signal).catch(() => [])
        )
      );
      const allStreams: Stream[] = [];
      const seenLinks = new Set<string>();
      for (const list of batchResults) {
        for (const s of list) {
          if (s.link && !seenLinks.has(s.link)) {
            seenLinks.add(s.link);
            allStreams.push(s);
          }
        }
      }
      const qualRank = (q?: string) => {
        if (q === "2160") return 4;
        if (q === "1080") return 3;
        if (q === "720") return 2;
        if (q === "480") return 1;
        return 0;
      };
      allStreams.sort((a, b) => qualRank(b.quality) - qualRank(a.quality));
      if (allStreams.length > 0) return allStreams;
    } catch (e) {}
  }

  // Case 4: link is a movie page URL
  try {
    const res = await axios.get(cleanLink, {
      headers: { "User-Agent": USER_AGENT },
      signal,
      timeout: 10000,
    });
    const html = res.data || "";
    const $ = cheerio.load(html);

    const btnHref = $(".dlbtn a, a.bg2, a[href*='linkmake'], a[href*='filesdl']").first().attr("href");
    if (btnHref && btnHref.startsWith("http")) {
      return getStream({
        link: btnHref,
        type,
        signal,
        providerContext,
        isDownload,
      });
    }
  } catch (e) {}

  return [];
};
