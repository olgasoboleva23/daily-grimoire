// Reward names and prices in Shop.md.
import { SHOP } from "#/shared/config/index.js";
import { amount, AMOUNT } from "#/shared/lib/format.js";

export function readRewards(dv) {
  const items = [];

  for (const list of dv.pages(`"${SHOP}"`).file.lists) {
    const name = list.text.match(/name::\s*(.+)/);
    const cost = list.text.match(new RegExp(`cost::\\s*(${AMOUNT.source})`));

    if (name && cost) items.push({ name: name[1].trim(), cost: amount(cost[1]) });
  }

  return items;
}
