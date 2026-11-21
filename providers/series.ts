// Shared series / parts grouping for the video providers (XVideos +
// Rule34Video). Parts of one video (e.g. "Family Rules 0", "Family
// Rules 12 - New Flat", "Family Rules 8.5 Night Invasion", "Family
// Rules - 13 (Futa on Male)") roam through the lists as separate
// cards. This module collects them into ONE card — the first part's
// thumbnail and title — with every part reachable below it, like
// chapters in the comics app. Nothing is ever dropped: a video is
// either its own card or a part inside a series card, and the series
// detail (getMeta) lists every part again, so a part can never go
// missing or hidden because of grouping.
//
// The design, and why each guard exists (all verified live 2026-11-18):
// - A "part" needs an explicit part signal: a Part/Pt/Episode marker
//   with a number, a dash + number ("Family Rules - 13"), or a bare
//   number after the base ("Family Rules 12"). A bare number is only
//   trusted when the base is at least 2 words long ("Sister 2" and
//   "Teen 18" are NOT parts — their bases are 1 word, so they stay
//   separate cards). Years (1900-2100) and numbers >= 1000 are never
//   part numbers.
// - "Minus N" ("Family Rules Minus 1") is a named part, not Part 1 of
//   a series called "Family Rules Minus" — it is parsed as a named
//   part of "Family Rules".
// - Named parts with no number at all ("Completo", "Saturday",
//   "Last time") attach to a series only when the list already has
//   numbered parts with the same base — so a lone "Family Rules
//   Saturday" never invents a series on its own.
// - getMeta expands a series only for NUMBERED parts (the common
//   case). Expanding every video would add a site search to every
//   detail load. A named part opened directly still plays fine as a
//   single video, and it appears in the parts list when any numbered
//   part of its series is opened.
// - The group card keeps the FIRST part's title, thumbnail and link
//   (the user asked for the first video's thumbnail and title), and
//   its badge reads "N parts" so it is obvious it is a series.
// - Parts sort naturally: 0, 6, 8.5, 11, 12, 13 — never 0, 11, 12,
//   13, 6. Named parts sort after the numbered ones, alphabetically.
//   Two variants of one part ("13 (Futa on Male)" vs "13 (Futa on
//   Futa)") are both kept, alphabetical as the tiebreak.

function normalizeBase(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text) {
  var n = normalizeBase(text);
  return n ? n.split(" ").length : 0;
}

// The video's own poster, built from its numeric ID in the link:
// contents/videos_screenshots/<bucket>/<id>/preview.jpg where
// bucket = floor(id / 10000) * 10000. Used when a card's image is a
// lazy-load 1px placeholder (data: URI) or missing — the card then
// still gets a real thumbnail instead of an invisible one.
function r34PreviewFromLink(link, baseUrl) {
  var m = String(link || "").match(/\/video\/(\d+)/);
  if (!m) return "";
  var vid = parseInt(m[1], 10);
  var bucket = Math.floor(vid / 10000) * 10000;
  return baseUrl + "/contents/videos_screenshots/" + bucket + "/" + vid + "/preview.jpg";
}

// Strip a trailing duration the card parser sometimes leaves on the
// title ("20 min", "13:45") so it can never be read as a part number.
function stripTrailingDuration(title) {
  return String(title || "")
    .replace(/\s+\d{1,2}:\d{2}\s*$/, "")
    .replace(/\s+\d+\s*min\s*$/i, "")
    .trim();
}

function isYearLike(num) {
  return Number.isInteger(num) && num >= 1900 && num <= 2100;
}

