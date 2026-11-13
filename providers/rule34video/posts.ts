import { Post, ProviderContext } from "../types";

const URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
const DEFAULT_BASE_URL = "https://rule34video.com";
let memoryCache = { data: null as any, expiresAt: 0 };

const seenVideoIds = new Set<string>();

const CURATED_TAGS = [
  {
    "title": "1girl",
    "filter": "/tags/1girl/"
  },
  {
    "title": "2D Animation",
    "filter": "/tags/?tag=2d&t=cat"
  },
  {
    "title": "3D Animation",
    "filter": "/tags/?tag=3d&t=cat"
  },
  {
    "title": "4k",
    "filter": "/tags/4k/"
  },
  {
    "title": "Ahegao",
    "filter": "/tags/ahegao/"
  },
  {
    "title": "Akali (league Of Legends)",
    "filter": "/tags/akali-league-of-legends/"
  },
  {
    "title": "Ako Zuri (blue Archive)",
    "filter": "/tags/ako-zuri-blue-archive/"
  },
  {
    "title": "Anal",
    "filter": "/tags/anal/"
  },
  {
    "title": "Animation",
    "filter": "/tags/animation/"
  },
  {
    "title": "Ari (in Heat)",
    "filter": "/tags/ari/"
  },
  {
    "title": "Arin (deadlock)",
    "filter": "/tags/arin-deadlock/"
  },
  {
    "title": "Ashley Succubi",
    "filter": "/tags/ashley-succubi/"
  },
  {
    "title": "Big Black Cock",
    "filter": "/tags/big-black-cock/"
  },
  {
    "title": "Big Breasts",
    "filter": "/tags/big-breasts/"
  },
  {
    "title": "Big Butt",
    "filter": "/tags/large-butt/"
  },
  {
    "title": "Big Penis",
    "filter": "/tags/big-penis/"
  },
  {
    "title": "Big Thighs",
    "filter": "/tags/big-thighs/"
  },
  {
    "title": "Big White Cock",
    "filter": "/tags/big-white-cock/"
  },
  {
    "title": "Blowjob",
    "filter": "/tags/blowjob/"
  },
  {
    "title": "Bouncing Ass",
    "filter": "/tags/bouncing-ass/"
  },
  {
    "title": "Bouncing Breasts",
    "filter": "/tags/bouncing-breasts/"
  },
  {
    "title": "Cecilia Schariac (honkai Star Rail)",
    "filter": "/tags/cecilia-schariac-honkai-star-rail/"
  },
  {
    "title": "Cowgirl Position",
    "filter": "/tags/cowgirl-position/"
  },
  {
    "title": "Creampie",
    "filter": "/tags/creampie/"
  },
  {
    "title": "Cum In Mouth",
    "filter": "/tags/cum-in-mouth/"
  },
  {
    "title": "Cumshot",
    "filter": "/tags/cumshot/"
  },
  {
    "title": "Deepthroat",
    "filter": "/tags/deepthroat/"
  },
  {
    "title": "Doggystyle Position",
    "filter": "/tags/doggystyle-position/"
  },
  {
    "title": "Elves No Radral (original)",
    "filter": "/tags/elves-no-radral-original/"
  },
  {
    "title": "Emilia (rezero)",
    "filter": "/tags/emilia-rezero/"
  },
  {
    "title": "Female",
    "filter": "/tags/female/"
  },
  {
    "title": "Female Moaning",
    "filter": "/tags/female-moaning/"
  },
  {
    "title": "From Behind",
    "filter": "/tags/from-behind/"
  },
  {
    "title": "Furry",
    "filter": "/tags/furry/"
  },
  {
    "title": "Futanari",
    "filter": "/tags/futanari/"
  },
  {
    "title": "Game",
    "filter": "/tags/game/"
  },
  {
    "title": "Gore",
    "filter": "/tags/gore/"
  },
  {
    "title": "Handjob",
    "filter": "/tags/handjob/"
  },
  {
    "title": "Hare (blue Archive)",
    "filter": "/tags/hare-blue-archive/"
  },
  {
    "title": "Konan (naruto)",
    "filter": "/tags/konan-naruto/"
  },
  {
    "title": "Looking At Viewer",
    "filter": "/tags/looking-at-viewer/"
  },
  {
    "title": "Lucky Chloe (tekken)",
    "filter": "/tags/lucky-chloe-tekken/"
  },
  {
    "title": "Male Pov",
    "filter": "/tags/male-pov/"
  },
  {
    "title": "Mandy",
    "filter": "/tags/mandy/"
  },
  {
    "title": "Masturbation",
    "filter": "/tags/masturbation/"
  },
  {
    "title": "Missionary Position",
    "filter": "/tags/missionary-position/"
  },
  {
    "title": "Moaning In Pleasure",
    "filter": "/tags/moaning-in-pleasure/"
  },
  {
    "title": "Music",
    "filter": "/tags/music/"
  },
  {
    "title": "Nekomata Okayu (1st Costume) (hololive)",
    "filter": "/tags/nekomata-okayu-1st-costume-hololive/"
  },
  {
    "title": "No Sound",
    "filter": "/tags/no-sound/"
  },
  {
    "title": "Nude",
    "filter": "/tags/nude/"
  },
  {
    "title": "Oda Nobukatsu (fate)",
    "filter": "/tags/oda-nobukatsu-fate/"
  },
  {
    "title": "Penis In Pussy",
    "filter": "/tags/penis-in-pussy/"
  },
  {
    "title": "Plana (blue Archive)",
    "filter": "/tags/plana-blue-archive/"
  },
  {
    "title": "Pmv",
    "filter": "/tags/pmv/"
  },
  {
    "title": "Pov",
    "filter": "/tags/pov/"
  },
  {
    "title": "Pussy",
    "filter": "/tags/pussy/"
  },
  {
    "title": "Pussy Job",
    "filter": "/tags/pussy-job/"
  },
  {
    "title": "Ripjaws",
    "filter": "/tags/ripjaws/"
  },
  {
    "title": "Sex",
    "filter": "/tags/sex/"
  },
  {
    "title": "Sex Sounds",
    "filter": "/tags/sex-sounds/"
  },
  {
    "title": "Sound",
    "filter": "/tags/sound/"
  },
  {
    "title": "Sovetsky Soyuz (azur Lane)",
    "filter": "/tags/sovetsky-soyuz-azur-lane/"
  },
  {
    "title": "Squirrel Boy",
    "filter": "/tags/squirrel-boy/"
  },
  {
    "title": "Straight",
    "filter": "/tags/straight/"
  },
  {
    "title": "Sunny Starscout (mlp)",
    "filter": "/tags/sunny-starscout-mlp/"
  },
  {
    "title": "Titty Fuck",
    "filter": "/tags/titty-fuck/"
  },
  {
    "title": "Tomoe Gozen (fate)",
    "filter": "/tags/tomoe-gozen-fate/"
  },
  {
    "title": "Typhon (arknights)",
    "filter": "/tags/typhon-arknights/"
  },
  {
    "title": "Vertical Video",
    "filter": "/tags/vertical-video/"
  },
  {
    "title": "Wardrobe Malfunction",
    "filter": "/tags/wardrobe-malfunction/"
  }
];

