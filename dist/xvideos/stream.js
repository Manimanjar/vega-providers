// @vega-provider xvideos
// @vega-version 1.5
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

  var pageHeaders = Object.assign({}, commonHeaders, {
    Referer: baseUrl,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  var streamHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    var res = await axios.get(videoPageUrl, {
      headers: pageHeaders,
      signal: signal,
      maxRedirects: 5,
    });
    var html = res.data;
    var streams = [];

    // 1. High Speed Direct MP4 CDN streams (benchmarked up to 60+ Mbps)
    var highMatch = html.match(
      /html5player\.setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );
    var lowMatch = html.match(
      /html5player\.setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );

    // 2. Extract HLS Master & Variant streams
    var hlsMatch = html.match(
      /html5player\.setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/i
    );

    var masterHlsUrl = "";
    var hlsVariants = [];

    if (hlsMatch && hlsMatch[1]) {
      var rawHlsUrl = hlsMatch[1];
      masterHlsUrl = rawHlsUrl.replace(/\/hls_low\.m3u8/i, "/hls.m3u8");
      var baseUrlDir = masterHlsUrl.substring(
        0,
        masterHlsUrl.lastIndexOf("/") + 1
      );

      try {
        var hlsRes = await axios.get(masterHlsUrl, {
          headers: pageHeaders,
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

          variants.sort(function (a, b) {
            return b.bandwidth - a.bandwidth;
          });

          for (var j = 0; j < variants.length; j++) {
            var v = variants[j];
            var label = "Direct " + v.name + " (HLS Full Bitrate)";
            if (v.quality === "2160") label = "Direct 4K Ultra HD (HLS)";
            else if (v.quality === "1440") label = "Direct 2K QHD (HLS)";
            else if (v.quality === "1080") label = "Direct 1080p Full HD (HLS)";
            else if (v.quality === "720") label = "Direct 720p HD (HLS)";

            hlsVariants.push({
              server: label,
              link: v.url,
              type: "m3u8",
              quality: v.quality,
              headers: streamHeaders,
            });
          }
        }
      } catch (hlsErr) {
        console.error("Master HLS fetch error:", hlsErr && hlsErr.message ? hlsErr.message : hlsErr);
      }
    }

    if (isDownload) {
      if (highMatch && highMatch[1]) {
        streams.push({
          server: "Direct MP4 (High Speed 60Mbps)",
          link: highMatch[1],
          type: "mp4",
          quality: "1080",
          headers: streamHeaders,
        });
      }
      if (lowMatch && lowMatch[1]) {
        streams.push({
          server: "Direct MP4 (Low)",
          link: lowMatch[1],
          type: "mp4",
          quality: "360",
          headers: streamHeaders,
        });
      }
      if (masterHlsUrl) {
        streams.push({
          server: "Auto Adaptive (Master HLS - High Speed)",
          link: masterHlsUrl,
          type: "m3u8",
          quality: "auto",
          headers: streamHeaders,
        });
      }
      for (var d = 0; d < hlsVariants.length; d++) {
        streams.push(hlsVariants[d]);
      }
    } else {
      // 1. Auto Adaptive Master HLS FIRST (allows ExoPlayer adaptive bitrate for instant playback)
      if (masterHlsUrl) {
        streams.push({
          server: "Auto Adaptive (Master HLS - High Speed)",
          link: masterHlsUrl,
          type: "m3u8",
          quality: "auto",
          headers: streamHeaders,
        });
      }
      // 2. Direct MP4 High Speed (60 Mbps CDN)
      if (highMatch && highMatch[1]) {
        streams.push({
          server: "Direct MP4 (High Speed 60Mbps)",
          link: highMatch[1],
          type: "mp4",
          quality: "1080",
          headers: streamHeaders,
        });
      }
      // 3. Variant HLS streams
      for (var h = 0; h < hlsVariants.length; h++) {
        streams.push(hlsVariants[h]);
      }
      // 4. Low MP4 fallback
      if (lowMatch && lowMatch[1]) {
        streams.push({
          server: "Direct MP4 (Low)",
          link: lowMatch[1],
          type: "mp4",
          quality: "360",
          headers: streamHeaders,
        });
      }
    }

    return streams;
  } catch (err) {
    console.error("XVideos stream extraction error:", err && err.message ? err.message : err);
    return [];
  }
};

exports.getStream = getStream;
