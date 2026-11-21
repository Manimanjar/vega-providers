const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

function createMockContext() {
  const store = new Map();
  return {
    axios,
    cheerio,
    commonHeaders: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    kvStore: {
      get: async (k) => store.get(k),
      set: async (k, v) => store.set(k, v),
      delete: async (k) => store.delete(k),
    },
  };
}

async function runTests() {
  console.log("==================================================");
  console.log("       VEGA PROVIDERS VERIFICATION SUITE          ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. FILMYFLY TESTS
  // -----------------------------------------------------------------
  console.log("--- 1. Testing FilmyFly Provider ---");
  const ffPosts = require(path.resolve(__dirname, "../dist/filmyfly/posts.js"));
  const ffMeta = require(path.resolve(__dirname, "../dist/filmyfly/meta.js"));
  const ffStream = require(path.resolve(__dirname, "../dist/filmyfly/stream.js"));
  const ffContext = createMockContext();

  let ffSampleLink = "";
  try {
    const posts = await ffPosts.getPosts({ page: 1, providerContext: ffContext });
    assert(Array.isArray(posts) && posts.length > 0, `FilmyFly getPosts returned ${posts.length} items`);
    if (posts.length > 0) {
      assert(!!posts[0].title, `First post has title: ${posts[0].title}`);
      assert(!!posts[0].link && posts[0].link.startsWith("http"), `First post has valid link: ${posts[0].link}`);
      assert(!posts[0].image.includes("60-65"), `First post has upgraded HD image: ${posts[0].image}`);
      ffSampleLink = posts[0].link;
    }
  } catch (e) {
    assert(false, `FilmyFly getPosts error: ${e.message}`);
  }

  try {
    const searchResults = await ffPosts.getSearchPosts({
      searchQuery: "Pushpa",
      page: 1,
      providerContext: ffContext,
    });
    assert(Array.isArray(searchResults) && searchResults.length > 0, `FilmyFly getSearchPosts returned ${searchResults.length} items`);
  } catch (e) {
    assert(false, `FilmyFly getSearchPosts error: ${e.message}`);
  }

  let ffSampleDirectLinks = [];
  if (ffSampleLink) {
    try {
      const meta = await ffMeta.getMeta({ link: ffSampleLink, providerContext: ffContext });
      assert(!!meta.title && meta.title !== "Movie", `FilmyFly getMeta returned title: ${meta.title}`);
      assert(meta.type === "movie" || meta.type === "series", `FilmyFly getMeta returned type: ${meta.type}`);
      assert(Array.isArray(meta.linkList) && meta.linkList.length > 0, `FilmyFly getMeta returned ${meta.linkList?.length} linkList groups`);

      if (meta.linkList && meta.linkList.length > 0) {
        const directLinks = meta.linkList[0].directLinks || [];
        assert(directLinks.length > 0, `FilmyFly first group has ${directLinks.length} directLinks`);
        if (directLinks.length > 0) {
          ffSampleDirectLinks = [directLinks[0], directLinks[directLinks.length - 1]];
        }
      }
    } catch (e) {
      assert(false, `FilmyFly getMeta error: ${e.message}`);
    }
  }

  for (const dl of ffSampleDirectLinks) {
    try {
      const streams = await ffStream.getStream({
        link: dl.link,
        type: "movie",
        providerContext: ffContext,
      });
      assert(Array.isArray(streams) && streams.length > 0, `FilmyFly (${dl.title}) resolved ${streams.length} stream servers`);
      if (streams.length > 0) {
        const primary = streams[0];
        assert(!!primary.link && primary.link.startsWith("http"), `FilmyFly stream URL valid: ${primary.server}`);
        assert(primary.type === "mp4" || primary.type === "m3u8", `FilmyFly stream type: ${primary.type}`);

        // Test real HTTP byte-range connectivity
        try {
          const streamCheck = await axios.get(primary.link, {
            headers: {
              ...(primary.headers || {}),
              Range: "bytes=0-1024",
            },
            responseType: "stream",
            timeout: 8000,
          });
          assert(
            streamCheck.status === 200 || streamCheck.status === 206,
            `FilmyFly (${primary.server}) playable with HTTP ${streamCheck.status} (${streamCheck.headers["content-type"]})`
          );
          if (streamCheck.data && typeof streamCheck.data.destroy === "function") {
            streamCheck.data.destroy();
          }
        } catch (e) {
          assert(false, `FilmyFly stream HTTP check failed for ${primary.server}: ${e.message}`);
        }
      }
    } catch (e) {
      assert(false, `FilmyFly getStream error for ${dl.title}: ${e.message}`);
    }
  }

  // -----------------------------------------------------------------
  // 2. PORNHUB TESTS
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing PornHub Provider ---");
  const phPosts = require(path.resolve(__dirname, "../dist/pornhub/posts.js"));
  const phMeta = require(path.resolve(__dirname, "../dist/pornhub/meta.js"));
  const phStream = require(path.resolve(__dirname, "../dist/pornhub/stream.js"));
  const phContext = createMockContext();

  let phSampleLink = "";
  try {
    const t0 = Date.now();
    const posts = await phPosts.getPosts({
      filter: "homepage",
      page: 1,
      providerContext: phContext,
    });
    const dur = Date.now() - t0;
    assert(Array.isArray(posts) && posts.length > 0, `PornHub homepage loaded ${posts.length} posts in ${dur}ms`);
    if (posts.length > 0) {
      assert(!!posts[0].title, `PornHub first post has valid title`);
      assert(!!posts[0].image && posts[0].image.startsWith("http"), `PornHub first post has thumbnail image`);
      phSampleLink = posts[0].link;
      assert(
        !posts[0].image.includes("pix-cdn77.phncdn.com"),
        `PornHub thumbnail is not using blocked pix-cdn77 (${posts[0].image})`
      );
    }
    } catch (e) {
      assert(false, `PornHub homepage getPosts error: ${e.message}`);
    }

  // Test multi_query category performance (e.g. rel_sister)
  try {
    const t0 = Date.now();
    const sisterPosts = await phPosts.getPosts({
      filter: "rel_sister",
      page: 1,
      providerContext: phContext,
    });
    const dur = Date.now() - t0;
    assert(
      Array.isArray(sisterPosts) && sisterPosts.length > 0,
      `PornHub multi_query 'rel_sister' loaded ${sisterPosts.length} posts in ${dur}ms (rapid batch)`
    );
  } catch (e) {
    assert(false, `PornHub 'rel_sister' getPosts error: ${e.message}`);
  }

  // Test Search
  try {
    const searchResults = await phPosts.getSearchPosts({
      searchQuery: "step",
      page: 1,
      providerContext: phContext,
    });
    assert(Array.isArray(searchResults) && searchResults.length > 0, `PornHub getSearchPosts returned ${searchResults.length} items`);
  } catch (e) {
    assert(false, `PornHub getSearchPosts error: ${e.message}`);
  }

  // Test getMeta & linkList contract
  if (phSampleLink) {
    try {
      const meta = await phMeta.getMeta({ link: phSampleLink, providerContext: phContext });
      assert(!!meta.title && meta.title !== "Video", `PornHub getMeta returned valid non-placeholder title`);
      assert(meta.type === "movie", `PornHub getMeta has type: '${meta.type}'`);
      assert(!!meta.poster || !!meta.image, `PornHub getMeta has poster/image populated`);
      assert(
        !meta.image?.includes("pix-cdn77.phncdn.com"),
        `PornHub meta poster is not on blocked pix-cdn77`
      );
      assert(!!meta.synopsis, `PornHub getMeta has synopsis populated`);
      assert(meta.rating === undefined || typeof meta.rating === "string", `PornHub getMeta rating is string or undefined (got ${typeof meta.rating})`);
      if (meta.rating) {
        assert(typeof meta.rating.replace === "function", `PornHub rating '${meta.rating}' is string safe for ContentOverview.replace`);
      }
      assert(Array.isArray(meta.linkList) && meta.linkList.length > 0, `PornHub getMeta populated linkList (${meta.linkList?.length} groups)`);

      if (meta.linkList && meta.linkList.length > 0) {
        const direct = meta.linkList[0].directLinks || [];
        assert(direct.length > 0, `PornHub first linkList group has ${direct.length} directLinks`);
        assert(direct[0].type === "movie", `PornHub directLink type is 'movie'`);
      }
    } catch (e) {
      assert(false, `PornHub getMeta error: ${e.message}`);
    }

    // Test getStream & HLS playback resolution
    try {
      const streams = await phStream.getStream({
        link: phSampleLink,
        type: "movie",
        providerContext: phContext,
      });
      assert(Array.isArray(streams) && streams.length > 0, `PornHub getStream resolved ${streams.length} video streams`);
      if (streams.length > 0) {
        const hlsStream = streams.find((s) => s.type === "m3u8") || streams[0];
        assert(!!hlsStream.link && hlsStream.link.startsWith("http"), `Stream URL valid`);
        assert(!!hlsStream.headers && !!hlsStream.headers.Referer, `Stream has valid Referer header`);

        // Verify CDN response
        try {
          const res = await axios.get(hlsStream.link, {
            headers: hlsStream.headers,
            timeout: 8000,
          });
          assert(
            res.status === 200,
            `PornHub stream CDN returns HTTP ${res.status} (${res.headers["content-type"]})`
          );
        } catch (e) {
          assert(false, `PornHub stream CDN request failed: ${e.message}`);
        }
      }
    } catch (e) {
      assert(false, `PornHub getStream error: ${e.message}`);
    }
  }

  // -----------------------------------------------------------------
  // 3. RULE34VIDEO TESTS
  // -----------------------------------------------------------------
  console.log("\n--- 3. Testing Rule34Video Provider ---");
  const r34Posts = require(path.resolve(__dirname, "../dist/rule34video/posts.js"));
  const r34Meta = require(path.resolve(__dirname, "../dist/rule34video/meta.js"));
  const r34Stream = require(path.resolve(__dirname, "../dist/rule34video/stream.js"));
  const r34Context = createMockContext();

  let r34SampleLink = "";
  try {
    const posts = await r34Posts.getPosts({
      filter: "homepage",
      page: 1,
      providerContext: r34Context,
    });
    assert(Array.isArray(posts) && posts.length > 0, `Rule34Video homepage loaded ${posts.length} posts`);
    if (posts.length > 0) {
      assert(!!posts[0].title, `Rule34Video first post has title: '${posts[0].title.slice(0, 30)}...'`);
      assert(!!posts[0].image, `Rule34Video first post has thumbnail image: ${posts[0].image}`);
      assert(posts[0].image.includes("preview.jpg"), `Rule34Video thumbnail upgraded to HD preview.jpg`);
      r34SampleLink = posts[0].link;

      // Verify HD thumbnail loads with HTTP 200
      try {
        const imgRes = await axios.head(posts[0].image, {
          headers: { Referer: "https://rule34video.com/" },
          timeout: 6000,
        });
        assert(imgRes.status === 200, `Rule34Video HD poster returns HTTP 200 (Content-Length: ${imgRes.headers["content-length"]})`);
      } catch (e) {
        assert(false, `Rule34Video thumbnail check failed: ${e.message}`);
      }
    }
  } catch (e) {
    assert(false, `Rule34Video getPosts error: ${e.message}`);
  }

  if (r34SampleLink) {
    try {
      const meta = await r34Meta.getMeta({ link: r34SampleLink, providerContext: r34Context });
      assert(!!meta.title, `Rule34Video getMeta returned valid title`);
      assert(meta.type === "movie", `Rule34Video getMeta type: '${meta.type}'`);
      assert(!!meta.poster, `Rule34Video getMeta has poster populated`);
      assert(meta.poster.includes("preview.jpg"), `Rule34Video meta poster upgraded to HD preview.jpg`);
      assert(Array.isArray(meta.linkList) && meta.linkList.length > 0, `Rule34Video meta linkList has ${meta.linkList?.length} groups`);
      assert(meta.linkList[0].directLinks.length > 0, `Rule34Video directLinks has ${meta.linkList[0].directLinks.length} items`);
    } catch (e) {
      assert(false, `Rule34Video getMeta error: ${e.message}`);
    }

    try {
      const streams = await r34Stream.getStream({
        link: r34SampleLink,
        type: "movie",
        providerContext: r34Context,
      });
      assert(Array.isArray(streams) && streams.length > 0, `Rule34Video resolved ${streams.length} stream qualities`);
      if (streams.length > 0) {
        const fastStream = streams.find((s) => s.link.includes("boomio-cdn.com")) || streams[0];
        assert(fastStream.link.includes("boomio-cdn.com"), `Rule34Video resolved directly to fast CDN: ${fastStream.server}`);
        
        // Test byte-range HTTP 206 streaming connectivity
        try {
          const res = await axios.get(fastStream.link, {
            headers: {
              ...(fastStream.headers || {}),
              Range: "bytes=0-1024",
            },
            responseType: "stream",
            timeout: 8000,
          });
          assert(
            res.status === 200 || res.status === 206,
            `Rule34Video stream playable with HTTP ${res.status} (${res.headers["content-type"]})`
          );
          if (res.data && typeof res.data.destroy === "function") {
            res.data.destroy();
          }
        } catch (e) {
          assert(false, `Rule34Video stream HTTP check failed: ${e.message}`);
        }
      }
    } catch (e) {
      assert(false, `Rule34Video getStream error: ${e.message}`);
    }
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
