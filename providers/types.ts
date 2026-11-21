export interface Post {
  title: string;
  link: string;
  image: string;
  tag?: string;
  cornerTag?: string;
}

export interface DirectLink {
  title: string;
  link: string;
  type: string;
}

export interface LinkListGroup {
  title: string;
  directLinks: DirectLink[];
}

export interface Info {
  title: string;
  synopsis?: string;
  image?: string;
  poster?: string;
  imdbId?: string;
  type?: "movie" | "series";
  tags?: string[];
  views?: number;
  rating?: number;
  duration?: number;
  linkList?: LinkListGroup[];
}

export interface Stream {
  server: string;
  link: string;
  type: "m3u8" | "mp4";
  quality?: string;
  headers?: Record<string, string>;
}

export interface ProviderContext {
  axios: any;
  cheerio: any;
  commonHeaders: Record<string, string>;
  kvStore: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
}

export interface SettingsField {
  key: string;
  type: "text" | "toggle" | "select";
  label: string;
  description: string;
  placeholder?: string;
  defaultValue: any;
  options?: { label: string; value: string }[];
}
