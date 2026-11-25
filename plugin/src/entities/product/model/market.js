// Read the current shopping note and catalog, including legacy rows without catalog records.
import { MARKET_NOTE } from "#/shared/config/index.js";
import { parseNote } from "#/shared/lib/noteLines.js";
import { MarketItem } from "./marketItem.js";
import { historyOf, marketChoices, openKeys } from "./history.js";
import { activeItems, readItems } from "./repository/items.js";
import { readMarketNote } from "./repository/celestial-market.js";

export const parseMarket = text => parseNote(MARKET_NOTE, text.replace(/\r\n/g, "\n"));

export async function readMarket() {
  const [text, records] = await Promise.all([
    readMarketNote(), readItems({ includeDeleted: true }),
  ]);
  const tasks = parseMarket(text ?? "").filter(t => t.status !== null)
    .map(t => ({ ...t, rec: records[MarketItem.of(t).id] ?? null }))
    .filter(t => !t.rec?.deleted);
  const items = tasks.map(MarketItem.of);

  return {
    missing: text === null, records: activeItems(records), tasks, items,
    history: historyOf(items), open: openKeys(items),
  };
}

export async function foodProducts(options) {
  const records = await readItems(options);

  return Object.entries(records).filter(([, p]) => p.type === "food")
    .map(([id, p]) => ({
      id, name: p.name, marks: p.marks ?? [], ...(p.deleted && { deleted: true }),
    }));
}

// what the market's ＋ searches: everything bought before or in the catalog, the most bought first
export async function readMarketChoices() {
  const { history, open, records } = await readMarket();

  return marketChoices(history, open, records);
}
