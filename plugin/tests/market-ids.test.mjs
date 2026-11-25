// Market catalog writes, shopping list rows and purchase history.
import { loadSupplies } from "#/pages/supplies/model/store.js";
import { loadCelestialMarket } from "#/widgets/market/model/store.js";
import { addToMarket } from "#/features/add-to-list/operation/addItem.js";
import {
  addProduct, buyItem, editProduct, readMarketChoices, readMarketItem, removeItem, supplyStats,
} from "#/entities/product/index.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { MARKET, MARKET_RECORDS } from "#/shared/config/index.js";
import { vault } from "./stubs/vault.mjs";

const note = `${MARKET}.md`;

test("Market ids retain purchases after renaming and separate same-named records", () => {
  const history = [
    { id: "m1", name: "New name", type: "food", date: "2026-10-01" },
    { id: "m1", name: "New name", type: "food", date: "2026-10-11" },
    { id: "m2", name: "New name", type: "food", date: "2026-10-12" },
  ];
  const stats = supplyStats(history, "2026-11-01");
  assert.equal(stats.length, 1);
  assert.equal(stats[0].id, "m1");
  assert.equal(stats[0].buys, 2);
  assert.equal(stats[0].name, "New name");
});

test("Market and Supplies use catalog names; simultaneous additions deduplicate", async () => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-11" }) };
  const log = "- [x] m1 ✅ 2026-10-01\n- [x] m1 ✅ 2026-10-11\n";
  const records = { m1: { name: "Renamed", type: "food" } };
  const { files } = vault({ [note]: log, [MARKET_RECORDS]: JSON.stringify(records) });
  let supplies = await loadSupplies();
  assert.equal(supplies.groups[0].rows[0].name, "Renamed");
  assert.equal(supplies.groups[0].rows[0].listed, false);
  await Promise.all([addToMarket("Old name", "food", "m1"), addToMarket("Old name", "food", "m1")]);
  assert.equal(files[note].match(/- \[ \] m1/g).length, 1);
  await Promise.all([addToMarket("Soap", "home"), addToMarket("Bread", "food")]);
  const catalog = JSON.parse(files[MARKET_RECORDS]);
  assert.deepEqual(Object.keys(catalog), ["m1", "m2", "m3"]);
  const market = await loadCelestialMarket();
  const item = market.groups.flatMap(g => g.rows).find(r => r.id === "m1");
  assert.equal(item.name, "Renamed");
  assert.equal(await buyItem(item), true);
  assert.equal(files[note].split("\n")[item.line], "- [x] m1 [completion:: 2026-11-11]");
  supplies = await loadSupplies();
  assert.equal(supplies.groups[0].rows[0].info, "0 of ~21 days");
});

test("Buying a moved row or adding to a corrupt catalog leaves the files intact", async () => {
  const { files } = vault({ [note]: "- [ ] m2\n", [MARKET_RECORDS]: "broken" });
  assert.equal(await buyItem({ line: 0, id: "m1", name: "Tea" }), false);
  await assert.rejects(() => addToMarket("Tea", "food"), SyntaxError);
  assert.equal(files[MARKET_RECORDS], "broken");
  assert.equal(files[note], "- [ ] m2\n");
});

test("A new vault's first market item starts the catalog", async () => {
  const { files } = vault({});
  await addToMarket("Tea", "food");
  assert.deepEqual(JSON.parse(files[MARKET_RECORDS]), { m1: { name: "Tea", type: "food" } });
  assert.equal(files[note], "- [ ] m1\n");
});

