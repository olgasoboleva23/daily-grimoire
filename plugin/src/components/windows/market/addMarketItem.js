// Add an existing or newly named item to the shopping list from the market or its command.
import { Notice } from "obsidian";
import { app } from "#/shared/host/index.js";
import { dm } from "#/shared/lib/dates.js";
import { findChoices } from "#/shared/lib/find.js";
import { askValue } from "#/shared/ui/Window/index.ts";
import { Search } from "#/shared/ui/Search/index.ts";
import { catLabel, marketCats, readMarketChoices } from "#/entities/product/index.js";
import { addToMarket } from "#/controllers/widgets/market.js";

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
