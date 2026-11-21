import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { DISHES, FOOD_DATA, MARKET, MARKET_RECORDS } from "#/helpers/paths.js";
import config from "#/helpers/config.js";

// The recipe book: the page (the dishes, a search, + Dish, 🛒, ✏️) and a dish's window (its
// ingredients with amounts, the marks, the recipe note's steps drawn below, 🛒 ✏️ 📄 🗑)
let mount, reactive, RecipesPage, DishView, DishWindow, Form, loadRecipes, Component;
before(async () => {
  GlobalRegistrator.register();
  HTMLElement.prototype.setText = function (t) { this.textContent = t; };
  HTMLElement.prototype.addClass = function (c) { this.classList.add(c); };
  ({ mount } = await import("@vue/test-utils"));
  ({ reactive } = await import("vue"));
  ({ Component } = await import("obsidian"));
  RecipesPage = (await import("#/components/pages/recipes/index.vue")).default;
  DishView = (await import("#/components/pages/recipes/DishWindow/index.vue")).default;
  ({ DishWindow } = await import("#/components/pages/recipes/DishWindow/index.ts"));
  ({ Form } = await import("#/components/uikit/Form/index.ts"));
  ({ loadRecipes } = await import("#/controllers/dishes.js"));
});
const tick = () => new Promise(r => setTimeout(r));

// made-up: two products with marks, a cooked dish with its note, an ordered one without
const MARKS = [{ tag: "m1", icon: "🍫", name: "cocoa" }, { tag: "m2", icon: "🥛", name: "milk" }];
const ITEMS = {
  m1: { name: "oats", type: "food", marks: [] }, m2: { name: "milk", type: "food", marks: ["m2"] },
  m3: { name: "cocoa", type: "food", marks: ["m1"] }, m9: { name: "soap", type: "care" },
};
const DISH = {
  d1: { name: "Porridge", ingredients: [{ item: "m1", amount: "1 cup" }, { item: "m2", amount: "" }],
    link: "Recipes/Porridge.md" },
  d2: { name: "Cake from the café", ingredients: [{ item: "m3", amount: "" }], link: "" },
};
const NOTE = "---\ntype: recipe\n---\n\n## Steps\n- boil the milk\n";
const files = () => vault({
  [MARKET_RECORDS]: JSON.stringify(ITEMS), [DISHES]: JSON.stringify(DISH),
  [FOOD_DATA]: JSON.stringify({ marks: MARKS }), [`${MARKET}.md`]: "",
  "Recipes/Porridge.md": NOTE,
});
// the page in the app's tab: its saved state (the tab picked) is the tab's ui.state.recipes;
// types: the displayed type of each dish by id
const TABS = [{ key: "soup", name: "Soups" }, { key: "main", name: "Mains" },
  { key: "dessert", name: "Desserts" }];
const page = async (types = {}, recipes = { course: "all" }, tabs = TABS) => {
  config.dishTypes = tabs;
  const data = await loadRecipes();

  data.dishes = data.dishes.map(d => ({ ...d, type: types[d.id] ?? "" }));
  return mount(RecipesPage, {
    props: { state: { data } }, global: { provide: { ui: { state: { recipes: reactive(recipes) } } } },
  });
};

test("the recipes page: a dish a row by name, its ingredients and marks; 📄 when it has a note", async () => {
  files();
  const w = await page();
  const rows = w.findAll(".ui-table__row");

  assert.deepEqual(rows.map(r => r.find(".ui-recipes__name").text()),
    ["🍲 Cake from the café", "🍲 Porridge 📄"]);
  assert.equal(rows[1].find(".ui-recipes__ingredients").text(), "oats, milk");
  assert.equal(rows[0].find(".ui-recipes__marks").text(), "🍫");
});

test("the recipes page: the search finds a dish by its name or an ingredient", async () => {
  files();
  const w = await page();

  await w.find(".ui-recipes__search").setValue("oat");
  assert.deepEqual(w.findAll(".ui-recipes__name").map(n => n.text()), ["🍲 Porridge 📄"]);
  await w.find(".ui-recipes__search").setValue("zzz");
  assert.match(w.find(".ui-recipes__none").text(), /Nothing found/);
});

test("the recipes page: no dishes yet says so, + Dish opens the dish form", async () => {
  vault({ [FOOD_DATA]: JSON.stringify({ marks: MARKS }) });
  const ask = Form.ask;
  let title = null;
  const w = await page();

  assert.match(w.find(".ui-empty").text(), /No dishes yet/);
  Form.ask = async (_app, t) => { title = t; return null; };
  try { await w.find(".ui-recipes__add").trigger("click"); await tick(); } finally { Form.ask = ask; }
  assert.equal(title, "New dish");
});

