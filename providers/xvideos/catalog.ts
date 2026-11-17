import config from "../categories.config.json";

export const catalog = config.categories.map((category) => ({
  title: category.title,
  filter: category.filter,
}));

export const genres = [];
