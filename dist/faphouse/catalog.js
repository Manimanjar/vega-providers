// @vega-provider faphouse
// @vega-version 1.0.1
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// providers/faphouse/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog,
  genres: () => genres
});
module.exports = __toCommonJS(catalog_exports);
var catalog = [
  { title: "Trending", filter: "trending" },
  { title: "Best Rated", filter: "/best" },
  { title: "Latest Videos", filter: "/videos?sort=recent" },
  { title: "3D Videos", filter: "/c/3d/videos" },
  { title: "VR Videos", filter: "/vr" },
  { title: "Ultra HD / 4K", filter: "/ultra" },
  { title: "Amateur", filter: "/c/amateur/videos" },
  { title: "Anal", filter: "/c/anal/videos" },
  { title: "Big Tits", filter: "/c/big-tits/videos" },
  { title: "Big Ass", filter: "/c/big-ass/videos" },
  { title: "MILF", filter: "/c/milf/videos" },
  { title: "POV", filter: "/c/pov/videos" },
  { title: "Teen (18+)", filter: "/c/18-year-old/videos" },
  { title: "Japanese", filter: "/c/japanese/videos" },
  { title: "Threesome", filter: "/c/threesome/videos" },
  { title: "Blowjob", filter: "/c/blowjob/videos" },
  { title: "Creampie", filter: "/c/creampie/videos" },
  { title: "Lesbian", filter: "/c/lesbian/videos" },
  { title: "Masturbation", filter: "/c/masturbation/videos" },
  { title: "Cosplay", filter: "/c/cosplay/videos" },
  { title: "Anime / Cartoon", filter: "/c/cartoon/videos" },
  { title: "AI Enhanced", filter: "/c/ai-enhanced/videos" }
];
var genres = [
  { title: "3D Animation", filter: "/c/3d/videos" },
  { title: "VR", filter: "/vr" },
  { title: "Ultra HD", filter: "/ultra" },
  { title: "Amateur", filter: "/c/amateur/videos" },
  { title: "Anal", filter: "/c/anal/videos" },
  { title: "Big Tits", filter: "/c/big-tits/videos" },
  { title: "Big Ass", filter: "/c/big-ass/videos" },
  { title: "MILF", filter: "/c/milf/videos" },
  { title: "POV", filter: "/c/pov/videos" },
  { title: "Japanese", filter: "/c/japanese/videos" },
  { title: "Creampie", filter: "/c/creampie/videos" },
  { title: "Lesbian", filter: "/c/lesbian/videos" },
  { title: "Cosplay", filter: "/c/cosplay/videos" },
  { title: "Anime", filter: "/c/cartoon/videos" }
];
