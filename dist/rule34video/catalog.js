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
      title: "Sister",
      filter: "rel_sister",
      mode: "multi_query",
      xvideosQueries: ["sister", "stepsister", "stepsis", "sis", "big+sister", "little+sister", "twin+sister"],
      rule34Tags: ["sister", "stepsister", "sis", "stepsis", "older_sister", "younger_sister", "twin_sister"]
    },
    {
      title: "Brother",
      filter: "rel_brother",
      mode: "multi_query",
      xvideosQueries: ["brother", "stepbrother", "stepbro", "bro", "big+brother", "younger+brother"],
      rule34Tags: ["brother", "stepbrother", "bro", "stepbro", "older_brother", "younger_brother"]
    },
    {
      title: "Mom",
      filter: "rel_mom",
      mode: "multi_query",
      xvideosQueries: ["mom", "mother", "stepmom", "stepmother", "mommy", "mama"],
      rule34Tags: ["mother", "mom", "stepmother", "stepmom", "mommy", "mother_and_son"]
    },
    {
      title: "Daughter",
      filter: "rel_daughter",
      mode: "multi_query",
      xvideosQueries: ["daughter", "stepdaughter", "daddy+daughter"],
      rule34Tags: ["daughter", "stepdaughter", "father_and_daughter", "mother_and_daughter"]
    },
    {
      title: "Father",
      filter: "rel_father",
      mode: "multi_query",
      xvideosQueries: ["father", "dad", "stepdad", "stepfather", "daddy"],
      rule34Tags: ["father", "dad", "stepfather", "stepdad", "daddy"]
    },
    {
      title: "Aunt",
      filter: "rel_aunt",
      mode: "multi_query",
      xvideosQueries: ["aunt", "auntie", "aunty", "stepaunt"],
      rule34Tags: ["aunt", "auntie", "aunty", "stepaunt", "aunt_and_nephew"]
    },
    {
      title: "Other",
      filter: "rel_other",
      mode: "multi_query",
      xvideosQueries: ["cousin", "uncle", "niece", "nephew", "grandma", "granny", "mother+in+law", "sister+in+law"],
      rule34Tags: ["cousin", "uncle", "niece", "nephew", "grandma", "granny", "mother-in-law", "sister-in-law"]
    }
  ]
};

// providers/rule34video/catalog.ts
var catalog = categories_config_default.categories.map((category) => ({
  title: category.title,
  filter: category.filter
}));
var genres = [];
export {
  catalog,
  genres
};
