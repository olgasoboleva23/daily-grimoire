// Shop page balance and reward affordability, using indexed purchases.
import { balance, indexedPurchases, readRewards } from "#/entities/shop/index.js";
import { earned, taskStore } from "#/entities/task/index.js";

export async function loadShop({ dv }) {
  const gold = balance(earned(taskStore.tasks), indexedPurchases(dv)), items = readRewards(dv);

  return { balance: gold, items: items.map(i => ({ ...i, affordable: gold >= i.cost })) };
}
