// Market categories, labels and groups of displayed rows.
import config from "#/shared/config/index.js";

// the categories, and "✦ Other" for an item without one
export const marketCats = [...config.marketCategories, { label: "✦ Other", type: "other" }];

// a type as a category: an unknown one is Other
export const catOf = type => marketCats.some(c => c.type === type) ? type : "other";

export const catLabel = type => marketCats.find(c => c.type === type)?.label ?? type;

// the categories with their rows, in order, the empty ones left out
export const groupByCategory = (list, catOfOne, row) => marketCats
  .map(cat => ({ label: cat.label, rows: list.filter(x => catOfOne(x) === cat.type).map(row) }))
  .filter(g => g.rows.length);
