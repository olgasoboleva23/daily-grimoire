// The market widget, supplies page and the flows that put products on the shopping list.
import { Notice } from "obsidian";
import { MARKET_NOTE } from "#/shared/config/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import {
  addCatalogItem, adding, catOf, groupByCategory, readItems, readMarket, readMarketItem,
  supplyStats, writeShoppingList,
} from "#/entities/product/index.js";

export async function loadCelestialMarket() {
  const mkt = await readMarket();

  if (mkt.missing) return { missing: true, path: MARKET_NOTE };
  const items = mkt.items.filter(i => i.isOpen);
  // a row: its line (to find it again) and its name (shown, and to check it's the same item)
  const row = i => ({
    line: i.src.line, id: i.id, name: i.name, type: i.type, needs: i.needs,
  });
  const n = items.length;

  return {
    empty: !n,
    left: `${n} item${n === 1 ? "" : "s"} left`,
    groups: groupByCategory(items, i => i.category, row),
    soon: supplyStats(mkt.history, todayYmd()).filter(s => s.due && !mkt.open.has(s.id ?? s.name))
      .map(s => s.name).join(", "),
  };
}

export async function loadSupplies() {
  const { history, open } = await readMarket();
  const stats = supplyStats(history, todayYmd());

  // a row: how long since the last time against the usual gap, or that it's on the list already
  const row = s => {
    const listed = open.has(s.id ?? s.name);
    const info = listed ? "on the shopping list ✦"
      : s.avg ? `${s.since} of ~${s.avg} days${s.due ? " ⏳" : ""}`
      : `bought ${s.buys} times`;

    return { id: s.id, name: s.name, type: s.type, due: s.due, listed, info };
  };

  return { empty: !stats.length, groups: groupByCategory(stats, s => catOf(s.type), row) };
}

export const addToMarket = (name, type, id = null) => adding(async () => {
  if (id) {
    if (!await readMarketItem(id)) throw new Error(`Market record ${id} is missing`);
  } else {
    const { items } = await readMarket();
    id = await addCatalogItem({ name, type }, items, true);
  }

  return (await writeShoppingList([{ item: id }])).added > 0;
});

export const productsToList = requests => adding(async () => {
  if (!requests.length) return { added: 0, joined: 0 };
  const records = await readItems();

  return writeShoppingList(requests.filter(({ item }) => records[item]?.type === "food"));
});

// runsLow(name, type, id = null): back on the Celestial Market's list
export async function runsLow(name, type, id = null) {
  await addToMarket(name, type, id);
  new Notice(`✦ ${name} → Celestial Market`);
}
