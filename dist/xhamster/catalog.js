// @vega-provider xhamster
// @vega-version 1.0.2
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

// providers/xhamster/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog,
  genres: () => genres
});
module.exports = __toCommonJS(catalog_exports);
var catalog = [
  { title: "Homepage", filter: "homepage" },
  // Account feed — only returns videos when the session cookie is valid.
  // Guest (no cookie / dead cookie) returns an empty list, so this is the
  // visible login test: if it has videos, the cookie is working.
  { title: "My Subscriptions", filter: "/my/subscriptions" },
  { title: "Premium Videos", filter: "/categories/premium" },
  { title: "Best Videos", filter: "/best" },
  { title: "Best Today", filter: "/best/daily" },
  { title: "Best This Week", filter: "/best/weekly" },
  { title: "Best This Month", filter: "/best/monthly" },
  { title: "Newest Videos", filter: "/newest" },
  { title: "Most Viewed", filter: "/most-viewed" },
  { title: "3D Videos", filter: "/categories/3d" },
  { title: "Amateur", filter: "/categories/amateur" },
  { title: "Anal", filter: "/categories/anal" },
  { title: "Asian", filter: "/categories/asian" },
  { title: "BBW", filter: "/categories/bbw" },
  { title: "Big Ass", filter: "/categories/big-ass" },
  { title: "Big Tits", filter: "/categories/big-tits" },
  { title: "Blonde", filter: "/categories/blonde" },
  { title: "Blowjob", filter: "/categories/blowjob" },
  { title: "Brunette", filter: "/categories/brunette" },
  { title: "BDSM", filter: "/categories/bdsm" },
  { title: "Cartoon", filter: "/categories/cartoon" },
  { title: "Cosplay", filter: "/categories/cosplay" },
  { title: "Couple", filter: "/categories/couple" },
  { title: "Creampie", filter: "/categories/creampie" },
  { title: "Cumshot", filter: "/categories/cumshot" },
  { title: "Deep Throat", filter: "/categories/deep-throat" },
  { title: "Ebony", filter: "/categories/black" },
  { title: "Facial", filter: "/categories/facial" },
  { title: "Gangbang", filter: "/categories/gangbang" },
  { title: "Group Sex", filter: "/categories/group-sex" },
  { title: "Hardcore", filter: "/categories/hardcore" },
  { title: "Hentai", filter: "/categories/hentai" },
  { title: "Homemade", filter: "/categories/homemade" },
  { title: "Interracial", filter: "/categories/interracial" },
  { title: "Japanese", filter: "/categories/jav" },
  { title: "Latina", filter: "/categories/latina" },
  { title: "Lesbian", filter: "/categories/lesbian" },
  { title: "MILF", filter: "/categories/milf" },
  { title: "Massage", filter: "/categories/massage" },
  { title: "Mature", filter: "/categories/mature" },
  { title: "Orgy", filter: "/categories/orgy" },
  { title: "POV", filter: "/categories/pov" },
  { title: "Public Sex", filter: "/categories/public-sex" },
  { title: "Rough Sex", filter: "/categories/rough-sex" },
  { title: "Solo", filter: "/categories/solo" },
  { title: "Teen (18+)", filter: "/categories/18-year-old" },
  { title: "Threesome", filter: "/categories/threesome" },
  { title: "Vintage", filter: "/categories/vintage" },
  { title: "Voyeur", filter: "/categories/voyeur" },
  { title: "Webcam", filter: "/categories/webcam" }
];
var genres = [
  { title: "3D", filter: "/categories/3d" },
  { title: "Amateur", filter: "/categories/amateur" },
  { title: "Anal", filter: "/categories/anal" },
  { title: "Asian", filter: "/categories/asian" },
  { title: "BBW", filter: "/categories/bbw" },
  { title: "Big Tits", filter: "/categories/big-tits" },
  { title: "Blowjob", filter: "/categories/blowjob" },
  { title: "BDSM", filter: "/categories/bdsm" },
  { title: "Creampie", filter: "/categories/creampie" },
  { title: "Ebony", filter: "/categories/black" },
  { title: "Gangbang", filter: "/categories/gangbang" },
  { title: "Hardcore", filter: "/categories/hardcore" },
  { title: "Hentai", filter: "/categories/hentai" },
  { title: "Homemade", filter: "/categories/homemade" },
  { title: "Japanese", filter: "/categories/jav" },
  { title: "Latina", filter: "/categories/latina" },
  { title: "Lesbian", filter: "/categories/lesbian" },
  { title: "MILF", filter: "/categories/milf" },
  { title: "POV", filter: "/categories/pov" },
  { title: "Teen (18+)", filter: "/categories/18-year-old" },
  { title: "Threesome", filter: "/categories/threesome" },
  { title: "Voyeur", filter: "/categories/voyeur" }
];