// Parse a title into { base, baseKey, partNum, partLabel, subtitle }
// or null when it is not a numbered part. partNum is a number (an
// integer or a decimal like 8.5) or null for the "Minus N" named form
// (partLabel then carries "Minus N").
export function parsePartTitle(title) {
  var clean = stripTrailingDuration(title);
  if (!clean) return null;
  var m;

  // "Minus N" first: "Family Rules Minus 1" is a named part of
  // "Family Rules", NOT Part 1 of "Family Rules Minus".
  m = clean.match(/^(.*?)\s*[-–—:]?\s*minus\s+(\d+(?:\.\d+)?)\s*(.*)$/i);
  if (m && wordCount(m[1]) >= 2) {
    var minusBase = m[1].trim().replace(/[-–—:]+$/, "").trim();
    if (minusBase && wordCount(minusBase) >= 2) {
      return {
        base: minusBase,
        baseKey: normalizeBase(minusBase),
        partNum: null,
        partLabel: "Minus " + m[2],
        subtitle: (m[3] || "").trim(),
      };
    }
  }

  // Explicit marker: "Part 2", "Pt. 3", "Episode 4", "Ep 1", "Ch. 5", "Volume 1", "Vol 2", "Vol. 3", "V 1", "#1".
  m = clean.match(
    /^(.*?)\s*[-–—:]?\s*(?:part|pt\.?|volume|vol\.?|v\.?|episode|ep\.?|chapter|ch\.?|season|s\.?|book|bk\.?|#)\s*(\d+(?:\.\d+)?)\b\s*(.*)$/i
  );
  if (m) {
    var base1 = m[1].trim().replace(/[-–—:]+$/, "").trim();
    var num1 = parseFloat(m[2]);
    if (base1 && wordCount(base1) >= 2 && num1 < 1000) {
      return {
        base: base1,
        baseKey: normalizeBase(base1),
        partNum: num1,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim(),
      };
    }
  }

  // Dash + number: "Family Rules - 13 (Futa on Male)".
  m = clean.match(/^(.*?)\s*[-–—]\s*(\d+(?:\.\d+)?)\b\s*(.*)$/);
  if (m) {
    var base2 = m[1].trim();
    var num2 = parseFloat(m[2]);
    if (base2 && wordCount(base2) >= 2 && num2 < 1000 && !isYearLike(num2)) {
      return {
        base: base2,
        baseKey: normalizeBase(base2),
        partNum: num2,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim(),
      };
    }
  }

  // Bare number after the base: "Family Rules 12 - New Flat",
  // "Family Rules 8.5 Night Invasion". The 2-word base rule is what
  // keeps "Sister 2" and "Teen 18" as separate videos.
  m = clean.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*[-–—]?\s*(.*)$/);
  if (m) {
    var base3 = m[1].trim();
    var num3 = parseFloat(m[2]);
    if (base3 && wordCount(base3) >= 2 && num3 < 1000 && !isYearLike(num3)) {
      return {
        base: base3,
        baseKey: normalizeBase(base3),
        partNum: num3,
        partLabel: "Part " + m[2],
        subtitle: (m[3] || "").trim(),
      };
    }
  }

  return null;
}