async function getBase(kvStore: any, axios: any): Promise<string> {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      const custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        const cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {}
  }

  const now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    const cachedEntry = memoryCache.data["rule34video"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  if (axios) {
    try {
      const res = await axios.get(URLS_ENDPOINT, { timeout: 4000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        const entry = res.data["rule34video"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      const learned = await kvStore.get("rule34video_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

function updateLearnedDomain(res: any, baseUrl: string, kvStore: any) {
  try {
    const finalUrl =
      res?.request?.responseURL ||
      res?.request?.res?.responseUrl ||
      res?.config?.url;
    if (finalUrl && typeof finalUrl === "string") {
      const parsed = new URL(finalUrl);
      const origin = parsed.origin;
      if (origin && origin !== baseUrl && kvStore && typeof kvStore.set === "function") {
        kvStore.set("rule34video_learnedDomain", origin);
      }
    }
  } catch (e) {}
}

async function parseTagsCatalogue(options: {
  url: string;
  baseUrl: string;
  axios: any;
  cheerio: any;
  commonHeaders: any;
  signal?: AbortSignal;
  kvStore: any;
}): Promise<Post[]> {
  const { url, baseUrl, axios, cheerio, commonHeaders, signal, kvStore } = options;
  const posts: Post[] = [];
  const seenSlugs = new Set<string>();

  for (const item of CURATED_TAGS) {
    const slugMatch = item.filter.match(/\/tags\/([^/?#]+)/i);
    const slug = slugMatch ? slugMatch[1] : item.title.toLowerCase().replace(/\s+/g, "-");
    seenSlugs.add(slug);
    posts.push({
      title: item.title,
      link: item.filter.startsWith("http") ? item.filter : `${baseUrl}${item.filter.startsWith("/") ? "" : "/"}${item.filter}`,
      image: `${baseUrl}/apple-touch-icon.png`,
      cornerTag: "TAG",
    });
  }

  try {
    const res = await axios.get(url, {
      headers: {
        ...commonHeaders,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl,
      },
      signal,
      maxRedirects: 5,
    });
    updateLearnedDomain(res, baseUrl, kvStore);

    const html = res.data;
    const $ = cheerio.load(html);

    $("a[href*=\"/tags/\"], a[href*=\"/categories/\"]").each((_: any, el: any) => {
      const $el = $(el);
      const rawHref = $el.attr("href") || "";
      let tagText = $el.text().trim();
      const img = $el.find("img").attr("src") || "";

      if (!rawHref || rawHref === "/tags/" || rawHref === "/categories/") return;
      if (rawHref.includes("terms") || rawHref.includes("privacy") || rawHref.includes("login") || rawHref.includes("compare")) return;
      if (tagText.length > 40 || tagText.toLowerCase() === "tags" || tagText.toLowerCase() === "compare similar tags") return;

      const slugMatch = rawHref.match(/\/(?:tags|categories)\/([^/?#]+)/i);
      if (!slugMatch) return;
      const slug = slugMatch[1];

      if (seenSlugs.has(slug)) {
        if (img) {
          const existing = posts.find(p => p.link.includes(slug));
          if (existing) existing.image = img;
        }
        return;
      }
      seenSlugs.add(slug);

      if (!tagText) {
        tagText = slug.replace(/-/g, " ");
      }

      const cleanTitle = tagText.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const fullLink = rawHref.startsWith("http")
        ? rawHref
        : `${baseUrl}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      posts.push({
        title: cleanTitle,
        link: fullLink,
        image: img || `${baseUrl}/apple-touch-icon.png`,
        cornerTag: "TAG",
      });
    });
  } catch (err: any) {
    console.error("Rule34Video tags live fetch error:", err?.message || err);
  }

  posts.sort((a, b) => a.title.localeCompare(b.title));
  return posts;
}

async function parseVideoGrid(options: {
  url: string;
  baseUrl: string;
  axios: any;
  cheerio: any;
  commonHeaders: any;
  signal?: AbortSignal;
  kvStore: any;
}): Promise<Post[]> {
  const { url, baseUrl, axios, cheerio, commonHeaders, signal, kvStore } = options;

  try {
    const res = await axios.get(url, {
      headers: {
        ...commonHeaders,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl,
      },
      signal,
      maxRedirects: 5,
    });

    updateLearnedDomain(res, baseUrl, kvStore);

    const html = res.data;
    const $ = cheerio.load(html);
    const posts: Post[] = [];

    if (seenVideoIds.size > 3000) {
      seenVideoIds.clear();
    }

    $(".item.thumb, [data-video-card-id]").each((_, element) => {
      const $el = $(element);
      const linkEl = $el.find("a.th, a[href*=\"/video/\"]").first();
      const rawHref = linkEl.attr("href") || "";
      const rawTitle =
        linkEl.attr("title") ||
        $el.find("img.thumb").attr("alt") ||
        linkEl.text().trim();

      if (!rawTitle || !rawHref) return;

      const idMatch = rawHref.match(/\/video\/([0-9]+)/i);
      const videoId = idMatch ? idMatch[1] : rawHref;

      if (seenVideoIds.has(videoId)) {
        return;
      }
      seenVideoIds.add(videoId);

      const img = $el.find("img.thumb, img").first();
      const image =
        img.attr("data-rd-jpg") ||
        img.attr("data-src") ||
        img.attr("src") ||
        "";

      const duration = $el.find(".time").first().text().trim();
      const isHd = $el.find(".quality").length > 0;
      const cornerTag = isHd ? "HD" : undefined;

      const absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : `${baseUrl}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image,
        tag: duration || undefined,
        cornerTag,
      });
    });

    return posts;
  } catch (err: any) {
    console.error("Rule34Video posts error:", err?.message || err);
    return [];
  }
}

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  let targetUrl = "";

  if (filter === "/tags/" || filter === "/tags") {
    return parseTagsCatalogue({
      url: `${baseUrl}/tags/`,
      baseUrl,
      axios,
      cheerio,
      commonHeaders,
      signal,
      kvStore,
    });
  }

  if (filter === "/?home=1" || filter === "/") {
    if (page === 1) {
      const randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = randomSeed > 1 ? `${baseUrl}/${randomSeed}/?_t=${Date.now()}` : `${baseUrl}/?_t=${Date.now()}`;
    } else {
      targetUrl = `${baseUrl}/${page}/`;
    }
  } else if (filter.startsWith("/search/")) {
    const cleanSearch = filter.replace(/\/+$/, "");
    targetUrl = page > 1 ? `${baseUrl}${cleanSearch}/${page}/` : `${baseUrl}${cleanSearch}/`;
  } else if (filter.startsWith("/tags/")) {
    if (filter.includes("?")) {
      targetUrl = page > 1 ? `${baseUrl}${filter}&from=${page}` : `${baseUrl}${filter}`;
    } else {
      const cleanTag = filter.replace(/\/+$/, "");
      targetUrl = page > 1 ? `${baseUrl}${cleanTag}/${page}/` : `${baseUrl}${cleanTag}/`;
    }
  } else if (filter.includes("?")) {
    targetUrl = page > 1 ? `${baseUrl}${filter}&from=${page}` : `${baseUrl}${filter}`;
  } else {
    targetUrl = page > 1 ? `${baseUrl}${filter}${page}/` : `${baseUrl}${filter}`;
  }

  return parseVideoGrid({
    url: targetUrl,
    baseUrl,
    axios,
    cheerio,
    commonHeaders,
    signal,
    kvStore,
  });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio, commonHeaders, kvStore } = providerContext;
  const baseUrl = await getBase(kvStore, axios);
  const cleanQuery = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-"));
  const targetUrl = page > 1 ? `${baseUrl}/search/${cleanQuery}/${page}/` : `${baseUrl}/search/${cleanQuery}/`;

  return parseVideoGrid({
    url: targetUrl,
    baseUrl,
    axios,
    cheerio,
    commonHeaders,
    signal,
    kvStore,
  });
};
