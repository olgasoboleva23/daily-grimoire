// Merge requests into open shopping rows without changing surrounding lines or line endings.
import { MarketItem } from "./marketItem.js";
import { parseMarket } from "./market.js";
import { processMarketNote } from "./repository/celestial-market.js";

function withListed(text, selected) {
  const lines = text.split("\n");
  const open = new Map(), added = new Map(), joined = new Set();

  for (const row of parseMarket(text)) {
    const entry = MarketItem.of(row);

    if (entry.isOpen && entry.id && !open.has(entry.id)) open.set(entry.id, row.line);
  }

  for (const { item, dish, amount } of selected) {
    const index = open.get(item);

    if (index === undefined) {
      const line = added.get(item) ?? `- [ ] ${item}`;

      added.set(item, dish ? new MarketItem(line).withNeed(dish, amount) : line);
    } else {
      const line = lines[index];
      const updated = dish ? new MarketItem(line).withNeed(dish, amount) : line;

      if (updated === line) continue;
      lines[index] = updated;
      joined.add(item);
    }
  }

  const counts = { added: added.size, joined: joined.size };
  const current = lines.join("\n");

  if (!added.size) return { text: current, counts };
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const separator = current && !current.endsWith("\n") ? newline : "";

  return { text: current + separator + [...added.values()].join(newline) + newline, counts };
}

// The caller holds the addition queue. Apply the whole set of requests in one file write.
export async function writeShoppingList(selected) {
  let counts = { added: 0, joined: 0 };

  if (!selected.length) return counts;
  await processMarketNote(text => {
    const result = withListed(text, selected);
    counts = result.counts;
    return result.text;
  });
  return counts;
}
