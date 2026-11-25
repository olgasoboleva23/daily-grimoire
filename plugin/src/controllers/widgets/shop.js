// The shop's controller: the gold (earned by done tasks, by difficulty; spent in
// 00 System/Data/Purchases.md: "- date | name | cost") and the rewards of Shop.md (name:: …
// cost:: …), an affordable one bought with a click, the rest greyed out. Writes: a purchase, only
// when the gold covers it (the Shop card and the Buy reward command), with its sound and notice.
// The markup: widgets/shop/ShopWidget.
import config, { ASSETS } from "#/shared/config/index.js";
import {
  appendPurchase, balance, indexedPurchases, readPurchases, readRewards,
} from "#/entities/shop/index.js";
import { Notice } from "obsidian";
import { todayYmd } from "#/shared/lib/dates.js";
import { T } from "#/models/calendarData.js";
import { taskStore } from "#/store/tasks.js";
import { AudioEngine } from "#/shared/lib/sounds.js";

function earned() {
  let gold = 0;

  for (const t of taskStore.tasks.map(T)) {
    if (t.isDone) gold += config.difficulties.find(d => d.key === t.difficulty)?.gold ?? 0;
  }

  return gold;
}

export async function loadShop({ dv }) {
  const gold = balance(earned(), indexedPurchases(dv)), items = readRewards(dv);

  return { balance: gold, items: items.map(i => ({ ...i, affordable: gold >= i.cost })) };
}

// a purchase, only when the gold covers it (the Shop card and the Buy reward command): false when
// it doesn't. One at a time, the spent gold read from the file itself: Dataview sees a purchase a
// moment later (the gold earned: the plugin's own store, at once)
let queue = Promise.resolve();

export function logPurchase(name, price) {
  const buy = queue.then(async () => {
    const lines = await readPurchases();

    if (balance(earned(), lines) < price) return false;
    await appendPurchase(name, price, todayYmd());
    return true;
  });
  queue = buy.catch(() => {});
  return buy;
}

// buy(name, cost): the star sound, the purchase if the gold covers it, a notice either way; true
// when bought
const star = new AudioEngine(`${ASSETS}/star.wav`);

export async function buy(name, cost) {
  void star.play();
  const bought = await logPurchase(name, cost);
  new Notice(bought ? `✨ Bought ${name} for ${cost} gold` : `✦ Not enough gold for ${name}`);
  return bought;
}
