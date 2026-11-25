// Put a low supply back on the shopping list and confirm the addition.
import { Notice } from "obsidian";
import { addToMarket } from "./addItem.js";

export async function runsLow(name, type, id = null) {
  await addToMarket(name, type, id);
  new Notice(`✦ ${name} → Celestial Market`);
}
