// @vega-provider xvideos
// @vega-version 1.3
"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://www.xvideos.com";
var memoryCache = { data: null, expiresAt: 0 };

async function getBase(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        var cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {}
  }

  var now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    var cachedEntry = memoryCache.data["xvideos"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 4000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        var entry = res.data["xvideos"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      var learned = await kvStore.get("xvideos_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

var getStream = async function (params) {
  var link = params.link;
  var signal = params.signal;
  var providerContext = params.providerContext;
  var isDownload = params.isDownload;

  var axios = providerContext.axios;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  var videoPageUrl = link.startsWith("http")
    ? link
    : baseUrl + (link.startsWith("/") ? "" : "/") + link;

  var defaultHeaders = Object.assign({}, commonHeaders, {
    Referer: baseUrl,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  try {
    var res = await axios.get(videoPageUrl, {
      headers: defaultHeaders,
      signal: signal,
      maxRedirects: 5,
    });
    var html = res.data;
    var streams = [];

    // 1. Extract HLS and upgrade from hls_low.m3u8 to master hls.m3u8
    var hlsMatch = html.match(
      /html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    if (hlsMatch && hlsMatch[1]) {
      var rawHlsUrl = hlsMatch[1];
      var masterHlsUrl = rawHlsUrl.replace(/\/hls_low\.m3u8/i, "/hls.m3u8");
      var baseUrlDir = masterHlsUrl.substring(
        0,
        masterHlsUrl.lastIndexOf("/") + 1
      );

      try {
        var hlsRes = await axios.get(masterHlsUrl, {
          headers: defaultHeaders,
          timeout: 5000,
          signal: signal,
        });
        var playlist = hlsRes.data;

        if (typeof playlist === "string" && playlist.indexOf("#EXTM3U") !== -1) {
          var lines = playlist.split(/\r?\n/);
          var variants = [];

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf("#EXT-X-STREAM-INF:") === 0) {
              var nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
              if (nextLine && nextLine.indexOf("#") !== 0) {
                var subUrl = nextLine.indexOf("http") === 0
                  ? nextLine
                  : baseUrlDir + nextLine;
                var nameMatch = line.match(/NAME="([^"]+)"/i);
                var resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
                var bwMatch = line.match(/BANDWIDTH=(\d+)/i);

                var height = resMatch ? resMatch[2] : "";
                var qualityName = nameMatch
                  ? nameMatch[1]
                  : height
                  ? height + "p"
                  : "HD";
                var qualNumber = qualityName.replace(/[^0-9]/g, "");
                var bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;

                variants.push({
                  name: qualityName,
                  url: subUrl,
                  quality: qualNumber || "1080",
                  bandwidth: bandwidth,
                });
              }
            }
          }

          // Sort variants highest bandwidth/resolution first (4K -> 1440p -> 1080p -> 720p -> 480p)
          variants.sort(function (a, b) {
            return b.bandwidth - a.bandwidth;
          });

          for (var j = 0; j < variants.length; j++) {
            var v = variants[j];
            var label = "Direct " + v.name + " (Full Bitrate)";
            if (v.quality === "2160") label = "Direct 4K Ultra HD (2160p)";
            else if (v.quality === "1440") label = "Direct 2K QHD (1440p)";
            else if (v.quality === "1080") label = "Direct 1080p Full HD";
            else if (v.quality === "720") label = "Direct 720p HD";

            streams.push({
              server: label,
              link: v.url,
              type: "m3u8",
              quality: v.quality,
              headers: defaultHeaders,
            });
          }
        }
      } catch (hlsErr) {
        console.error("Master HLS fetch error:", hlsErr && hlsErr.message ? hlsErr.message : hlsErr);
      }

      // Add Master Adaptive HLS
      streams.push({
        server: "Auto Adaptive (Master HLS)",
        link: masterHlsUrl,
        type: "m3u8",
        quality: "auto",
        headers: defaultHeaders,
      });
    }

    // 2. High Quality MP4
    var highMatch = html.match(
      /html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    if (highMatch && highMatch[1]) {
      streams.push({
        server: "Direct MP4 (High)",
        link: highMatch[1],
        type: "mp4",
        quality: "720",
        headers: defaultHeaders,
      });
    }

    // 3. Low Quality MP4
    var lowMatch = html.match(
      /html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    if (lowMatch && lowMatch[1]) {
      streams.push({
        server: "Direct MP4 (Low)",
        link: lowMatch[1],
        type: "mp4",
        quality: "360",
        headers: defaultHeaders,
      });
    }

    if (isDownload) {
      streams.sort(function (a, b) {
        if (a.type === "mp4" && b.type !== "mp4") return -1;
        if (a.type !== "mp4" && b.type === "mp4") return 1;
        return 0;
      });
    }

    return streams;
  } catch (err) {
    console.error("XVideos stream extraction error:", err && err.message ? err.message : err);
    return [];
  }
};

exports.getStream = getStream;