// 🛒 with Form.ask answering `answer`: what it was asked (its title and the products shown)
async function cart(button, answer) {
  const ask = Form.ask, asked = [];

  Form.ask = async (_app, title, _rows, { values }) => {
    asked.push([title, values]);
    return answer && { ...values, ...answer };
  };
  try { await button.trigger("click"); await tick(); await tick(); } finally { Form.ask = ask; }
  return asked;
}

test("the recipes page: a dish's name opens its window; 🛒 asks, then puts its products on the list",
  async () => {
    const { files: written } = files();
    const opened = [], open = DishWindow.prototype.open;
    const w = await page();

    DishWindow.prototype.open = function () { opened.push(this.dish); };
    try { await w.findAll(".ui-recipes__name")[1].trigger("click"); } finally {
      DishWindow.prototype.open = open;
    }
    assert.deepEqual(opened, ["d1"]);
    const button = w.findAll(".ui-recipes__cart")[1];

    assert.deepEqual(await cart(button, null),
      [["To the shopping list?", { dish: "Porridge",
        lines: [{ on: true, name: "oats" }, { on: true, name: "milk" }] }]]);
    assert.equal(written[`${MARKET}.md`], "");
    await cart(button, {});
    assert.equal(written[`${MARKET}.md`].trim().split("\n").length, 2);
    assert.match(Notice.last, /2/);
  });

test("the dish window: 🛒 asks too, then puts the dish's products on the list", async () => {
  const { files: written } = files();
  const w = mount(DishView, { props: { dish: "d2", owner: new Component() } });

  await tick(); await tick();
  assert.deepEqual(await cart(w.find(".ui-dish__cart"), {}),
    [["To the shopping list?", { dish: "Cake from the café", lines: [{ on: true, name: "cocoa" }] }]]);
  assert.equal(written[`${MARKET}.md`].trim().split("\n").length, 1);
});

test("the dish window: the ingredients with amounts, the marks, the note's steps without its properties", async () => {
  files();
  const owner = new Component();
  const w = mount(DishView, { props: { dish: "d1", owner }, attachTo: document.body });

  await tick(); await tick();
  assert.deepEqual(w.findAll(".ui-dish__ingredient").map(i =>
    [i.find(".ui-dish__product").text(), i.find(".ui-dish__amount").exists()
      ? i.find(".ui-dish__amount").text() : ""]), [["oats", "1 cup"], ["milk", ""]]);
  assert.match(w.find(".ui-dish__marks").text(), /🥛 milk/);
  assert.match(w.find(".ui-dish__steps").text(), /boil the milk/);
  assert.doesNotMatch(w.find(".ui-dish__steps").text(), /type: recipe/);
  w.unmount();
});

test("the dish window: an ordered dish has no steps; a gone product is marked", async () => {
  vault({
    [MARKET_RECORDS]: JSON.stringify(ITEMS), [FOOD_DATA]: JSON.stringify({ marks: MARKS }),
    [DISHES]: JSON.stringify({ d2: { ...DISH.d2, ingredients: [{ item: "m7", amount: "" }] } }),
  });
  const w = mount(DishView, { props: { dish: "d2", owner: new Component() } });

  await tick(); await tick();
  assert.equal(w.find(".ui-dish__steps").exists(), false);
  assert.ok(w.find(".ui-dish__ingredient--gone").exists());
});

test("the dish window: 🗑 asks, then deletes the dish and closes", async () => {
  const { files: written } = files();
  const ask = Form.ask;
  const w = mount(DishView, { props: { dish: "d2", owner: new Component() } });

  await tick(); await tick();
  Form.ask = async () => ({});
  try { await w.find(".ui-dish__delete").trigger("click"); await tick(); await tick(); } finally {
    Form.ask = ask;
  }
  assert.deepEqual(Object.keys(JSON.parse(written[DISHES])), ["d1"]);
  assert.equal(w.emitted("close").length, 1);
});

test("the recipes page: a tab a course, its count following the search; the tab is saved state",
  async () => {
    files();
    const recipes = reactive({ course: "all" });
    const w = await page({ d1: "main" }, recipes);
    const tabs = () => w.findAll(".ui-tabs__tab").map(t => t.text());
    const names = () => w.findAll(".ui-recipes__name").map(n => n.text());

    assert.deepEqual(tabs(), ["All 2", "Soups 0", "Mains 1", "Desserts 0", "Other 1"]);
    await w.find("[data-tab=main]").trigger("click");
    assert.equal(recipes.course, "main");
    assert.deepEqual(names(), ["🍲 Porridge 📄"]);
    await w.find(".ui-recipes__search").setValue("cocoa");
    assert.deepEqual(tabs(), ["All 1", "Soups 0", "Mains 0", "Desserts 0", "Other 1"]);
    assert.equal(w.find(".ui-recipes__none").text(), "Nothing found");
    await w.find("[data-tab=other]").trigger("click");
    assert.deepEqual(names(), ["🍲 Cake from the café"]);
  });