export function isExplicitSeriesTitle(title: string): boolean {
  var clean = stripTrailingDuration(title);
  if (!clean) return false;
  return /[-–—:]?\s*(?:part|pt\.?|volume|vol\.?|v\.?|episode|ep\.?|chapter|ch\.?|season|s\.?|book|bk\.?|#)\s*\d+/i.test(clean);
}

// Natural compare: "Part 2" before "Part 10", "8.5" before "11".
// Splits into digit / non-digit chunks and compares chunk by chunk.
export function naturalCompare(a, b) {
  var ax = String(a || "").toLowerCase().match(/(\d+(?:\.\d+)?|\D+)/g) || [];
  var bx = String(b || "").toLowerCase().match(/(\d+(?:\.\d+)?|\D+)/g) || [];
  var len = Math.max(ax.length, bx.length);
  for (var i = 0; i < len; i++) {
    var x = ax[i] || "";
    var y = bx[i] || "";
    if (x === y) continue;
    var nx = parseFloat(x);
    var ny = parseFloat(y);
    if (!isNaN(nx) && !isNaN(ny)) return nx - ny;
    return x < y ? -1 : 1;
  }
  return 0;
}

// Sort parts: numbered first by part number (0, 6, 8.5, 11, 12, 13),
// then named parts alphabetically. Same part number (two variants of
// "13") falls back to the full title, alphabetically.
export function sortParts(parts) {
  return parts.slice().sort(function (a, b) {
    var an = a.partNum;
    var bn = b.partNum;
    if (an != null && bn != null && an !== bn) return an - bn;
    if (an != null && bn == null) return -1;
    if (an == null && bn != null) return 1;
    return naturalCompare(a.title || "", b.title || "");
  });
}

// Group a page of posts into series cards. Returns a new array:
// - every series of 2+ parts becomes ONE card (first part's title,
//   thumbnail, link; badge "N parts");
// - every other post passes through unchanged, in its original order;
// - series cards sit where their first part sat.
// The no-drop invariant: every input post is either an output card
// or a part inside exactly one series card.
export function groupSeriesPosts(posts) {
  var input = Array.isArray(posts) ? posts : [];
  if (input.length === 0) return [];

  // Pass 1: numbered parts, grouped by base.
  var groups = {};
  var groupOrder = [];
  var singles = [];
  var parsedByIndex = [];
  for (var i = 0; i < input.length; i++) {
    var p = input[i];
    var parsed = p && p.title ? parsePartTitle(p.title) : null;
    parsedByIndex.push(parsed);
    if (parsed && parsed.partNum != null) {
      var key = parsed.baseKey;
      if (!groups[key]) {
        groups[key] = { base: parsed.base, baseKey: key, parts: [], firstIndex: i };
        groupOrder.push(key);
      }
      groups[key].parts.push({
        title: p.title,
        link: p.link,
        image: p.image,
        tag: p.tag,
        cornerTag: p.cornerTag,
        _dur: p._dur || 0,
        partNum: parsed.partNum,
        partLabel: parsed.partLabel,
        subtitle: parsed.subtitle,
        index: i,
      });
    } else {
      singles.push({ post: p, index: i, parsed: parsed });
    }
  }

  // Keep only groups with 2+ numbered parts; the rest dissolve back
  // into singles (a lone "Part 1" with no siblings is just a video).
  var liveGroups = {};
  for (var g = 0; g < groupOrder.length; g++) {
    var grp = groups[groupOrder[g]];
    if (grp.parts.length >= 2) {
      liveGroups[grp.baseKey] = grp;
    } else {
      for (var q = 0; q < grp.parts.length; q++) {
        var solo = grp.parts[q];
        singles.push({ post: input[solo.index], index: solo.index, parsed: parsedByIndex[solo.index] });
      }
    }
  }

  // Pass 2: attach unnumbered posts to a live group when the title
  // starts with the group's base and the remainder is short — the
  // named parts ("Completo", "Saturday", "Last time", "Minus 1").
  // "Minus N" posts were already parsed (partNum null, partLabel set)
  // and land here through their base as well.
  var attached = {};
  var remainingSingles = [];
  for (var s = 0; s < singles.length; s++) {
    var entry = singles[s];
    var post = entry.post;
    var titleNorm = normalizeBase(post && post.title);
    var joined = null;
    var joinLabel = null;
    if (titleNorm) {
      for (var k in liveGroups) {
        var lg = liveGroups[k];
        if (titleNorm === lg.baseKey) continue;
        if (titleNorm.indexOf(lg.baseKey + " ") === 0) {
          var rest = titleNorm.slice(lg.baseKey.length).trim();
          var restWords = rest ? rest.split(" ").length : 0;
          if (restWords >= 1 && restWords <= 6) {
            joined = lg;
            // A parsed "Minus N" keeps its own label; anything else
            // uses the remainder as its named label.
            joinLabel =
              entry.parsed && entry.parsed.partLabel
                ? entry.parsed.partLabel
                : rest
                    .split(" ")
                    .map(function (w) {
                      return w.charAt(0).toUpperCase() + w.slice(1);
                    })
                    .join(" ");
            break;
          }
        }
      }
    }
    if (joined) {
      joined.parts.push({
        title: post.title,
        link: post.link,
        image: post.image,
        tag: post.tag,
        cornerTag: post.cornerTag,
        _dur: post._dur || 0,
        partNum: null,
        partLabel: joinLabel,
        subtitle: "",
        index: entry.index,
      });
      attached[entry.index] = true;
    } else {
      remainingSingles.push(entry);
    }
  }

  // Build the output in original order: a series card sits where its
  // first part sat; every other post passes through.
  var out = [];
  var emittedGroups = {};
  var singleByIndex = {};
  for (var r = 0; r < remainingSingles.length; r++) {
    singleByIndex[remainingSingles[r].index] = remainingSingles[r].post;
  }
  for (var i2 = 0; i2 < input.length; i2++) {
    if (singleByIndex[i2] !== undefined) {
      out.push(singleByIndex[i2]);
      continue;
    }
    if (attached[i2]) continue;
    var parsed2 = parsedByIndex[i2];
    if (parsed2 && parsed2.partNum != null && liveGroups[parsed2.baseKey]) {
      var lg2 = liveGroups[parsed2.baseKey];
      if (emittedGroups[lg2.baseKey]) continue;
      emittedGroups[lg2.baseKey] = true;
      var sorted = sortParts(lg2.parts);
      var first = sorted[0];
      var card = {
        title: first.title,
        link: first.link,
        image: first.image,
        tag: first.tag,
        _dur: first._dur || 0,
        cornerTag: sorted.length + " parts",
      };
      out.push(card);
      continue;
    }
    // A numbered part whose group dissolved (lone part) — emit as-is.
    out.push(input[i2]);
  }
  return out;
}

// Fetch every part of a series from the site, for getMeta's series
// expansion. Searches the base title, keeps only posts whose parsed
// base matches (or named parts starting with the base), sorts them.
// Returns [] on any failure — the caller then falls back to the
// single video, so a failed search can never hide a video.
export async function fetchSeriesParts(opts) {
  var axios = opts.axios;
  var cheerio = opts.cheerio;
  var baseUrl = opts.baseUrl;
  var site = opts.site;
  var baseTitle = opts.baseTitle;
  var commonHeaders = opts.commonHeaders || {};
  var signal = opts.signal;
  if (!axios || !cheerio || !baseUrl || !baseTitle) return [];
  var baseKey = normalizeBase(baseTitle);
  if (!baseKey) return [];

  var searchUrl;
  if (site === "xvideos") {
    searchUrl = baseUrl + "/?k=" + encodeURIComponent(baseTitle) + "&p=0";
  } else if (site === "pornhub") {
    searchUrl =
      baseUrl +
      "/webmasters/search?search=" +
      encodeURIComponent(baseTitle) +
      "&thumbsize=large_hd";
  } else {
    searchUrl =
      baseUrl + "/search/" + encodeURIComponent(baseTitle.trim().replace(/\s+/g, "-")) + "/";
  }

  var posts = [];
  try {
    // One retry: this runs when the user opens a video's detail
    // screen, and a single transient timeout would silently drop
    // the whole parts list.
    var res = null;
    var lastErr = null;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        res = await axios.get(searchUrl, {
          headers: Object.assign({}, commonHeaders, {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: baseUrl + "/",
          }),
          timeout: 12000,
          signal: signal,
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt === 0) {
          await new Promise(function (resolve) {
            setTimeout(resolve, 800);
          });
        }
      }
    }
    if (!res) throw lastErr || new Error("series search failed");

    if (site === "pornhub") {
      var vids = res.data && Array.isArray(res.data.videos) ? res.data.videos : [];
      for (var vi = 0; vi < vids.length; vi++) {
        var v = vids[vi];
        if (!v || !v.title || !v.url) continue;
        var durSec = 0;
        if (typeof v.duration === "number") durSec = v.duration;
        else if (typeof v.duration === "string") {
          var dp = v.duration.split(":").map(function (x) { return parseInt(x, 10) || 0; });
          if (dp.length === 3) durSec = dp[0] * 3600 + dp[1] * 60 + dp[2];
          else if (dp.length === 2) durSec = dp[0] * 60 + dp[1];
          else if (dp.length === 1) durSec = dp[0];
        }
        var thumb = v.default_thumb || (v.thumbs && v.thumbs[0] && v.thumbs[0].src) || "";
        posts.push({
          title: v.title,
          link: v.url,
          image: thumb,
          _dur: durSec,
        });
      }
      // If page 1 filled up to 30, fetch page 2 to gather any further parts of the series
      if (vids.length >= 30) {
        try {
          var res2 = await axios.get(searchUrl + "&page=2", {
            headers: Object.assign({}, commonHeaders, {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Referer: baseUrl + "/",
            }),
            timeout: 10000,
            signal: signal,
          });
          var vids2 = res2.data && Array.isArray(res2.data.videos) ? res2.data.videos : [];
          for (var vi2 = 0; vi2 < vids2.length; vi2++) {
            var v2 = vids2[vi2];
            if (!v2 || !v2.title || !v2.url) continue;
            var durSec2 = 0;
            if (typeof v2.duration === "number") durSec2 = v2.duration;
            else if (typeof v2.duration === "string") {
              var dp2 = v2.duration.split(":").map(function (x) { return parseInt(x, 10) || 0; });
              if (dp2.length === 3) durSec2 = dp2[0] * 3600 + dp2[1] * 60 + dp2[2];
              else if (dp2.length === 2) durSec2 = dp2[0] * 60 + dp2[1];
              else if (dp2.length === 1) durSec2 = dp2[0];
            }
            var thumb2 = v2.default_thumb || (v2.thumbs && v2.thumbs[0] && v2.thumbs[0].src) || "";
            posts.push({
              title: v2.title,
              link: v2.url,
              image: thumb2,
              _dur: durSec2,
            });
          }
        } catch (e2) {}
      }
    } else {
      var $ = cheerio.load(res.data || "");
      if (site === "xvideos") {
        $(".thumb-block").each(function (_, element) {
          var $el = $(element);
          var titleLink = $el.find("p.title a, .thumb-under p.title a, .title a").first();
          var rawTitle = titleLink.attr("title") || "";
          if (!rawTitle) {
            var cloned = titleLink.clone();
            cloned.find("span").remove();
            rawTitle = cloned.text().trim();
          }
          var rawHref = titleLink.attr("href") || $el.find(".thumb-inside a").first().attr("href") || "";
          if (!rawHref || !rawTitle) return;
          var img = $el.find("img").first();
          var image = img.attr("data-src") || img.attr("data-srcset") || img.attr("src") || "";
          var durText = $el.find(".duration, .video-duration").first().text().trim();
          var durSec = 0;
          var mm = durText.match(/(\d+)\s*min/i);
          var ss = durText.match(/(\d+)\s*sec/i);
          var hh = durText.match(/(\d+)\s*h/i);
          if (hh) durSec += parseInt(hh[1], 10) * 3600;
          if (mm) durSec += parseInt(mm[1], 10) * 60;
          if (ss) durSec += parseInt(ss[1], 10);
          posts.push({
            title: rawTitle,
            link: rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref,
            image: image,
            _dur: durSec,
          });
        });
      } else {
        $(".item.thumb, [data-video-card-id]").each(function (_, element) {
          var $el = $(element);
          var a = $el.find("a.th, a[href*=\"/video/\"]").first();
          var rawHref = a.attr("href") || "";
          var rawTitle = a.attr("title") || $el.find("img.thumb").attr("alt") || "";
          if (!rawHref || !rawTitle) return;
          // Skip non-video cards (channels, collections).
          if (rawHref.indexOf("/video/") === -1 && rawHref.indexOf("/videos/") === -1) return;
          var img = $el.find("img.thumb, img").first();
          var image =
            img.attr("data-rd-jpg") ||
            img.attr("data-src") ||
            img.attr("src") ||
            "";
          if (!image || image.indexOf("data:") === 0) {
            var idm = String(rawHref).match(/\/video\/(\d+)/);
            if (idm) {
              var vid2 = parseInt(idm[1], 10);
              var bucket2 = Math.floor(vid2 / 10000) * 10000;
              image = baseUrl + "/contents/videos_screenshots/" + bucket2 + "/" + vid2 + "/preview.jpg";
            }
          }
          if (!image || image.indexOf("data:") === 0) {
            var absLink = rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;
            image = r34PreviewFromLink(absLink, baseUrl) || image;
          }
          var durText = $el.find(".time").first().text().trim();
          var durSec = 0;
          var parts = durText.split(":").map(function (x) { return parseInt(x, 10) || 0; });
          if (parts.length === 2) durSec = parts[0] * 60 + parts[1];
          else if (parts.length === 3) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          posts.push({
            title: rawTitle,
            link: rawHref.startsWith("http") ? rawHref : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref,
            image: image,
            _dur: durSec,
          });
        });
      }
    }
  } catch (e) {
    return [];
  }

  // Keep only true parts of this series: same parsed base, or a named
  // part starting with the base.
  var seen = {};
  var kept = [];
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    if (!p.link || seen[p.link]) continue;
    var parsed = parsePartTitle(p.title);
    if (parsed && parsed.baseKey === baseKey && parsed.partNum != null) {
      seen[p.link] = true;
      kept.push({
        title: p.title,
        link: p.link,
        image: p.image,
        _dur: p._dur || 0,
        partNum: parsed.partNum,
        partLabel: parsed.partLabel,
      });
    } else if (parsed && parsed.baseKey === baseKey && parsed.partNum == null) {
      // "Minus N" named part.
      seen[p.link] = true;
      kept.push({
        title: p.title,
        link: p.link,
        image: p.image,
        _dur: p._dur || 0,
        partNum: null,
        partLabel: parsed.partLabel,
      });
    } else {
      var titleNorm = normalizeBase(p.title);
      if (titleNorm.indexOf(baseKey + " ") === 0) {
        var rest = titleNorm.slice(baseKey.length).trim();
        if (rest && rest.split(" ").length <= 6) {
          seen[p.link] = true;
          kept.push({
            title: p.title,
            link: p.link,
            image: p.image,
            _dur: p._dur || 0,
            partNum: null,
            partLabel: rest
              .split(" ")
              .map(function (w) {
                return w.charAt(0).toUpperCase() + w.slice(1);
              })
              .join(" "),
          });
        }
      }
    }
  }

  var sorted = sortParts(kept);
  return sorted.slice(0, 200);
}