test("editing a catalog item changes both lists and preserves the purchase log", async () => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-11" }) };
  const log = "- [x] m1 ✅ 2026-10-01\n- [x] m1 ✅ 2026-10-11\n- [ ] m1\n";
  const records = { m1: { name: "Tea", type: "other" } };
  const { files } = vault({ [note]: log, [MARKET_RECORDS]: JSON.stringify(records) });
  const before = await readMarketItem("m1");
  assert.equal(await editProduct("m1", { name: " Green tea ", type: "food" }, before), true);
  assert.equal(files[note], log);
  assert.deepEqual(JSON.parse(files[MARKET_RECORDS]).m1, { name: "Green tea", type: "food" });
  for (const load of [loadCelestialMarket, loadSupplies]) {
    assert.equal((await load()).groups[0].rows[0].name, "Green tea");
  }
});

test("editing a market record rejects stale values and only stores marks for food", async () => {
  const { files } = vault({
    [MARKET_RECORDS]: JSON.stringify({ m1: { name: "Milk", type: "food" } }),
  });
  const before = await readMarketItem("m1");
  const marked = { ...before, marks: ["m2"] };

  assert.equal(await editProduct("m1", marked, before), true);
  assert.deepEqual(await readMarketItem("m1"), marked);
  const stored = files[MARKET_RECORDS];
  assert.equal(await editProduct("m1", { ...before, name: "Stale" }, before), false);
  assert.equal(files[MARKET_RECORDS], stored);

  assert.equal(await editProduct("m1", { ...marked, type: "other" }, marked), true);
  assert.deepEqual(await readMarketItem("m1"), { name: "Milk", type: "other" });
  assert.equal(await readMarketItem("m2"), null);
});

test("addProduct allocates past open shopping IDs and records only the new product", async () => {
  const log = "- [ ] m8\n";
  const { files } = vault({
    [note]: log, [MARKET_RECORDS]: JSON.stringify({ m2: { name: "Soap", type: "home" } }),
  });
  const id = await addProduct({ name: " Tea ", marks: ["m1"] });

  assert.equal(id, "m9");
  assert.deepEqual(await readMarketItem(id), { name: "Tea", type: "food", marks: ["m1"] });
  assert.equal(files[note], log);
});

test("removing an open row keeps other bytes, its catalog record and purchases", async () => {
  const catalog = '{"m1":{"name":"Tea","type":"food"}}';
  const before = "Shopping  \r\n\r\n- [x] m1 ✅ 2026-10-01\r\n";
  const { files } = vault({ [note]: before + "- [ ] m1\r\n- [ ] Milk", [MARKET_RECORDS]: catalog });
  const row = { line: 3, id: "m1", name: "Tea" };
  assert.equal(await removeItem({ ...row, line: 2 }), false);
  assert.equal(await removeItem(row), true);
  assert.equal(files[note], before + "- [ ] Milk");
  assert.equal(await removeItem(row), false);
  assert.equal(await removeItem({ line: 3, name: "Milk" }), true);
  assert.equal(files[note], before);
  assert.equal(files[MARKET_RECORDS], catalog);
  assert.equal(await addToMarket("Tea", "food", "m1"), true);
});

test("archived products stay out of the market, supplies and shopping choices", async () => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-11" }) };
  const records = { m1: { name: "Tea", type: "food", deleted: true },
    m2: { name: "Coffee", type: "food" } };
  const log = ["m1", "m2"].flatMap(id => [
    `- [ ] ${id}`, `- [x] ${id} ✅ 2026-10-01`, `- [x] ${id} ✅ 2026-10-10`,
  ]).join("\n");
  const { files } = vault({ [note]: log, [MARKET_RECORDS]: JSON.stringify(records) });
  for (const load of [loadCelestialMarket, loadSupplies]) {
    assert.deepEqual((await load()).groups.flatMap(g => g.rows.map(r => r.id)), ["m2"]);
  }
  assert.deepEqual((await readMarketChoices()).map(r => r.id), ["m2"]);
  assert.equal(await readMarketItem("m1"), null);
  assert.equal(await addToMarket("Tea", "food"), true);
  assert.deepEqual(JSON.parse(files[MARKET_RECORDS]).m3, { name: "Tea", type: "food" });
  assert.equal(files[note].split("\n").at(-2), "- [ ] m3");
});
