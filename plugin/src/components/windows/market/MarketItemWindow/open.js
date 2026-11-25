// Opening a market item's window (MarketItemWindow) and the flows around it: New product with
// the food marks; Edit item with the record as it is on disk now (so one changed meanwhile is not
// overwritten), the marks only for food; ＋ on the market (the card's ＋, the New market item
// command): a search of everything bought before or in the catalog, a new one asked its Category,
// then on the list; the product search (a dish's line): a food product, or + new → New product.
import { Notice, prepareFuzzySearch } from "obsidian";
import { app } from "#/shared/host/index.js";
import { dm } from "#/shared/lib/dates.js";
import { findChoices } from "#/shared/lib/find.js";
import { catLabel, marketCats } from "#/models/market.js";
import { openWindow, askValue } from "#/shared/ui/Window/index.ts";
import { Search } from "#/shared/ui/Search/index.ts";
import {
  addToMarket, readMarketChoices, readMarketItem, readMarks,
} from "#/controllers/widgets/market.js";
import { readProducts } from "#/controllers/dishes.js";
import MarketItemWindow from "./index.vue";

// the new product's id, null closed
export const openNewProduct = async name =>
  openWindow(MarketItemWindow, { name, marks: await readMarks() });

// true once saved, null closed; a gone item: the notice, no window
export async function openEditItem(id) {
  const before = await readMarketItem(id);

  if (!before) return void new Notice("Item no longer exists");
  const marks = before.type === "food" ? await readMarks() : [];

  return openWindow(MarketItemWindow, { id, before, marks });
}

export async function addMarketItem() {
  const choices = await readMarketChoices();
  const pick = await Search.pickGrouped(app, "Find or add an item…", q => findChoices(choices, q), {
    groupOf: c => c.type,
    label: catLabel,
    note: c => c.onList ? "on the list" : c.buys ? `×${c.buys} · ${dm(c.last)}` : "not bought yet",
  });

  if (!pick) return;
  if (pick.onList) return void new Notice(`✦ ${pick.name} is on the list already`);
  const type = pick.isNew ? await askValue({
    title: `✦ ${pick.name}`, name: "Category", required: true, submit: "Add",
    choices: marketCats.map(c => ({ label: c.label, value: c.type })),
  }) : pick.type;

  if (type) await addToMarket(pick.name, type, pick.id);
}

// a food product's id: picked, or a new one typed (its window first); null closed
export async function pickOrAddProduct() {
  const items = await readProducts();
  const pick = await Search.pick(app, "Choose a product", query => {
    const q = query.trim();

    if (!q) return items;
    const match = prepareFuzzySearch(q);

    return [...items.filter(i => match(i.name)), { name: q, isNew: true }];
  }, (i, el) => el.createSpan({ text: i.isNew ? `+ new product: ${i.name}` : i.name }));

  return pick?.isNew ? openNewProduct(pick.name) : pick?.id ?? null;
}
