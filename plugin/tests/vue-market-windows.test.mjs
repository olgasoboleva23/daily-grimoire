import "./stubs/dom.mjs";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { FOOD_DATA, MARKET_NOTE, MARKET_RECORDS } from "#/shared/config/index.js";

// The market's and food's windows (components/windows/{market,food}): a product's window, new or
// edit, the marks, and the flows that open them (＋ on the market, the product search), through
// the test frame as their openers do; the searches stubbed. Made-up products only.
const MARKS = [{ tag: "m1", icon: "🍫", name: "cocoa" }, { tag: "m2", icon: "🥛", name: "milk" }];
let Search, testWindows, windows, flows, MarketItemWindow, MarksWindow, openWindow;
before(async () => {
  window.moment = () => ({ format: () => "2026-11-20" });
  ({ Search } = await import("#/shared/ui/Search/index.ts"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
  ({ openWindow } = await import("#/shared/ui/Window/index.ts"));
  flows = await import("#/components/windows/market/MarketItemWindow/open.js");
  MarketItemWindow = (await import("#/components/windows/market/MarketItemWindow/index.vue"))
    .default;
  MarksWindow = (await import("#/components/windows/food/MarksWindow/index.vue")).default;
  windows = testWindows();
});
after(() => windows.restore());

const names = w => w.wrapper.findAll(".setting-item-name").map(n => n.text());
const button = w => w.wrapper.find(".ui-window__submit");
const greyed = w => button(w).element.disabled;
const checks = w => w.wrapper.findAll("input[type=checkbox]");
const choices = w => w.wrapper.findAll(".ui-field-choice");
const lit = w => choices(w).filter(c => c.classes("mod-cta")).map(c => c.text());
const records = files => JSON.parse(files[MARKET_RECORDS]);
const food = (records = {}) => vault({
  [FOOD_DATA]: JSON.stringify({ marks: MARKS }), [MARKET_RECORDS]: JSON.stringify(records),
});

test("New product: Name prefilled, a check per mark (an empty description each); Add needs a name",
  async () => {
    const { files } = food({ m4: { name: "Soap", type: "home" } });
    const running = flows.openNewProduct("Oat milk");
    const w = await windows.next();

    assert.equal(w.title, "New product");
    assert.deepEqual(names(w), ["Name", "🍫 cocoa", "🥛 milk"]);
    assert.deepEqual(w.wrapper.findAll(".mod-toggle .setting-item-description")
      .map(d => d.text()), ["", ""]);
    assert.deepEqual(checks(w).map(c => c.attributes("aria-label")), ["🍫 cocoa", "🥛 milk"]);
    const name = w.wrapper.find("input.ui-field-text__input");

    assert.equal(name.attributes("placeholder"), "Product name");
    assert.equal(name.element.value, "Oat milk");
    assert.equal(button(w).text(), "Add");
    await name.setValue("");
    assert.equal(greyed(w), true);
    await name.setValue(" Oat drink ");
    await checks(w)[1].setValue(true);
    await w.submit();

    assert.equal(await running, "m5");
    assert.deepEqual(records(files).m5, { name: "Oat drink", type: "food", marks: ["m2"] });
  });

test("Edit item (food): Name, Category lit, the marks checked; Save writes against `before`",
  async () => {
    const { files } = food({ m1: { name: "Tea", type: "food", marks: ["m1"] } });
    const running = flows.openEditItem("m1");
    const w = await windows.next();

    assert.equal(w.title, "Edit item");
    assert.deepEqual(names(w), ["Name", "Category", "🍫 cocoa", "🥛 milk"]);
    assert.equal(w.wrapper.find("input.ui-field-text__input").attributes("placeholder"),
      "Item name");
    assert.deepEqual(choices(w).map(c => c.text()),
      ["🌿 Harvest", "🌸 Bloom", "🐾 Familiar", "🏰 Sanctuary", "✨ Vitality", "✦ Other"]);
    assert.deepEqual(lit(w), ["🌿 Harvest"]);
    assert.deepEqual(checks(w).map(c => c.element.checked), [true, false]);
    assert.equal(button(w).text(), "Save");
    await w.wrapper.find("input.ui-field-text__input").setValue("Green tea");
    await checks(w)[0].setValue(false);
    await checks(w)[1].setValue(true);
    await w.submit();

    assert.equal(await running, true);
    assert.deepEqual(records(files).m1, { name: "Green tea", type: "food", marks: ["m2"] });
  });

test("Edit item (not food): no marks; changed meanwhile: a notice, it stays", async () => {
  const { files } = food({ m3: { name: "Soap", type: "home" } });
  const running = flows.openEditItem("m3");
  const w = await windows.next();

  assert.deepEqual(names(w), ["Name", "Category"]);
  assert.deepEqual(lit(w), ["🏰 Sanctuary"]);
  files[MARKET_RECORDS] = JSON.stringify({ m3: { name: "Soap bar", type: "home" } });
  await w.submit();
  assert.equal(Notice.last, "Item changed. Open it again to edit.");
  assert.equal(windows.all.includes(w), true);
  await w.close();
  assert.equal(await running, null);
});

test("Edit item: a gone item says so, no window", async () => {
  food({});
  assert.equal(await flows.openEditItem("m9"), undefined);
  assert.equal(Notice.last, "Item no longer exists");
  assert.equal(windows.all.length, 0);
});

test("✦ Marks: a table of Icon and Name; Save needs both in every line; new tags numbered",
  async () => {
    const { files } = food();
    const running = openWindow(MarksWindow, { marks: MARKS });
    const w = await windows.next();

    assert.equal(w.title, "✦ Marks");
    assert.deepEqual(names(w), ["Marks"]);
    assert.deepEqual(w.wrapper.findAll(".ui-field-list__line--head .ui-field-list__cell")
      .map(c => c.text()), ["Icon", "Name", ""]);
    const inputs = () => w.wrapper.findAll("input");

    assert.deepEqual(inputs().map(i => [i.attributes("placeholder"), i.element.value]),
      [["🍫", "🍫"], ["какао", "cocoa"], ["🍫", "🥛"], ["какао", "milk"]]);
    assert.equal(button(w).text(), "Save");
    await w.wrapper.find(".ui-field-list__more button").trigger("click");
    assert.equal(greyed(w), true);
    await inputs()[4].setValue("🍓");
    await inputs()[5].setValue("berries");
    assert.equal(greyed(w), false);
    await w.submit();

    assert.equal(await running, true);
    assert.deepEqual(JSON.parse(files[FOOD_DATA]).marks,
      [...MARKS, { tag: "m3", icon: "🍓", name: "berries" }]);
    assert.equal(MARKS.length, 2);   // the marks given are not changed
  });

test("＋ on the market: a new item asks its Category, then joins the list", async t => {
  const { files } = vault({ [MARKET_RECORDS]: JSON.stringify({}) });
  t.mock.method(Search, "pickGrouped", async (_app, title, find) => {
    assert.equal(title, "Find or add an item…");
    return find("Kite string").at(-1);
  });
  const running = flows.addMarketItem();
  const w = await windows.next();

  assert.equal(w.title, "✦ Kite string");
  assert.deepEqual(names(w), ["Category"]);
  assert.equal(button(w).text(), "Add");
  assert.equal(greyed(w), true);
  await choices(w)[3].trigger("click");
  await w.submit();
  await running;
  assert.deepEqual(records(files), { m1: { name: "Kite string", type: "home" } });
  assert.equal(files[MARKET_NOTE], "- [ ] m1\n");
});

test("＋ on the market: one bought before joins at once; one on the list: a notice", async t => {
  const { files } = vault({
    [MARKET_RECORDS]: JSON.stringify({ m1: { name: "Rice", type: "food" },
      m2: { name: "Salt", type: "food" } }),
    [MARKET_NOTE]: "- [x] m1 [completion:: 2026-11-01]\n- [ ] m2\n",
  });
  const picks = ["Rice", "Salt"];

  t.mock.method(Search, "pickGrouped", async (_app, _title, find) => {
    const name = picks.shift();

    return find("").find(c => c.name === name);
  });
  await flows.addMarketItem();
  assert.equal(files[MARKET_NOTE], "- [x] m1 [completion:: 2026-11-01]\n- [ ] m2\n- [ ] m1\n");
  await flows.addMarketItem();
  assert.equal(Notice.last, "✦ Salt is on the list already");
  assert.equal(windows.all.length, 0);
});

test("the product search: a product picked; + new opens New product with the typed name",
  async t => {
    const { files } = food({
      m1: { name: "Peas", type: "food" }, m2: { name: "Glue", type: "home" },
      m0: { name: "Beans", type: "food", deleted: true },
    });
    const shown = [];
    const search = query => async (_app, title, find, render) => {
      assert.equal(title, "Choose a product");
      const rows = find(query);

      rows.forEach(r => render(r, { createSpan: ({ text }) => shown.push(text) }));
      return rows.at(-1);
    };

    t.mock.method(Search, "pick", search(""));
    assert.equal(await flows.pickOrAddProduct(), "m1");
    assert.deepEqual(shown.splice(0), ["Peas"]);   // the food products only

    t.mock.method(Search, "pick", search("Bean"));
    const running = flows.pickOrAddProduct();
    const w = await windows.next();

    assert.deepEqual(shown, ["+ new product: Bean"]);
    assert.equal(w.title, "New product");
    await w.submit();
    assert.equal(await running, "m3");
    assert.deepEqual(records(files).m3, { name: "Bean", type: "food", marks: [] });
  });

test("MarketItemWindow: the props it is given are not changed", async () => {
  food({ m1: { name: "Tea", type: "food", marks: ["m1"] } });
  const before = { name: "Tea", type: "food", marks: ["m1"] };
  const running = openWindow(MarketItemWindow, { id: "m1", before, marks: MARKS });
  const w = await windows.next();

  await checks(w)[1].setValue(true);
  await w.wrapper.find("input.ui-field-text__input").setValue("Tea 2");
  assert.deepEqual(before, { name: "Tea", type: "food", marks: ["m1"] });
  await w.close();
  await running;
});
