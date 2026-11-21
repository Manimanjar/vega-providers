import { Stream, ProviderContext } from "../types";

"use strict";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractQuality(str: string): "2160" | "1080" | "720" | "480" | "auto" {
  if (/2160p|4k/i.test(str)) return "2160";
  if (/1080p/i.test(str)) return "1080";
  if (/720p/i.test(str)) return "720";
  if (/480p/i.test(str)) return "480";
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

  try {
    const res = await axios.get(filesdlUrl, {
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

    // 1. Cloud Direct / Fast Cloud (.r2.dev direct streaming)
    $("a[href*='.r2.dev'], a.download-link, a.button2").each((_: any, el: any) => {
      let href = $(el).attr("href");
      if (!href || seen.has(href)) return;
      if (!href.startsWith("http")) return;
      if (href.includes("t.me") || href.includes("telegram")) return;

      // Add token if needed as per filesdl client script
      if (href.includes(".r2.dev") && !href.includes("&token=")) {
        const randToken = Math.floor(1000000000 + Math.random() * 9000000000);
        href = `${href}&token=${randToken}`;
      }

      seen.add(href);
      const text = $(el).text().trim() || "Cloud Direct";
      const q = extractQuality(text) !== "auto" ? extractQuality(text) : defaultQuality;

      streams.push({
        server: `Cloud Direct (High Speed) [${q}p]`,
        link: href,
        type: "mp4",
        quality: q,
        headers: {
          "User-Agent": USER_AGENT,
          Referer: filesdlUrl,
        },
      });
    });

    // 2. Direct Download (10Gbps)
    $("a[href*='zdownload.php'], a.button").each((_: any, el: any) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href)) return;
      if (!href.startsWith("http")) return;

      seen.add(href);
      const text = $(el).text().trim() || "Direct Download";
      const q = extractQuality(text) !== "auto" ? extractQuality(text) : defaultQuality;

      streams.push({
        server: `Direct Download 10Gbps [${q}p]`,
        link: href,
        type: "mp4",
        quality: q,
        headers: {
          "User-Agent": USER_AGENT,
          Referer: filesdlUrl,
        },
      });
    });

    // 3. Pixeldrain
    $("a[href*='pixeldrain'], a[href*='iwebp.store/u/']").each((_: any, el: any) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "Pixeldrain Fast Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT },
      });
    });

    // 4. HubCloud
    $("a[href*='hubcloud']").each((_: any, el: any) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "HubCloud Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT },
      });
    });

    // 5. GoFile
    $("a[href*='gofile.io']").each((_: any, el: any) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "GoFile Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT },
      });
    });

    // 6. Buzzheavier / FuckingFast
    $("a[href*='fuckingfast.net'], a[href*='buzzheavier']").each((_: any, el: any) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "Buzzheavier Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT },
      });
    });

    // 7. GDFlix
    $("a[href*='gdflix']").each((_: any, el: any) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "GDFlix Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT },
      });
    });

    // 8. Drivenext
    $("a[href*='drivenext']").each((_: any, el: any) => {
      const href = $(el).attr("href");
      if (!href || seen.has(href) || !href.startsWith("http")) return;
      seen.add(href);
      streams.push({
        server: "Drivenext Server",
        link: href,
        type: "mp4",
        quality: defaultQuality,
        headers: { "User-Agent": USER_AGENT },
      });
    });

    // Fallback: any direct media URL in raw HTML
    if (streams.length === 0) {
      const mediaRe = /https?:\/\/[^"'\s<>]+\.(?:mp4|mkv|m3u8)[^"'\s<>]*/gi;
      let m: RegExpExecArray | null;
      while ((m = mediaRe.exec(html)) !== null) {
        const u = m[0];
        if (!seen.has(u)) {
          seen.add(u);
          const isHls = u.includes(".m3u8");
          streams.push({
            server: isHls ? "Direct HLS Stream" : "Direct Video Stream",
            link: u,
            type: isHls ? "m3u8" : "mp4",
            quality: defaultQuality,
            headers: { "User-Agent": USER_AGENT, Referer: filesdlUrl },
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

  // Case 1: link is a direct video/stream URL
  if (/\.(m3u8|mp4|mkv)(\?|$)/i.test(link)) {
    const isHls = link.includes(".m3u8");
    return [
      {
        server: "Direct Stream",
        link,
        type: isHls ? "m3u8" : "mp4",
        quality: extractQuality(link),
        headers: { "User-Agent": USER_AGENT },
      },
    ];
  }

  // Case 2: link is a filesdl link (most common for directLinks)
  if (link.includes("filesdl.in") || link.includes("/cloud/") || link.includes("/drive/")) {
    return extractFromFilesdl(link, axios, cheerio, signal);
  }

  // Case 3: link is a linkmake.in protector link
  if (link.includes("linkmake.in")) {
    try {
      const res = await axios.get(link, {
        headers: { "User-Agent": USER_AGENT },
        signal,
        timeout: 10000,
      });
      const html = res.data || "";
      const $ = cheerio.load(html);

      // Extract all filesdl links
      const filesdlUrls: string[] = [];
      $(".dlink a, a[href*='filesdl']").each((_: any, a: any) => {
        const href = $(a).attr("href");
        if (href && href.startsWith("http")) filesdlUrls.push(href);
      });

      const allStreams: Stream[] = [];
      // Parse up to 3 links to ensure rapid response
      for (const furl of filesdlUrls.slice(0, 3)) {
        const s = await extractFromFilesdl(furl, axios, cheerio, signal);
        allStreams.push(...s);
      }
      if (allStreams.length > 0) return allStreams;
    } catch (e) {}
  }

  // Case 4: link is a movie page URL
  try {
    const res = await axios.get(link, {
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
