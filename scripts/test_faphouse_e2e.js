const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist", "faphouse");

// Mock Vega kvStore
const store = new Map();
const mockKvStore = {
  get: async (key) => store.get(key) || null,
  set: async (key, val) => store.set(key, val),
};

const providerContext = {
  axios,
  cheerio,
  commonHeaders: {},
  kvStore: mockKvStore,
};

async function runTests() {
  console.log("=== 1. Testing catalog.js ===");
  const catalogMod = require(path.join(distDir, "catalog.js"));
  console.log("Catalog length:", catalogMod.catalog ? catalogMod.catalog.length : 0);
  console.log("Sample category:", catalogMod.catalog ? catalogMod.catalog[0] : null);
  console.log("Genres length:", catalogMod.genres ? catalogMod.genres.length : 0);
  if (!catalogMod.catalog || catalogMod.catalog.length < 5) {
    throw new Error("Catalog verification failed!");
  }

  console.log("\n=== 2. Testing settings.js ===");
  const settingsMod = require(path.join(distDir, "settings.js"));
  const schema = await settingsMod.getSettingsSchema({ providerContext });
  console.log("Settings fields:", schema.map((f) => f.key));
  if (!schema.find((f) => f.key === "baseUrlOverride")) {
    throw new Error("baseUrlOverride missing in settings!");
  }

  console.log("\n=== 3. Testing posts.js (getPosts - Trending Page 1 & 2) ===");
  const postsMod = require(path.join(distDir, "posts.js"));
  const trending1 = await postsMod.getPosts({
    filter: "trending",
    page: 1,
    providerContext,
  });
  console.log("Trending P1 posts:", trending1.length);
  if (trending1.length === 0) throw new Error("No posts returned for Trending P1!");
  console.log("Trending P1 Sample:", {
    title: trending1[0].title.slice(0, 60),
    link: trending1[0].link,
    image: trending1[0].image.slice(0, 70),
    tag: trending1[0].tag,
    cornerTag: trending1[0].cornerTag,
  });

  const trending2 = await postsMod.getPosts({
    filter: "trending",
    page: 2,
    providerContext,
  });
  console.log("Trending P2 posts:", trending2.length);
  if (trending2.length === 0) throw new Error("No posts returned for Trending P2!");

  console.log("\n=== 4. Testing posts.js (getPosts - 3D Category) ===");
  const threeDPosts = await postsMod.getPosts({
    filter: "/c/3d/videos",
    page: 1,
    providerContext,
  });
  console.log("3D category posts:", threeDPosts.length);
  if (threeDPosts.length === 0) throw new Error("No posts for 3D category!");

  console.log("\n=== 5. Testing posts.js (getSearchPosts - Query 'step') ===");
  const searchPosts = await postsMod.getSearchPosts({
    searchQuery: "step",
    page: 1,
    providerContext,
  });
  console.log("Search 'step' posts:", searchPosts.length);
  if (searchPosts.length === 0) throw new Error("No search results for query 'step'!");

  console.log("\n=== 6. Testing meta.js (getMeta) ===");
  const metaMod = require(path.join(distDir, "meta.js"));
  const targetPost = trending1[0];
  console.log("Fetching meta for:", targetPost.link);
  const meta = await metaMod.getMeta({
    link: targetPost.link,
    providerContext,
  });
  console.log("Meta result:", {
    title: meta.title.slice(0, 60),
    synopsis: meta.synopsis.slice(0, 80) + "...",
    image: meta.image.slice(0, 60),
    imdbId: JSON.stringify(meta.imdbId),
    type: meta.type,
    rating: meta.rating,
    duration: meta.duration,
    tagsCount: meta.tags ? meta.tags.length : 0,
    castCount: meta.cast ? meta.cast.length : 0,
    linkListGroups: meta.linkList ? meta.linkList.length : 0,
  });

  // Strict assertion: imdbId must be string (not undefined), rating must be string
  if (typeof meta.imdbId !== "string") throw new Error("imdbId is not a string!");
  if (typeof meta.rating !== "string" || !meta.rating.includes("/")) {
    throw new Error("rating is not properly formatted!");
  }
  if (!meta.linkList || meta.linkList.length === 0) {
    throw new Error("linkList is missing or empty!");
  }

  console.log("\n=== 7. Testing stream.js (getStream) ===");
  const streamMod = require(path.join(distDir, "stream.js"));
  const streams = await streamMod.getStream({
    link: targetPost.link,
    type: "movie",
    signal: null,
    providerContext,
  });
  console.log("Streams returned count:", streams.length);
  if (streams.length === 0) throw new Error("No stream returned from getStream!");
  for (const st of streams) {
    console.log(`- ${st.quality} [${st.type}] ${st.server}: ${st.link.slice(0, 60)}...`);
  }

  console.log("\n=== 8. Validating direct playback via HEAD request ===");
  const topStream = streams[0];
  const headRes = await axios.head(topStream.link, {
    headers: topStream.headers,
    timeout: 5000,
  });
  console.log("Playback HTTP status:", headRes.status);
  console.log("Content-Type:", headRes.headers["content-type"]);
  console.log("Content-Length:", headRes.headers["content-length"]);
  console.log("Accept-Ranges:", headRes.headers["accept-ranges"]);

  if (headRes.status !== 200 && headRes.status !== 206) {
    throw new Error(`Top stream failed playback with HTTP ${headRes.status}`);
  }

  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED! <<<");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
