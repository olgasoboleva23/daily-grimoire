// Pick an available ingredient or create a food product from the typed name.
import { prepareFuzzySearch } from "obsidian";
import { app } from "#/shared/host/index.js";
import { Search } from "#/shared/ui/Search/index.ts";
import { foodProducts } from "../model/market.js";
import { openNewProduct } from "./MarketItemWindow/open.js";

// a food product's id: picked, or a new one typed (its window first); null closed
export async function pickOrAddProduct(readMarks) {
  const items = await foodProducts();
  const pick = await Search.pick(app, "Choose a product", query => {
    const q = query.trim();

    if (!q) return items;
    const match = prepareFuzzySearch(q);

    return [...items.filter(i => match(i.name)), { name: q, isNew: true }];
  }, (i, el) => el.createSpan({ text: i.isNew ? `+ new product: ${i.name}` : i.name }));

  return pick?.isNew ? openNewProduct(pick.name, readMarks) : pick?.id ?? null;
}
