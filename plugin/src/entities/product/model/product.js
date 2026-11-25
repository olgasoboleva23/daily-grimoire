// Create or edit a catalog product, buy an open item or remove its shopping-list row.
import { Notice } from "obsidian";
import { todayYmd } from "#/shared/lib/dates.js";
import { productRecord } from "../contract/product.js";
import { adding, addCatalogItem, catalog } from "./repository/items.js";
import { editMarketLine } from "./repository/celestial-market.js";
import { MarketItem } from "./marketItem.js";
import { readMarket } from "./market.js";

export async function addProduct({ name, marks = [] }) {
  if (!name?.trim()) return null;
  return adding(async () => {
    const { items } = await readMarket();

    return addCatalogItem(productRecord({ name, type: "food", marks }), items);
  });
}

export async function editProduct(id, values, before) {
  if (!values.name?.trim()) return false;
  const saved = await catalog.update(id, current => {
    if (current.deleted || JSON.stringify(current) !== JSON.stringify(before)) return null;
    return productRecord(values, current);
  });

  if (!saved) new Notice("Item changed. Open it again to edit.");
  return saved;
}

// Change the displayed row only while that line is still the same open item.
function editOpenItem({ line, id, name }, change) {
  const same = l => {
    const item = new MarketItem(l);

    return item.isOpen && (id ? item.id === id : item.name === name);
  };

  return editMarketLine(line, same, change);
}

export const buyItem = row =>
  editOpenItem(row, l => new MarketItem(l).bought(todayYmd()));

export function removeItem(row) {
  // The last line has no newline of its own. Keep the previous line's terminator.
  return editOpenItem(row, (_, lines) => row.line === lines.length - 1 ? "" : null);
}
