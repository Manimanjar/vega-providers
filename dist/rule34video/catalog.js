// @vega-provider rule34video
// @vega-version 2.3.6
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

// providers/rule34video/catalog.ts
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
      filter: "homepage",
      mode: "random_feed",
      rule34Tags: [],
      title: "Homepage",
      xvideosQueries: []
    },
    {
      filter: "family",
      mode: "keep_existing",
      rule34Tags: [
        "family",
        "stepfamily",
        "step_family"
      ],
      title: "Family",
      xvideosQueries: [
        "family",
        "stepfamily",
        "step+family"
      ]
    },
    {
      filter: "incest",
      mode: "multi_query",
      rule34Tags: [
        "incest",
        "family",
        "taboo"
      ],
      title: "Incest",
      xvideosQueries: [
        "taboo",
        "stepfamily",
        "taboo+family"
      ]
    },
    {
      filter: "rel_sister",
      mode: "multi_query",
      rule34Tags: [
        "sister",
        "stepsister",
        "cousin",
        "sis",
        "stepsis",
        "older_sister",
        "younger_sister",
        "twin_sister",
        "cousin_sister",
        "cousin_sis",
        "step_sister",
        "sisters",
        "stepsisters",
        "cousins",
        "sister-in-law",
        "step_sister_in_law"
      ],
      title: "Sister",
      xvideosQueries: [
        "sister",
        "stepsister",
        "cousin",
        "stepsis",
        "sis",
        "big+sister",
        "little+sister",
        "twin+sister",
        "cousin+sis",
        "cousin+sister",
        "cousin+stepsis",
        "cousin+step+sister",
        "step+sister",
        "sisters",
        "stepsisters",
        "cousins",
        "sister+in+law",
        "step+sister+in+law"
      ]
    },
    {
      filter: "rel_brother",
      mode: "multi_query",
      rule34Tags: [
        "brother",
        "stepbrother",
        "cousin_brother",
        "bro",
        "stepbro",
        "older_brother",
        "younger_brother",
        "cousin_bro",
        "step_brother",
        "brother-in-law",
        "brothers",
        "stepbrothers"
      ],
      title: "Brother",
      xvideosQueries: [
        "brother",
        "stepbrother",
        "cousin+brother",
        "stepbro",
        "bro",
        "big+brother",
        "younger+brother",
        "cousin+bro",
        "cousin+stepbrother",
        "step+brother",
        "brother+in+law",
        "brothers",
        "stepbrothers"
      ]
    },
    {
      filter: "rel_mom",
      mode: "multi_query",
      rule34Tags: [
        "mother",
        "mom",
        "stepmother",
        "stepmom",
        "mommy",
        "mother_and_son",
        "cousin_mom",
        "cousin_mother",
        "step_mother",
        "step_mom",
        "mother-in-law",
        "moms",
        "mothers",
        "stepmoms",
        "stepmothers"
      ],
      title: "Mom",
      xvideosQueries: [
        "mom",
        "mother",
        "stepmom",
        "stepmother",
        "mommy",
        "mama",
        "cousin+mom",
        "cousin+mother",
        "step+mother",
        "step+mom",
        "mother+in+law",
        "moms",
        "mothers",
        "stepmoms",
        "stepmothers",
        "maa"
      ]
    },
    {
      filter: "rel_daughter",
      mode: "multi_query",
      rule34Tags: [
        "daughter",
        "stepdaughter",
        "father_and_daughter",
        "mother_and_daughter",
        "cousin_daughter",
        "step_daughter",
        "daughter-in-law",
        "in_laws",
        "in_law",
        "daughters",
        "stepdaughters",
        "granddaughter",
        "granddaughters"
      ],
      title: "Daughter",
      xvideosQueries: [
        "daughter",
        "stepdaughter",
        "daddy+daughter",
        "cousin+daughter",
        "step+daughter",
        "daughter+in+law",
        "in+laws",
        "in+law",
        "daughters",
        "stepdaughters",
        "granddaughter",
        "granddaughters"
      ]
    },
    {
      filter: "rel_father",
      mode: "multi_query",
      rule34Tags: [
        "father",
        "dad",
        "stepfather",
        "stepdad",
        "daddy",
        "cousin_dad",
        "cousin_father",
        "step_father",
        "father-in-law",
        "fathers",
        "stepfathers",
        "papa"
      ],
      title: "Father",
      xvideosQueries: [
        "father",
        "dad",
        "stepdad",
        "stepfather",
        "daddy",
        "cousin+dad",
        "cousin+father",
        "step+father",
        "father+in+law",
        "fathers",
        "stepfathers",
        "papa",
        "paa"
      ]
    },
    {
      filter: "rel_aunt",
      mode: "multi_query",
      rule34Tags: [
        "aunt",
        "auntie",
        "aunty",
        "stepaunt",
        "aunt_and_nephew",
        "cousin_aunt",
        "cousin_auntie",
        "step_aunt",
        "aunts"
      ],
      title: "Aunt",
      xvideosQueries: [
        "aunt",
        "auntie",
        "aunty",
        "stepaunt",
        "cousin+aunt",
        "cousin+auntie",
        "step+aunt",
        "aunts",
        "stepaunts"
      ]
    },
    {
      filter: "rel_grandma",
      mode: "multi_query",
      rule34Tags: [
        "grandma",
        "grandmother",
        "granny",
        "grand_mother",
        "grannies",
        "grandmothers",
        "grandmas",
        "step_grandma"
      ],
      title: "Grandma",
      xvideosQueries: [
        "grandma",
        "grandmother",
        "granny",
        "grand+mother",
        "grannies",
        "grandmama",
        "grandmothers",
        "grandmas",
        "step+grandma"
      ]
    },
    {
      filter: "rel_grandpa",
      mode: "multi_query",
      rule34Tags: [
        "grandpa",
        "grandfather",
        "grand_father",
        "grandpas",
        "grandfathers",
        "step_grandpa"
      ],
      title: "Grandpa",
      xvideosQueries: [
        "grandpa",
        "grandfather",
        "grand+father",
        "grandad",
        "grandpapa",
        "grandpas",
        "grandfathers",
        "step+grandpa"
      ]
    },
    {
      filter: "rel_son",
      mode: "multi_query",
      rule34Tags: [
        "son",
        "stepson",
        "step_son",
        "sons",
        "stepsons",
        "grandson",
        "grandsons"
      ],
      title: "Son",
      xvideosQueries: [
        "son",
        "stepson",
        "step+son",
        "sons",
        "stepsons",
        "grandson",
        "grandsons"
      ]
    },
    {
      filter: "rel_other",
      mode: "multi_query",
      rule34Tags: [
        "uncle",
        "niece",
        "nephew",
        "uncles",
        "nieces",
        "nephews",
        "step_uncle",
        "step_nephew",
        "step_niece"
      ],
      title: "Other",
      xvideosQueries: [
        "uncle",
        "niece",
        "nephew",
        "uncles",
        "nieces",
        "nephews",
        "step+uncle",
        "step+nephew",
        "step+niece",
        "grandparent"
      ]
    }
  ]
};

// providers/rule34video/catalog.ts
var catalog = categories_config_default.categories.map((category) => ({
  title: category.title,
  filter: category.filter
}));
var genres = [];
