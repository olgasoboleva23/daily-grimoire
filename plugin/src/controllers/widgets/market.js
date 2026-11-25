// The market catalog and shopping list. Supplies derives its purchase history from the list.
// Reads back the latest records; writes cover products, marks and shopping rows.
import { todayYmd } from "#/shared/lib/dates.js";
import {
  MarketItem, catOf, historyOf, marketCats, marketChoices, openKeys,
  supplyStats,
} from "#/models/market.js";
import { Notice } from "obsidian";
import { collection, appendLine, editLine, readJson, serial } from "#/shared/vault/index.js";
import { nextId } from "#/shared/lib/ids.js";
import { parseNote } from "#/shared/lib/noteLines.js";
import { app } from "#/shared/host/index.js";
import { MARKET_NOTE, MARKET_RECORDS } from "#/shared/config/index.js";

const catalog = collection(MARKET_RECORDS);

export const readMarketItem = async id => (await readJson(catalog.path, {}))[id] ?? null;

export async function addProduct({ name, marks = [] }) {
  const title = name?.trim();

  if (!title) return null;
  return adding(async () => {
    const { items } = await marketState();
    let id;

    await catalog.edit(records => {
      id = nextId("m", [...Object.keys(records), ...items.map(i => i.id)]);
      records[id] = { name: title, type: "food", marks };
      return records;
    });
    return id;
  });
}

export async function editMarketItem(id, values, before) {
  const { name, type, marks } = values;

  if (!name?.trim()) return false;
  const saved = await catalog.update(id, current => {
    if (JSON.stringify(current) !== JSON.stringify(before)) return null;
    const next = { ...current, name: name.trim(), type };

    if (type === "food" && marks !== undefined) next.marks = marks;
    else delete next.marks;
    return next;
  });

  if (!saved) new Notice("Item changed. Open it again to edit.");
  return saved;
}

const parseMarket = text => parseNote(MARKET_NOTE, text.replace(/\r\n/g, "\n"));

// Read the log and catalog together, without waiting for Dataview's index. Missing records show
// their ID instead of another item.
async function marketState() {
  const file = app.vault.getFileByPath(MARKET_NOTE);
  const records = await readJson(MARKET_RECORDS, null);
  const text = file ? await app.vault.read(file) : "";
  const tasks = parseMarket(text).filter(t => t.status !== null)
    .map(t => ({ ...t, rec: records?.[MarketItem.of(t).id] ?? null }));
  const items = tasks.map(MarketItem.of);

  return {
    missing: !file, records, tasks, items, history: historyOf(items), open: openKeys(items),
  };
}

// the categories with their rows, in order, the empty ones left out
const byCategory = (list, catOfOne, row) => marketCats
  .map(cat => ({ label: cat.label, rows: list.filter(x => catOfOne(x) === cat.type).map(row) }))
  .filter(g => g.rows.length);

export async function loadCelestialMarket() {
  const mkt = await marketState();

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
    groups: byCategory(items, i => i.category, row),
    soon: supplyStats(mkt.history, todayYmd()).filter(s => s.due && !mkt.open.has(s.id ?? s.name))
      .map(s => s.name).join(", "),
  };
}

export async function loadSupplies() {
  const { history, open } = await marketState();
  const stats = supplyStats(history, todayYmd());

  // a row: how long since the last time against the usual gap, or that it's on the list already
  const row = s => {
    const listed = open.has(s.id ?? s.name);
    const info = listed ? "on the shopping list ✦"
      : s.avg ? `${s.since} of ~${s.avg} days${s.due ? " ⏳" : ""}`
      : `bought ${s.buys} times`;

    return { id: s.id, name: s.name, type: s.type, due: s.due, listed, info };
  };

  return { empty: !stats.length, groups: byCategory(stats, s => catOf(s.type), row) };
}

// what the market's ＋ searches: everything bought before or in the catalog, the most bought first
export async function readMarketChoices() {
  const { history, open, records } = await marketState();

  return marketChoices(history, open, records);
}

// Serialize additions so two clicks cannot allocate the same ID or append two open copies.
const adding = serial();

export const addToMarket = (name, type, id = null) => adding(() => addItem(name, type, id));

// the first item of a new vault starts the catalog (its folder too)
async function addItem(name, type, id) {
  if (id) {
    const records = await readJson(MARKET_RECORDS, {});

    if (!records[id]) throw new Error(`Market record ${id} is missing`);
  } else {
    const { items } = await marketState();

    await catalog.edit(records => {
      id = Object.keys(records)
        .find(k => records[k].name.trim().toLowerCase() === name.trim().toLowerCase());
      if (id) return null;
      id = nextId("m", [...Object.keys(records), ...items.map(i => i.id)]);
      records[id] = { name, type };
      return records;
    });
  }

  return (await writeShoppingList([{ item: id }])).added > 0;
}

export const productsToList = requests => adding(async () => {
  if (!requests.length) return { added: 0, joined: 0 };
  const records = await readJson(MARKET_RECORDS, {});

  return writeShoppingList(requests.filter(({ item }) => records[item]?.type === "food"));
});

// The caller holds the addition queue. All changes to existing rows and new rows share one write.
async function writeShoppingList(selected) {
  const counts = { added: 0, joined: 0 };

  if (!selected.length) return counts;
  const update = text => {
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

    counts.added = added.size;
    counts.joined = joined.size;
    const current = lines.join("\n");

    if (!added.size) return current;
    const newline = text.includes("\r\n") ? "\r\n" : "\n";
    const separator = current && !current.endsWith("\n") ? newline : "";

    return current + separator + [...added.values()].join(newline) + newline;
  };

  const file = app.vault.getFileByPath(MARKET_NOTE);

  if (file) await app.vault.process(file, update);
  else await appendLine(MARKET_NOTE, update("").trimEnd());
  return counts;
}

// Change the displayed row only while that line is still the same open item.
function editOpenItem({ line, id, name }, change) {
  const same = l => {
    const item = new MarketItem(l);

    return item.isOpen && (id ? item.id === id : item.name === name);
  };

  return editLine(MARKET_NOTE, line, same, change);
}

export const buyMarketItem = row =>
  editOpenItem(row, l => new MarketItem(l).bought(todayYmd()));

export function removeMarketItem(row) {
  // The last line has no newline of its own. Keep the previous line's terminator.
  return editOpenItem(row, (_, lines) => row.line === lines.length - 1 ? "" : null);
}

// runsLow(name, type, id = null): back on the Celestial Market's list
export async function runsLow(name, type, id = null) {
  await addToMarket(name, type, id);
  new Notice(`✦ ${name} → Celestial Market`);
}
