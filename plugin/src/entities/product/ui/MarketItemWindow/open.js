// Open a new or existing product, loading its food marks through the caller when needed.
import { Notice } from "obsidian";
import { openWindow } from "#/shared/ui/Window/index.ts";
import { readMarketItem } from "../../model/repository/items.js";
import MarketItemWindow from "./index.vue";

// the new product's id, null closed
export const openNewProduct = async (name, readMarks) =>
  openWindow(MarketItemWindow, { name, marks: await readMarks() });

// true once saved, null closed; a gone item: the notice, no window
export async function openEditItem(id, readMarks) {
  const before = await readMarketItem(id);

  if (!before) return void new Notice("Item no longer exists");
  const marks = before.type === "food" ? await readMarks() : [];

  return openWindow(MarketItemWindow, { id, before, marks });
}
