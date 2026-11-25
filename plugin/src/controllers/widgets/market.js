// The Celestial Market's controller (00 System/Data/Celestial Market.md) and the Supplies'. The
// list by category with a round ✓ per item, what runs low soon; Supplies: what is bought again and
// again, how long since the last time against the usual gap. Writes: an item on the list (＋: a
// search of everything bought before, the most bought first, or a new one typed), an item bought
// (✓), an item running low back on the list. The markup: widgets/market/.
import { dm, todayYmd } from "#/helpers/dates.js";
import {
  MarketItem, catLabel, catOf, historyOf, marketCats, marketChoices, openKeys,
  supplyStats,
} from "#/models/market.js";
import { marksOf } from "#/models/food.js";
import { Notice } from "obsidian";
import { collection } from "#/helpers/collection.js";
import { nextId } from "#/helpers/ids.js";
import { Search } from "#/components/uikit/Search/index.ts";
import { Form } from "#/components/uikit/Form/index.ts";
import { appendLine, editLine, readJson, serial } from "#/helpers/files.js";
import { findChoices } from "#/helpers/find.js";
import { parseNote } from "#/models/taskFile.js";
import { app } from "#/helpers/app.js";
import { FOOD_DATA, MARKET_NOTE, MARKET_RECORDS } from "#/helpers/paths.js";

const catalog = collection(MARKET_RECORDS);
const categoryRow = {
  name: "Category", key: "type",
  options: marketCats.map(c => ({ label: c.label, value: c.type })),
};

const markRows = marks => marks.map(m => ({ name: `${m.icon} ${m.name}`, key: m.tag, check: "" }));
const selected = (marks, values) => marks.filter(m => values[m.tag]).map(m => m.tag);
const readMarks = async () => marksOf(await readJson(FOOD_DATA, {}));

export async function addProduct(name, ask = Form.ask.bind(Form)) {
  const marks = await readMarks();
  const values = await ask(app, "New product", [
    { name: "Name", key: "name", text: "Product name" }, ...markRows(marks),
  ], { values: { name }, required: ["name"], submit: "Add" });

  if (!values?.name?.trim()) return null;
  return adding(async () => {
    const { items } = await marketState();
    let id;
    await catalog.edit(records => {
      id = nextId("m", [...Object.keys(records), ...items.map(i => i.id)]);
      records[id] = { name: values.name.trim(), type: "food", marks: selected(marks, values) };
      return records;
    });
    return id;
  });
}

export async function editMarketItem(id, ask = Form.ask.bind(Form)) {
  const item = (await readJson(catalog.path, {}))[id];

  if (!item) return void new Notice("Item no longer exists");
  const marks = item.type === "food" ? await readMarks() : [];
  const boxes = Object.fromEntries((item.marks ?? []).map(tag => [tag, true]));
  const values = await ask(app, "Edit item", [
    { name: "Name", key: "name", text: "Item name" }, categoryRow, ...markRows(marks),
  ], { values: { ...item, ...boxes }, required: ["name", "type"], submit: "Save" });

  if (!values) return;
  const saved = await catalog.update(id, current => {
    if (current.name !== item.name || current.type !== item.type
      || JSON.stringify(current.marks) !== JSON.stringify(item.marks)) return null;
    const next = { ...current, name: values.name.trim(), type: values.type };

    if (values.type === "food" && item.type === "food") next.marks = selected(marks, values);
    else delete next.marks;
    return next;
  });

  if (!saved) new Notice("Item changed. Open it again to edit.");
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

export async function addMarketItem() {
  const { history, open, records } = await marketState();
  const choices = marketChoices(history, open, records);
  const pick = await Search.pickGrouped(app, "Find or add an item…", q => findChoices(choices, q), {
    groupOf: c => c.type,
    label: catLabel,
    note: c => c.onList ? "on the list" : c.buys ? `×${c.buys} · ${dm(c.last)}` : "not bought yet",
  });

  if (!pick) return;
  if (pick.onList) return void new Notice(`✦ ${pick.name} is on the list already`);
  const type = pick.isNew ? (await Form.ask(app, `✦ ${pick.name}`, [
    categoryRow,
  ], { required: ["type"], submit: "Add" }))?.type : pick.type;

  if (type) await addToMarket(pick.name, type, pick.id);
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
