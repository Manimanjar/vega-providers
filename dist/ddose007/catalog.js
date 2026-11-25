// @vega-provider ddose007
// @vega-version 1.0.0
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

// providers/ddose007/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog,
  genres: () => genres
});
module.exports = __toCommonJS(catalog_exports);
var catalog = [
  { title: "Latest Videos", filter: "" },
  { title: "Desi Videos", filter: "category/desi-videos" },
  { title: "OnlyFans", filter: "category/onlyfans-videos" },
  { title: "Viral Videos", filter: "category/viral-videos" },
  { title: "Indian Live / STRIPCHAT", filter: "category/indian-live-shows" },
  { title: "Instagram Influencer", filter: "category/instagram-influencer" },
  { title: "Tango Live", filter: "category/tango-live" },
  { title: "Actress Exclusive", filter: "category/actress-exclusive" },
  { title: "Chamet Live", filter: "category/chamet-live" },
  { title: "Snapchat", filter: "category/snapchat" }
];
var genres = [
  { title: "Desi", filter: "category/desi-videos" },
  { title: "OnlyFans", filter: "category/onlyfans-videos" },
  { title: "Viral", filter: "category/viral-videos" },
  { title: "Live Shows", filter: "category/indian-live-shows" },
  { title: "Influencer", filter: "category/instagram-influencer" },
  { title: "Tango", filter: "category/tango-live" },
  { title: "Exclusive", filter: "category/actress-exclusive" },
  { title: "Chamet", filter: "category/chamet-live" },
  { title: "Snapchat", filter: "category/snapchat" }
];
