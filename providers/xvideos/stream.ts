import { Stream, ProviderContext } from "../types";

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
  const { axios, commonHeaders, kvStore } = providerContext;

  let baseUrl = "https://www.xvideos.com";
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        baseUrl = custom.trim().replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  const videoPageUrl = link.startsWith("http")
    ? link
    : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

  const defaultHeaders = {
    ...commonHeaders,
    Referer: baseUrl,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    const res = await axios.get(videoPageUrl, {
      headers: defaultHeaders,
      signal,
    });
    const html = res.data;
    const streams: Stream[] = [];

    // 1. HLS Adaptive Stream (.m3u8)
    const hlsMatch = html.match(/html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (hlsMatch && hlsMatch[1]) {
      streams.push({
        server: "HLS Adaptive (Best)",
        link: hlsMatch[1],
        type: "m3u8",
        quality: "auto",
        headers: {
          Referer: baseUrl,
          "User-Agent": defaultHeaders["User-Agent"],
        },
      });
    }

    // 2. High Quality Direct MP4
    const highMatch = html.match(/html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (highMatch && highMatch[1]) {
      streams.push({
        server: "Direct MP4 (High)",
        link: highMatch[1],
        type: "mp4",
        quality: "720",
        headers: {
          Referer: baseUrl,
          "User-Agent": defaultHeaders["User-Agent"],
        },
      });
    }

    // 3. Low Quality Direct MP4
    const lowMatch = html.match(/html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (lowMatch && lowMatch[1]) {
      streams.push({
        server: "Direct MP4 (Low)",
        link: lowMatch[1],
        type: "mp4",
        quality: "360",
        headers: {
          Referer: baseUrl,
          "User-Agent": defaultHeaders["User-Agent"],
        },
      });
    }

    // If isDownload is true, prioritize direct MP4 files first so Vega's quick downloader can download directly
    if (isDownload) {
      streams.sort((a, b) => {
        if (a.type === "mp4" && b.type !== "mp4") return -1;
        if (a.type !== "mp4" && b.type === "mp4") return 1;
        return 0;
      });
    }

    return streams;
  } catch (err: any) {
    console.error("XVideos stream extraction error:", err?.message || err);
    return [];
  }
};