test("the recipes page: a course with no dishes yet says so", async () => {
  files();
  const w = await page({}, { course: "soup" });

  assert.equal(w.find(".ui-recipes__none").text(), "Nothing here yet");
});

test("the recipes page: the tabs are ⚙ Settings' (their names and order); a gone one shows all",
  async () => {
    files();
    const w = await page({ d1: "main" }, { course: "soup" }, [{ key: "main", name: "Второе" }]);

    assert.deepEqual(w.findAll(".ui-tabs__tab").map(t => t.text()), ["All 2", "Второе 1", "Other 1"]);
    assert.equal(w.find(".ui-tabs__tab--on").text(), "All 2");
    assert.equal(w.findAll(".ui-recipes__name").length, 2);
  });

test("⚙ Settings: a Recipes tab, a line a page tab (its tag, its name)", async () => {
  const { settingsWindow } = await import("#/components/uikit/SettingsWindow/index.js");
  const ask = Form.ask;
  let rows;

  Form.ask = async (_app, _title, r) => { rows = r; return null; };
  try { await settingsWindow(config, {}); } finally { Form.ask = ask; }
  const row = rows.find(r => r.key === "dishTypes");

  assert.equal(row.tab, "Recipes");
  assert.deepEqual(row.list.map(r => r.key), ["key", "name"]);
  assert.deepEqual(row.required, ["key", "name"]);
});

test("an alternative: «oats / cocoa» on the page and in the window; 🛒 asks which one goes",
  async () => {
    const { files: written } = vault({
      [MARKET_RECORDS]: JSON.stringify(ITEMS), [FOOD_DATA]: JSON.stringify({ marks: MARKS }),
      [DISHES]: JSON.stringify({ d1: { ...DISH.d1, ingredients: [
        { item: "m1", amount: "1 cup", alt: "m3" }, { item: "m2", amount: "" }] } }),
      [`${MARKET}.md`]: "",
    });
    const w = await page();

    assert.equal(w.find(".ui-recipes__ingredients").text(), "oats / cocoa, milk");
    const ask = Form.ask;
    let asked;

    Form.ask = async (_app, _title, rows, { values }) => {
      asked = { rows, values };
      return { ...values, alt0: "m3" };
    };
    try { await w.find(".ui-recipes__cart").trigger("click"); await tick(); await tick(); } finally {
      Form.ask = ask;
    }
    const choice = asked.rows.find(r => r.key === "alt0");

    assert.deepEqual(choice.options, [{ label: "oats", value: "m1" }, { label: "cocoa", value: "m3" }]);
    assert.equal(asked.values.alt0, "m1");
    assert.deepEqual(asked.values.lines.map(l => l.name), ["oats / cocoa", "milk"]);
    assert.deepEqual(written[`${MARKET}.md`].trim().split("\n").sort(), ["- [ ] m2", "- [ ] m3"]);

    const win = mount(DishView, { props: { dish: "d1", owner: new Component() } });

    await tick(); await tick();
    assert.equal(win.find(".ui-dish__product").text(), "oats / cocoa");
  });

test("🛒: a line a checkbox, all ticked; an unticked line stays off the list", async () => {
  const { files: written } = files();
  const w = await page();
  const ask = Form.ask;
  let rows;

  Form.ask = async (_app, _title, r, { values }) => {
    rows = r;
    return { ...values, lines: values.lines.map(l => ({ ...l, on: l.name !== "milk" })) };
  };
  try {
    await w.findAll(".ui-recipes__cart")[1].trigger("click"); await tick(); await tick();
  } finally { Form.ask = ask; }
  const list = rows.find(r => r.key === "lines");

  assert.equal(list.fixed, true);
  assert.deepEqual(list.list.map(r => r.key), ["on", "name"]);
  assert.equal(written[`${MARKET}.md`].trim(), "- [ ] m1");
});

test("🛒: all unticked: nothing is added, and the notice says so", async () => {
  const { files: written } = files();
  const w = await page();
  const ask = Form.ask;

  Form.ask = async (_app, _title, _rows, { values }) =>
    ({ ...values, lines: values.lines.map(l => ({ ...l, on: false })) });
  try {
    await w.findAll(".ui-recipes__cart")[1].trigger("click"); await tick(); await tick();
  } finally { Form.ask = ask; }
  assert.equal(written[`${MARKET}.md`], "");
  assert.match(Notice.last, /nothing ticked/);
});
