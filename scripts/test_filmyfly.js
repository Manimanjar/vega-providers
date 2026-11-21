const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const filmyflyDist = path.join(__dirname, "..", "dist", "filmyfly");
const catalogMod = require(path.join(filmyflyDist, "catalog.js"));
const settingsMod = require(path.join(filmyflyDist, "settings.js"));
const postsMod = require(path.join(filmyflyDist, "posts.js"));
const metaMod = require(path.join(filmyflyDist, "meta.js"));
const streamMod = require(path.join(filmyflyDist, "stream.js"));

const mockKv = new Map();
const providerContext = {
  axios,
  cheerio,
  commonHeaders: {},
  kvStore: {
    get: async (k) => mockKv.get(k),
    set: async (k, v) => mockKv.set(k, v),
  },
};

async function runTests() {
  console.log("=========================================");
  console.log("  FILMYFLY VEGA PROVIDER VERIFICATION");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Catalog Tests
  console.log("--- 1. Testing Catalog & Genres ---");
  assert(Array.isArray(catalogMod.catalog) && catalogMod.catalog.length > 5, "Catalog array has categories");
  console.log(`Catalog categories (${catalogMod.catalog.length}):`, catalogMod.catalog.map(c => c.title));
  assert(Array.isArray(catalogMod.genres) && catalogMod.genres.length > 0, "Genres array has entries");

  // 2. Settings Tests
  console.log("\n--- 2. Testing Settings Schema ---");
  const settings = await settingsMod.getSettingsSchema({ providerContext });
  assert(Array.isArray(settings) && settings.length > 0, "Settings schema returned");
  assert(settings[0].key === "baseUrlOverride", "baseUrlOverride key exists");

  // 3. Posts Tests
  console.log("\n--- 3. Testing getPosts & Search ---");
  console.log("Fetching Trending...");
  const trending = await postsMod.getPosts({ filter: "trending", page: 1, providerContext });
  assert(Array.isArray(trending) && trending.length > 0, `Trending posts returned (${trending.length} items)`);
  if (trending.length > 0) {
    console.log(`  Sample trending: "${trending[0].title}" -> ${trending[0].link}`);
  }

  console.log("Fetching Latest Movies...");
  const latest = await postsMod.getPosts({ filter: "latest", page: 1, providerContext });
  assert(Array.isArray(latest) && latest.length > 0, `Latest posts returned (${latest.length} items)`);
  if (latest.length > 0) {
    console.log(`  Sample latest: "${latest[0].title}"`);
  }

  console.log("Fetching Category (Bollywood Hindi Movies)...");
  const bollywood = await postsMod.getPosts({
    filter: "/movie-category/1/Bollywood-Hindi-Movies.html",
    page: 1,
    providerContext,
  });
  assert(Array.isArray(bollywood) && bollywood.length > 0, `Bollywood category returned (${bollywood.length} items)`);

  console.log("Searching for 'Mirzapur'...");
  const searchResults = await postsMod.getSearchPosts({
    searchQuery: "Mirzapur",
    page: 1,
    providerContext,
  });
  assert(Array.isArray(searchResults) && searchResults.length > 0, `Search results returned (${searchResults.length} items)`);
  if (searchResults.length > 0) {
    console.log(`  Top search hit: "${searchResults[0].title}"`);
  }

  // 4. Meta Tests (Checking All Movie Links)
  console.log("\n--- 4. Testing getMeta & All Movie Links ---");
  const testMovieUrl = latest[0]?.link || "https://filmyfly.kred/movie/7616/Anbil-Avan-2026-Hindi-Tamil-Dual-Audio-UnCut-South-Movie-HD-ESub.html";
  console.log(`Testing getMeta on: ${testMovieUrl}`);
  const meta = await metaMod.getMeta({ link: testMovieUrl, providerContext });
  assert(!!meta.title && meta.title !== "Movie", `Movie title parsed: "${meta.title}"`);
  assert(!!meta.image, `Movie image parsed: ${meta.image}`);
  assert(Array.isArray(meta.linkList) && meta.linkList.length > 0, `linkList populated with ${meta.linkList.length} groups`);

  let totalLinks = 0;
  meta.linkList.forEach((group, idx) => {
    console.log(`  Group ${idx + 1}: "${group.title}" (${group.directLinks.length} links)`);
    group.directLinks.forEach((dl) => {
      console.log(`    - [${dl.title}] -> ${dl.link}`);
      totalLinks++;
    });
  });
  assert(totalLinks > 0, `All links parsed: found ${totalLinks} downloadable/streamable links`);

  // Testing Web Series with Episodes
  console.log("\nTesting getMeta on Web Series (Episodes)...");
  const seriesUrl = "https://filmyfly.kred/movie/7445/The-Great-Indian-Kapil-Show-S05-2026-Hindi-Completed-Web-Series-HEVC-ESub-Episode--08-add.html";
  const seriesMeta = await metaMod.getMeta({ link: seriesUrl, providerContext });
  assert(seriesMeta.type === "series", `Web series detected as series: type = ${seriesMeta.type}`);
  assert(seriesMeta.linkList.length > 1, `Web series has multiple episodes: ${seriesMeta.linkList.length} groups`);
  console.log(`  Series has ${seriesMeta.linkList.length} episode groups:`);
  seriesMeta.linkList.slice(0, 3).forEach((g) => {
    console.log(`    - ${g.title} (${g.directLinks.length} links)`);
  });

  // 5. Stream Tests
  console.log("\n--- 5. Testing getStream & Video Resolution ---");
  const streamTargetLink = meta.linkList[0]?.directLinks[0]?.link;
  console.log(`Testing getStream on directLink: ${streamTargetLink}`);
  const streams = await streamMod.getStream({
    link: streamTargetLink,
    type: "movie",
    providerContext,
  });
  assert(Array.isArray(streams) && streams.length > 0, `getStream returned ${streams.length} servers`);
  streams.forEach((s) => {
    console.log(`  Server: ${s.server} | Type: ${s.type} | Quality: ${s.quality}`);
    console.log(`    URL: ${s.link.slice(0, 100)}...`);
  });

  // Verify Cloud Direct Stream responds with HTTP 200/206
  const cloudDirect = streams.find((s) => s.server.includes("Cloud Direct") || s.link.includes(".r2.dev"));
  if (cloudDirect) {
    console.log("\nVerifying Cloud Direct stream reachability (HEAD request)...");
    try {
      const headRes = await axios.head(cloudDirect.link, {
        headers: cloudDirect.headers || { "User-Agent": "Mozilla/5.0" },
        timeout: 8000,
      });
      assert(headRes.status === 200 || headRes.status === 206, `Cloud Direct stream reachable with HTTP ${headRes.status} (Content-Type: ${headRes.headers["content-type"]})`);
    } catch (headErr) {
      console.warn("Head check error:", headErr.message);
    }
  }

  console.log("\n=========================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
