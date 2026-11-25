import "./stubs/dom.mjs";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { MarkdownRenderer, Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import config, { CONFIG, DISHES, FOOD_DATA, MARKET, MARKET_RECORDS, applyConfig } from "#/shared/config/index.js";

// The recipe book: the page (the dishes, a search, + Dish, 🛒, ✏️) and a dish's window (its
// ingredients with amounts, the marks, the recipe note's steps drawn below, 🛒 ✏️ 📄 🗑)
let mount, reactive, RecipesPage, openDish, loadRecipes, testWindows;
before(async () => {
  HTMLElement.prototype.setText = function (t) { this.textContent = t; };
  HTMLElement.prototype.addClass = function (c) { this.classList.add(c); };
  ({ mount } = await import("@vue/test-utils"));
  ({ reactive } = await import("vue"));
  RecipesPage = (await import("#/components/pages/recipes/index.vue")).default;
  ({ openDish } = await import("#/widgets/dish-window/index.js"));
  ({ loadRecipes } = await import("#/widgets/dish-window/index.js"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
});
const tick = () => new Promise(r => setTimeout(r));

async function showDish(windows, id) {
  void openDish(id);
  const w = await windows.next();
  await tick();
  return w.wrapper;
}

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
  const w = await page();

  assert.match(w.find(".ui-empty").text(), /No dishes yet/);
  const windows = testWindows();

  try {
    await w.find(".ui-recipes__add").trigger("click");
    const form = await windows.next();

    assert.equal(form.title, "New dish");
    await form.close();
  } finally { windows.restore(); }
});

// 🛒 through the test frame: what its window shows (its title, the dish, the products' lines),
// then `answer` (a line → its new { on, amount }) applied and Add, or the window closed (null)
async function cart(button, answer = l => l) {
  const windows = testWindows();

  try {
    await button.trigger("click");
    const w = await windows.next();
    const rows = w.wrapper.findAll(".ui-field-list__line:not(.ui-field-list__line--head)");
    const read = r => ({ on: r.find("input[type=checkbox]").element.checked,
      name: r.find(".ui-field__label").text(),
      amount: r.find("input:not([type=checkbox])").element.value });
    const shown = [w.title, { dish: w.wrapper.find(".ui-field__label").text(),
      lines: rows.map(read) }];

    if (!answer) await w.close();
    else {
      for (const r of rows) {
        const { on, amount } = answer(read(r));

        await r.find("input[type=checkbox]").setValue(on);
        await r.find("input:not([type=checkbox])").setValue(amount);
      }
      await w.submit();
    }
    return shown;
  } finally { windows.restore(); }
}

test("the recipes page: a dish's name opens its window; 🛒 asks, then puts its products on the list",
  async () => {
    const { files: written } = files();
    const windows = testWindows();
    const w = await page();

    try {
      await w.findAll(".ui-recipes__name")[1].trigger("click");
      await tick();
      assert.equal(windows.all.length, 1);
      const [dish] = windows.all;
      assert.deepEqual(dish.props, { dish: "d1" });
      assert.equal(dish.title, "🍲 Porridge");
      assert.ok(dish.classes.includes("ui-dish-window"));
      assert.equal(dish.wrapper.find(".ui-window__submit").exists(), false);
      await dish.close();
    } finally { windows.restore(); }
    const button = w.findAll(".ui-recipes__cart")[1];

    assert.deepEqual(await cart(button, null),
      ["To the shopping list?", { dish: "Porridge", lines: [
        { on: true, name: "oats", amount: "1 cup" }, { on: true, name: "milk", amount: "" }] }]);
    assert.equal(written[`${MARKET}.md`], "");
    await cart(button);
    assert.deepEqual(written[`${MARKET}.md`].trim().split("\n"),
      ["- [ ] m1 [need:: Porridge · 1 cup]", "- [ ] m2 [need:: Porridge]"]);
    assert.match(Notice.last, /2 → Celestial Market/);
  });

test("🛒: a product on the list already gets the dish's amount; the notice says so", async () => {
  const { files: written } = vault({
    [MARKET_RECORDS]: JSON.stringify(ITEMS), [DISHES]: JSON.stringify(DISH),
    [FOOD_DATA]: JSON.stringify({ marks: MARKS }),
    [`${MARKET}.md`]: "- [ ] m1 [need:: Muesli · 2 cups]\n",
  });
  const w = await page();

  await cart(w.findAll(".ui-recipes__cart")[1]);
  assert.deepEqual(written[`${MARKET}.md`].trim().split("\n"), [
    "- [ ] m1 [need:: Muesli · 2 cups] [need:: Porridge · 1 cup]", "- [ ] m2 [need:: Porridge]"]);
  assert.match(Notice.last, /1 → Celestial Market.*1 on the list already/);
});

test("the dish window: 🛒 asks too, then puts the dish's products on the list", async t => {
  const { files: written } = files();
  const windows = testWindows();
  t.after(windows.restore);
  const w = await showDish(windows, "d2");

  assert.deepEqual(await cart(w.find(".ui-dish__cart")), ["To the shopping list?",
    { dish: "Cake from the café", lines: [{ on: true, name: "cocoa", amount: "" }] }]);
  assert.equal(written[`${MARKET}.md`].trim().split("\n").length, 1);
});

test("the dish viewer renders the recipe steps with the window's owner", async t => {
  const { app } = files();
  const opened = [], windows = testWindows();
  app.workspace.openLinkText = path => opened.push(path);
  t.after(windows.restore);
  let owner;
  const render = MarkdownRenderer.render;
  t.mock.method(MarkdownRenderer, "render", async (app, md, el, path, component) => {
    owner = component;
    await render(app, md, el, path, component);
  });
  const w = await showDish(windows, "d1");

  assert.deepEqual(w.findAll(".ui-dish__ingredient").map(i =>
    [i.find(".ui-dish__product").text(), i.find(".ui-dish__amount").exists()
      ? i.find(".ui-dish__amount").text() : ""]), [["oats", "1 cup"], ["milk", ""]]);
  assert.match(w.find(".ui-dish__marks").text(), /🥛 milk/);
  assert.match(w.find(".ui-dish__steps").text(), /boil the milk/);
  assert.doesNotMatch(w.find(".ui-dish__steps").text(), /type: recipe/);
  assert.equal(owner._loaded, true);
  await w.get(".ui-dish__note").trigger("click");
  assert.deepEqual(opened, ["Recipes/Porridge.md"]);
  assert.equal(windows.all.length, 0);
  assert.equal(owner._loaded, false);
});

test("the dish window: an ordered dish has no steps; a gone product is marked", async t => {
  vault({
    [MARKET_RECORDS]: JSON.stringify(ITEMS), [FOOD_DATA]: JSON.stringify({ marks: MARKS }),
    [DISHES]: JSON.stringify({ d2: { ...DISH.d2, ingredients: [{ item: "m7", amount: "" }] } }),
  });
  const windows = testWindows();
  t.after(windows.restore);
  const w = await showDish(windows, "d2");

  assert.equal(w.find(".ui-dish__steps").exists(), false);
  assert.ok(w.find(".ui-dish__ingredient--gone").exists());
});

test("a dish reopened during note loading draws the current note", async t => {
  const { app } = files();
  const windows = testWindows();
  t.after(windows.restore);
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  t.mock.method(app.vault, "cachedRead", () => pending);
  const closed = openDish("d1");
  const first = await windows.next();
  await tick();
  assert.equal(app.vault.cachedRead.mock.callCount(), 1);
  await first.close();
  await closed;
  app.vault.cachedRead.mock.restore();

  const next = await showDish(windows, "d1");
  finish("Old read");
  await tick();
  assert.match(next.get(".ui-dish__steps").text(), /boil the milk/);
});

test("the dish window: 🗑 asks Delete dish? with its name; closed it stays, Delete deletes, closes",
  async () => {
    const { files: written } = files();
    const windows = testWindows();

    try {
      const w = await showDish(windows, "d2");
      await w.find(".ui-dish__delete").trigger("click");
      const no = await windows.next();

      assert.deepEqual(no.props, { title: "Delete dish?", submit: "Delete",
        lines: [{ name: "Dish", text: "Cake from the café" }] });
      await no.close();
      assert.deepEqual(Object.keys(JSON.parse(written[DISHES])), ["d1", "d2"]);
      assert.equal(windows.all.length, 1);
      await w.find(".ui-dish__delete").trigger("click");
      await (await windows.next()).submit();
      await tick();
      assert.deepEqual(JSON.parse(written[DISHES]).d2, { ...DISH.d2, deleted: true });
      const recipes = await page();
      assert.deepEqual(recipes.findAll(".ui-recipes__name").map(n => n.text()), ["🍲 Porridge 📄"]);
      await recipes.find(".ui-recipes__search").setValue("cake");
      assert.match(recipes.find(".ui-recipes__none").text(), /Nothing found/);
      assert.equal(windows.all.length, 0);
    } finally { windows.restore(); }
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

test("⚙ Settings saves recipe tabs by key and name, including an empty list", async t => {
  const { openSettings } = await import("#/features/save-settings/index.js");
  const { files: written } = vault();
  applyConfig({ dishTypes: [{ key: "main", name: "Mains" }] });
  t.after(() => applyConfig());
  const windows = testWindows();
  try {
    const saving = openSettings();
    const w = await windows.next();
    await w.wrapper.get('button[data-tab="Recipes"]').trigger("click");
    const pane = w.wrapper.get(".ui-window__pane:not([hidden])");
    assert.equal(pane.get(".setting-item-name").text(), "Dish types");
    assert.deepEqual(pane.findAll("input").map(i => i.element.value), ["main", "Mains"]);
    await pane.get('input[placeholder="Soups"]').setValue("");
    await w.submit();
    assert.match(Notice.last, /each dish type needs a key and a name/);
    assert.equal(written[CONFIG], undefined);
    await pane.get('input[placeholder="Soups"]').setValue("Main dishes");
    await w.submit();
    assert.deepEqual(await saving, { moved: 0 });
    assert.deepEqual(JSON.parse(written[CONFIG]).dishTypes, [
      { key: "main", name: "Main dishes" },
    ]);
    const savingEmpty = openSettings();
    const empty = await windows.next();
    await empty.wrapper.get('button[data-tab="Recipes"]').trigger("click");
    await empty.wrapper.get('.ui-window__pane:not([hidden]) button[title="Remove"]')
      .trigger("click");
    await empty.submit();
    assert.deepEqual(await savingEmpty, { moved: 0 });
    assert.deepEqual(JSON.parse(written[CONFIG]).dishTypes, []);
  } finally { windows.restore(); }
});

test("an alternative of two products: «oats / cocoa + milk» on the page, each with its amount "
  + "under the main one in the window and in 🛒 (unticked there)", async t => {
  const { files: written } = vault({
    [MARKET_RECORDS]: JSON.stringify(ITEMS), [FOOD_DATA]: JSON.stringify({ marks: MARKS }),
    [DISHES]: JSON.stringify({ d1: { ...DISH.d1, ingredients: [{ item: "m1", amount: "1 cup",
      alt: [{ item: "m3", amount: "2 tsp" }, { item: "m2", amount: "1 glass" }] }] } }),
    [`${MARKET}.md`]: "",
  });
  const w = await page();

  assert.equal(w.find(".ui-recipes__ingredients").text(), "oats / cocoa + milk");
  const [, asked] = await cart(w.find(".ui-recipes__cart"), l => ({ ...l, on: !l.on }));

  assert.deepEqual(asked.lines, [{ on: true, name: "oats", amount: "1 cup" },
    { on: false, name: "↳ cocoa", amount: "2 tsp" }, { on: false, name: "↳ milk", amount: "1 glass" }]);
  assert.deepEqual(written[`${MARKET}.md`].trim().split("\n"),
    ["- [ ] m3 [need:: Porridge · 2 tsp]", "- [ ] m2 [need:: Porridge · 1 glass]"]);

  const windows = testWindows();
  t.after(windows.restore);
  const win = await showDish(windows, "d1");

  assert.deepEqual(win.findAll(".ui-dish__alt").map(a =>
    [a.find(".ui-dish__product").text(), a.find(".ui-dish__amount").text()]),
  [["cocoa", "2 tsp"], ["milk", "1 glass"]]);
});

test("🛒: an amount changed in the window goes onto the list", async () => {
  const { files: written } = files();
  const w = await page();

  await cart(w.findAll(".ui-recipes__cart")[1],
    l => ({ ...l, amount: l.name === "oats" ? "2 cups" : "" }));
  assert.match(written[`${MARKET}.md`], /m1 \[need:: Porridge · 2 cups\]/);
});

test("🛒: a line a checkbox, all ticked; an unticked line stays off the list", async () => {
  const { files: written } = files();
  const w = await page();

  await cart(w.findAll(".ui-recipes__cart")[1], l => ({ ...l, on: l.name !== "milk" }));
  assert.equal(written[`${MARKET}.md`].trim(), "- [ ] m1 [need:: Porridge · 1 cup]");
});

test("🛒: all unticked: nothing is added, and the notice says so", async () => {
  const { files: written } = files();
  const w = await page();

  await cart(w.findAll(".ui-recipes__cart")[1], l => ({ ...l, on: false }));
  assert.equal(written[`${MARKET}.md`], "");
  assert.match(Notice.last, /nothing ticked/);
});

test("✏️ on the page and in the dish window: the form gets each line's alternative", async () => {
  vault({
    [MARKET_RECORDS]: JSON.stringify(ITEMS), [FOOD_DATA]: JSON.stringify({ marks: MARKS }),
    [DISHES]: JSON.stringify({ d1: { ...DISH.d1, ingredients: [
      { item: "m1", amount: "1 cup", alt: [{ item: "m3", amount: "2 tsp" }] }] } }),
  });
  const windows = testWindows(), asked = [];
  const readPicks = async () => {
    const f = await windows.next();

    asked.push(f.wrapper.findAll(".ui-field-pick__button").map(b => b.text()));
    await f.close();
  };

  try {
    const w = await page();

    await w.find("[aria-label='edit the dish']").trigger("click");
    await readPicks();
    const win = await showDish(windows, "d1");

    await win.find(".ui-dish__edit").trigger("click");
    await readPicks();
  } finally { windows.restore(); }
  assert.deepEqual(asked, [["oats", "cocoa", "Porridge"], ["oats", "cocoa", "Porridge"]]);
});


test("the cart skips archived mains and alternatives but keeps active and missing ingredient rows", async () => {
  const recipe = { ...DISH.d1, ingredients: [
    { item: "m1", amount: "1 cup", alt: [{ item: "m2", amount: "2 cups" }] },
    { item: "m3", amount: "1 tsp", alt: [{ item: "m4", amount: "" }, { item: "m7", amount: "" }] },
  ] };
  const { files: written } = vault({
    [MARKET_RECORDS]: JSON.stringify({ ...ITEMS, m4: { name: "sugar", type: "food" } }),
    [DISHES]: JSON.stringify({ d1: recipe }), [`${MARKET}.md`]: "",
  });
  const w = await page();
  const records = JSON.parse(written[MARKET_RECORDS]);
  records.m1.deleted = true;
  records.m4.deleted = true;
  written[MARKET_RECORDS] = JSON.stringify(records);
  const [, asked] = await cart(w.get(".ui-recipes__cart"), l => ({ ...l, on: true }));

  assert.deepEqual(asked.lines, [
    { on: false, name: "↳ milk", amount: "2 cups" }, { on: true, name: "cocoa", amount: "1 tsp" },
    { on: false, name: "↳ m7", amount: "" },
  ]);
  assert.deepEqual(written[`${MARKET}.md`].trim().split("\n"),
    ["- [ ] m2 [need:: Porridge · 2 cups]", "- [ ] m3 [need:: Porridge · 1 tsp]"]);
  records.m2.deleted = true;
  records.m3.deleted = true;
  written[MARKET_RECORDS] = JSON.stringify(records);
  const [, onlyMissing] = await cart(w.get(".ui-recipes__cart"));
  assert.deepEqual(onlyMissing.lines, [{ on: false, name: "↳ m7", amount: "" }]);
  assert.match(Notice.last, /nothing ticked, nothing added/);
  assert.deepEqual(JSON.parse(written[DISHES]).d1, recipe);
});
