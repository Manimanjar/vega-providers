// @vega-provider filmyfly
// @vega-version 1.0.3
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

// providers/filmyfly/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog,
  genres: () => genres
});
module.exports = __toCommonJS(catalog_exports);
var catalog = [
  { title: "Trending", filter: "trending" },
  { title: "Latest Movies", filter: "latest" },
  { title: "Bollywood Hindi Movies", filter: "/movie-category/1/Bollywood-Hindi-Movies.html" },
  { title: "South Hindi Dubbed", filter: "/movie-category/21/South-Hindi-Dubbed-Movie.html" },
  { title: "Hollywood Hindi Movies", filter: "/movie-category/4/Hollywood-Hindi-Movies.html" },
  { title: "Web Series", filter: "/movie-category/42/Web-Series.html" },
  { title: "Marvel Hollywood Movies", filter: "/movie-category/78/Marvel-Hollywood-Movies.html" },
  { title: "Animation Movies", filter: "/movie-category/73/Animation-Movies.html" },
  { title: "Punjabi Movies", filter: "/movie-category/15/Punjabi-Movies.html" },
  { title: "HQ Dubbed Movies (UnCut)", filter: "/movie-category/58/HQ-Dubbed-Movies-UnCut.html" },
  { title: "HQ Hindi Dub [With ads]", filter: "/movie-category/63/HQ-Hindi-Dub-Movie-With-ads.html" },
  { title: "IMDb Top Movies", filter: "/movie-category/79/imdb-Top-Movies.html" },
  { title: "Japanese Anime", filter: "/movie-category/80/Japanese-Anime.html" }
];
var genres = [
  { title: "Action", filter: "genre:action" },
  { title: "Comedy", filter: "genre:comedy" },
  { title: "Drama", filter: "genre:drama" },
  { title: "Romance", filter: "genre:romance" },
  { title: "Thriller", filter: "genre:thriller" },
  { title: "Horror", filter: "genre:horror" },
  { title: "Crime", filter: "genre:crime" },
  { title: "Sci-Fi", filter: "genre:sci-fi" },
  { title: "Adventure", filter: "genre:adventure" },
  { title: "Fantasy", filter: "genre:fantasy" },
  { title: "Family", filter: "genre:family" }
];
