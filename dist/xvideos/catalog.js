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

// providers/xvideos/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog,
  genres: () => genres
});
module.exports = __toCommonJS(catalog_exports);

// providers/categories.config.json
var categories_config_default = {
  categories: [
    {
      title: "Homepage",
      filter: "homepage",
      mode: "random_feed",
      xvideosQueries: [],
      rule34Tags: []
    },
    {
      title: "Family",
      filter: "family",
      mode: "keep_existing",
      xvideosQueries: [],
      rule34Tags: []
    },
    {
      title: "Incest",
      filter: "incest",
      mode: "multi_query",
      xvideosQueries: ["taboo", "stepfamily", "taboo+family"],
      rule34Tags: ["incest", "family"]
    },
    {
      title: "Sister",
      filter: "rel_sister",
      mode: "multi_query",
      xvideosQueries: ["sister", "stepsister", "cousin", "stepsis", "sis", "big+sister", "little+sister", "twin+sister", "cousin+sis", "cousin+sister", "cousin+stepsis", "cousin+step+sister"],
      rule34Tags: ["sister", "stepsister", "cousin", "sis", "stepsis", "older_sister", "younger_sister", "twin_sister", "cousin_sister", "cousin_sis"]
    },
    {
      title: "Brother",
      filter: "rel_brother",
      mode: "multi_query",
      xvideosQueries: ["brother", "stepbrother", "cousin+brother", "stepbro", "bro", "big+brother", "younger+brother", "cousin+bro", "cousin+stepbrother"],
      rule34Tags: ["brother", "stepbrother", "cousin_brother", "bro", "stepbro", "older_brother", "younger_brother", "cousin_bro"]
    },
    {
      title: "Mom",
      filter: "rel_mom",
      mode: "multi_query",
      xvideosQueries: ["mom", "mother", "stepmom", "stepmother", "mommy", "mama", "cousin+mom", "cousin+mother"],
      rule34Tags: ["mother", "mom", "stepmother", "stepmom", "mommy", "mother_and_son", "cousin_mom", "cousin_mother"]
    },
    {
      title: "Daughter",
      filter: "rel_daughter",
      mode: "multi_query",
      xvideosQueries: ["daughter", "stepdaughter", "daddy+daughter", "cousin+daughter"],
      rule34Tags: ["daughter", "stepdaughter", "father_and_daughter", "mother_and_daughter", "cousin_daughter"]
    },
    {
      title: "Father",
      filter: "rel_father",
      mode: "multi_query",
      xvideosQueries: ["father", "dad", "stepdad", "stepfather", "daddy", "cousin+dad", "cousin+father"],
      rule34Tags: ["father", "dad", "stepfather", "stepdad", "daddy", "cousin_dad", "cousin_father"]
    },
    {
      title: "Aunt",
      filter: "rel_aunt",
      mode: "multi_query",
      xvideosQueries: ["aunt", "auntie", "aunty", "stepaunt", "cousin+aunt", "cousin+auntie"],
      rule34Tags: ["aunt", "auntie", "aunty", "stepaunt", "aunt_and_nephew", "cousin_aunt", "cousin_auntie"]
    },
    {
      title: "Other",
      filter: "rel_other",
      mode: "multi_query",
      xvideosQueries: ["uncle", "niece", "nephew", "grandma", "granny", "mother+in+law", "sister+in+law"],
      rule34Tags: ["uncle", "niece", "nephew", "grandma", "granny", "mother-in-law", "sister-in-law"]
    }
  ]
};

// providers/xvideos/catalog.ts
var catalog = categories_config_default.categories.map((category) => ({
  title: category.title,
  filter: category.filter
}));
var genres = [];
