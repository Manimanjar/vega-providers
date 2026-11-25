import { Stream, ProviderContext } from "../types";
import { getBaseUrl } from "./domain";

"use strict";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function unpack(p: string, a: number, c: number, k: string[], e?: any, d?: any): string {
  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp("\\b" + c.toString(a) + "\\b", "g"), k[c]);
    }
  }
  return p;
}

function safeUnpackJs(js: string): string {
  if (!js) return "";
  try {
    const evalMatch =
      js.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\('\|'\)\)\)/) ||
      js.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\("\\|"\)\)\)/);
    if (evalMatch) {
      const code = evalMatch[0].replace(/^eval/, "");
      // eslint-disable-next-line no-eval
      return Function(`"use strict"; return (${code})`)();
    }
  } catch (e) {}
  return js;
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
    // 1. Fetch post page
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

    let fileCode = "";

    // 2. Extract fileCode from iframe
    $("iframe").each((_: any, el: any) => {
      const src = $(el).attr("data-src") || $(el).attr("src") || "";
      const m = src.match(/(?:streamfiles?\.net)\/(?:e\/)?([a-zA-Z0-9_-]+)/);
      if (m && !fileCode) {
        fileCode = m[1].replace(/\.html$/, "");
      }
    });

    // 3. Fallback to play links
    if (!fileCode) {
      $('a[href*="streamfile"]').each((_: any, el: any) => {
        const href = $(el).attr("href") || "";
        const m = href.match(/(?:streamfiles?\.net)\/(?:e\/)?([a-zA-Z0-9_-]+)/);
        if (m && !fileCode) {
          fileCode = m[1].replace(/\.html$/, "");
        }
      });
    }

    // 4. Fallback to raw regex
    if (!fileCode) {
      const rawMatch = pageHtml.match(
        /(?:streamfiles?\.net)\/(?:e\/)?([a-zA-Z0-9_-]+)\.html/
      );
      if (rawMatch) {
        fileCode = rawMatch[1];
      }
    }

    if (!fileCode) return [];

    // 5. Query streamfile player resolver via /dl
    const postBody = `op=play&file_code=${fileCode}&embed=1&u=%2Fe%2F${fileCode}.html&ref=${encodeURIComponent(
      link
    )}`;

    const dlRes = await axios.post("https://streamfile.net/dl", postBody, {
      timeout: 9000,
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `https://streamfile.net/e/${fileCode}.html`,
        Origin: "https://streamfile.net",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, text/javascript, */*; q=0.01",
      },
    });

    const dlData = dlRes.data || {};
    const jsCode = dlData.js || "";
    const htmlCode = dlData.html || "";

    const unpacked = safeUnpackJs(jsCode);
    const combined = `${unpacked}\n${jsCode}\n${htmlCode}`;

    let masterM3u8 = "";
    const m3u8Match = combined.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*\b/);
    if (m3u8Match) {
      masterM3u8 = m3u8Match[0];
    }

    if (!masterM3u8) {
      const cleanM3u8 = combined.match(/https?:\/\/[a-zA-Z0-9_.-]+\.site\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
      if (cleanM3u8) {
        masterM3u8 = cleanM3u8[0];
      }
    }

    if (!masterM3u8) return [];

    const streams: Stream[] = [];
    const headers = {
      Referer: "https://streamfile.net/",
      Origin: "https://streamfile.net",
      "User-Agent": USER_AGENT,
    };

    // Auto adaptive master stream
    streams.push({
      server: "Fast CDN (Adaptive Auto)",
      link: masterM3u8,
      type: "m3u8",
      quality: "auto",
      headers,
    });

    // Check if multi-quality set exists
    if (masterM3u8.includes(".urlset/master.m3u8")) {
      if (masterM3u8.includes(`${fileCode}_x`)) {
        const u1080 = masterM3u8.replace(
          /,[^,]*\.urlset\/master\.m3u8/,
          `/${fileCode}_x/index-v1-a1.m3u8`
        );
        streams.push({
          server: "Fast CDN (1080p FHD)",
          link: u1080,
          type: "m3u8",
          quality: "1080",
          headers,
        });
      }

      if (masterM3u8.includes(`${fileCode}_h`)) {
        const u720 = masterM3u8.replace(
          /,[^,]*\.urlset\/master\.m3u8/,
          `/${fileCode}_h/index-v1-a1.m3u8`
        );
        streams.push({
          server: "Fast CDN (720p HD)",
          link: u720,
          type: "m3u8",
          quality: "720",
          headers,
        });
      }

      if (masterM3u8.includes(`${fileCode}_n`)) {
        const u480 = masterM3u8.replace(
          /,[^,]*\.urlset\/master\.m3u8/,
          `/${fileCode}_n/index-v1-a1.m3u8`
        );
        streams.push({
          server: "Fast CDN (480p SD)",
          link: u480,
          type: "m3u8",
          quality: "480",
          headers,
        });
      }

      if (masterM3u8.includes(`${fileCode}_l`)) {
        const u360 = masterM3u8.replace(
          /,[^,]*\.urlset\/master\.m3u8/,
          `/${fileCode}_l/index-v1-a1.m3u8`
        );
        streams.push({
          server: "Fast CDN (360p Low)",
          link: u360,
          type: "m3u8",
          quality: "360",
          headers,
        });
      }
    }

    if (isDownload) {
      // Prioritize highest static resolution for downloading
      streams.sort((a, b) => {
        const qA = parseInt(a.quality || "0", 10) || 0;
        const qB = parseInt(b.quality || "0", 10) || 0;
        return qB - qA;
      });
    }

    return streams;
  } catch (e: any) {
    return [];
  }
}
