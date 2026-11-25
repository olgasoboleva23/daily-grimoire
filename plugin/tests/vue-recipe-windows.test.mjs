import "./stubs/dom.mjs";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import config, { DISHES, FOOD_DATA, MARKET, MARKET_RECORDS } from "#/shared/config/index.js";

// The recipe book's windows (components/windows/recipes): the dish form (its ingredients, an
// ingredient's alternatives in their own window, a product picked or edited in the market's
// windows), and 🛒 To the shopping list?, through the test frame as their openers do; the
// searches stubbed. Made-up products only.
const ITEMS = {
  m1: { name: "oats", type: "food" }, m2: { name: "milk", type: "food" },
  m3: { name: "cocoa", type: "food" }, m9: { name: "soap", type: "care" },
};
const DISH = { name: "Porridge", type: "main", link: "",
  ingredients: [{ item: "m1", amount: "1 cup", alt: [{ item: "m3", amount: "2 tsp" }] },
    { item: "m2", amount: "" }] };
const files = (dishes = { d1: DISH }) => vault({
  [MARKET_RECORDS]: JSON.stringify(ITEMS), [DISHES]: JSON.stringify(dishes),
  [FOOD_DATA]: JSON.stringify({ marks: [] }), [`${MARKET}.md`]: "",
});
const TYPES = [{ key: "soup", name: "Soups" }, { key: "main", name: "Mains" }];
let Search, testWindows, windows, openDishForm, openCart, loadRecipes;
before(async () => {
  window.moment = () => ({ format: () => "2026-11-20" });
  ({ Search } = await import("#/shared/ui/Search/index.ts"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
  ({ openDishForm } = await import("#/components/windows/recipes/DishFormWindow/open.js"));
  ({ loadRecipes } = await import("#/controllers/dishes.js"));
  ({ openCart } = await import("#/components/windows/recipes/CartWindow/open.js"));
  config.dishTypes = TYPES;
  windows = testWindows();
});
after(() => windows.restore());

const names = w => w.wrapper.findAll(".setting-item-name").map(n => n.text());
const greyed = w => w.wrapper.find(".ui-window__submit").element.disabled;
const head = w => w.wrapper.findAll(".ui-field-list__line--head .ui-field-list__cell")
  .map(c => c.text());
const lines = w => w.wrapper.findAll(".ui-field-list__line:not(.ui-field-list__line--head)");
const picks = (w, n) => lines(w)[n].findAll(".ui-field-pick__button");
const choices = w => w.wrapper.findAll(".ui-field-choice");
const lit = w => choices(w).filter(c => c.classes("mod-cta")).map(c => c.text());
const dish = (written, id) => JSON.parse(written[DISHES])[id];

test("New dish: Name (what was typed), one empty line, Type — lit, Note; Save greyed until a name "
  + "and a line with a product", async t => {
  const { files: written } = files({});
  const running = openDishForm({ name: "Stew" });
  const w = await windows.next();

  assert.equal(w.title, "New dish");
  assert.deepEqual(names(w), ["Name", "Ingredients", "Type", "Note"]);
  assert.deepEqual(head(w), ["Product", "Or", "Amount", ""]);
  assert.equal(w.wrapper.find("input").element.value, "Stew");
  assert.equal(w.wrapper.find("input").attributes("placeholder"), "Dish name");
  assert.equal(lines(w).length, 1);
  assert.equal(lines(w)[0].find("input").attributes("placeholder"), "500 г");
  assert.deepEqual(picks(w, 0).map(p => p.text()), ["Choose…", "Choose…"]);
  assert.deepEqual(choices(w).map(c => c.text()), ["—", "Soups", "Mains"]);
  assert.deepEqual(lit(w), ["—"]);
  assert.equal(w.wrapper.find(".ui-window__submit").text(), "Save");
  assert.equal(greyed(w), true);

  t.mock.method(Search, "pick", async (_app, _title, find) => find("").find(p => p.id === "m2"));
  await picks(w, 0)[0].trigger("click"); await new Promise(r => setTimeout(r));
  assert.equal(picks(w, 0)[0].text(), "milk");
  assert.equal(greyed(w), false);
  await w.wrapper.find("input").setValue("");
  assert.equal(greyed(w), true);
  await w.wrapper.find("input").setValue(" Stew ");
  await w.submit();

  assert.equal(await running, "d1");
  assert.deepEqual(dish(written, "d1"),
    { name: "Stew", type: "", link: "", ingredients: [{ item: "m2", amount: "" }] });
});

test("Edit dish: its lines (Or «a + b»), its type lit; a chosen product opens Edit item, its new "
  + "name shown after", async () => {
  const { files: written } = files({ d1: { ...DISH, ingredients: [{ ...DISH.ingredients[0],
    alt: [{ item: "m3", amount: "" }, { item: "m2", amount: "" }] }] } });
  const running = openDishForm({ id: "d1" });
  const w = await windows.next();

  assert.equal(w.title, "Edit dish");
  assert.deepEqual(picks(w, 0).map(p => p.text()), ["oats", "cocoa + milk"]);
  assert.equal(lines(w)[0].find("input").element.value, "1 cup");
  assert.deepEqual(lit(w), ["Mains"]);

  await picks(w, 0)[0].trigger("click");
  const item = await windows.next();

  assert.equal(item.title, "Edit item");
  await item.wrapper.find("input").setValue("rolled oats");
  await item.submit();
  assert.equal(picks(w, 0)[0].text(), "rolled oats");

  await choices(w)[0].trigger("click");   // —: no type
  await w.submit();
  assert.equal(await running, "d1");
  assert.equal(dish(written, "d1").type, "");
});

test("Edit dish: changed meanwhile, the notice, the window stays; a gone dish: no window",
  async () => {
    const { files: written } = files();
    const running = openDishForm({ id: "d1" });
    const w = await windows.next();

    written[DISHES] = JSON.stringify({ d1: { ...DISH, name: "Oat porridge" } });
    await w.submit();
    assert.equal(Notice.last, "✦ dish could not be saved. Open it again to edit.");
    assert.equal(windows.all.includes(w), true);
    await w.close();
    assert.equal(await running, null);

    assert.equal(await openDishForm({ id: "d7" }), null);
    assert.equal(Notice.last, "✦ that dish is gone");
    assert.equal(windows.all.length, 0);
  });

test("Or: «Instead of …», a table of Product and Amount; OK gives the lines with a product",
  async t => {
    const { files: written } = files();
    const running = openDishForm({ id: "d1" });
    const w = await windows.next();

    await picks(w, 0)[1].trigger("click");
    const alt = await windows.next();

    assert.equal(alt.title, "Instead of oats");
    assert.deepEqual(names(alt), ["Products"]);
    assert.deepEqual(head(alt), ["Product", "Amount", ""]);
    assert.deepEqual(picks(alt, 0).map(p => p.text()), ["cocoa"]);
    assert.equal(lines(alt)[0].find("input").element.value, "2 tsp");
    assert.equal(alt.wrapper.find(".ui-window__submit").text(), "OK");

    await alt.wrapper.find(".ui-field-list__more button").trigger("click");
    await alt.wrapper.find(".ui-field-list__more button").trigger("click");
    t.mock.method(Search, "pick", async (_app, _title, find) => find("").find(p => p.id === "m2"));
    await picks(alt, 1)[0].trigger("click"); await new Promise(r => setTimeout(r));
    await lines(alt)[1].find("input").setValue(" 1 glass ");
    await alt.submit();   // the third line has no product: dropped

    assert.equal(picks(w, 0)[1].text(), "cocoa + milk");
    await w.submit();
    assert.equal(await running, "d1");
    assert.deepEqual(dish(written, "d1").ingredients[0].alt,
      [{ item: "m3", amount: "2 tsp" }, { item: "m2", amount: "1 glass" }]);
    assert.deepEqual(DISH.ingredients[0].alt, [{ item: "m3", amount: "2 tsp" }]);
  });

test("Instead of …: closed, the line keeps its alternatives", async () => {
  files();
  const running = openDishForm({ id: "d1" });
  const w = await windows.next();

  await picks(w, 0)[1].trigger("click");
  await (await windows.next()).close();
  assert.equal(picks(w, 0)[1].text(), "cocoa");
  await w.close();
  await running;
});

test("To the shopping list?: the dish, a fixed table (Buy, Product, Amount): main lines ticked, "
  + "alternatives (↳) not; amounts editable; Add puts the ticked ones", async () => {
  const { files: written } = files();
  const [d] = (await loadRecipes()).dishes;
  const running = openCart(d);
  const w = await windows.next();

  assert.equal(w.title, "To the shopping list?");
  assert.deepEqual(names(w), ["Dish", "Products"]);
  assert.equal(w.wrapper.find(".ui-field__control .ui-field__label").text(), "Porridge");
  assert.deepEqual(head(w), ["Buy", "Product", "Amount"]);
  assert.equal(w.wrapper.find(".ui-field-list__more").exists(), false);
  assert.deepEqual(lines(w).map(l => [l.find("input[type=checkbox]").element.checked,
    l.find(".ui-field__label").text(), l.find("input:not([type=checkbox])").element.value]),
  [[true, "oats", "1 cup"], [false, "↳ cocoa", "2 tsp"], [true, "milk", ""]]);
  assert.equal(lines(w)[0].find("input:not([type=checkbox])").attributes("placeholder"), "500 г");
  assert.equal(w.wrapper.find(".ui-window__submit").text(), "Add");

  await lines(w)[1].find("input[type=checkbox]").setValue(true);
  await lines(w)[2].find("input[type=checkbox]").setValue(false);
  await lines(w)[0].find("input:not([type=checkbox])").setValue("2 cups");
  await w.submit();

  assert.deepEqual(await running, { added: 2, joined: 0 });
  assert.deepEqual(written[`${MARKET}.md`].trim().split("\n"),
    ["- [ ] m1 [need:: Porridge · 2 cups]", "- [ ] m3 [need:: Porridge · 2 tsp]"]);
  assert.match(Notice.last, /2 → Celestial Market/);
  assert.equal(d.ingredients[0].amount, "1 cup");   // the dish given is not changed
});

test("To the shopping list?: nothing ticked, the notice, nothing added", async () => {
  const { files: written } = files();
  const [d] = (await loadRecipes()).dishes;
  const running = openCart(d);
  const w = await windows.next();

  for (const l of lines(w)) await l.find("input[type=checkbox]").setValue(false);
  await w.submit();
  assert.match(Notice.last, /nothing ticked/);
  assert.equal(written[`${MARKET}.md`], "");
  await w.close();
  assert.equal(await running, null);
});

test("the dish form offers active products and keeps stored ingredients when only the name changes", async () => {
  const { files: written } = files();
  written[MARKET_RECORDS] = JSON.stringify({ ...ITEMS, m3: { ...ITEMS.m3, deleted: true } });
  const running = openDishForm({ id: "d1" });
  const w = await windows.next();

  assert.deepEqual([...w.props.products.keys()], ["m1", "m2"]);
  await w.wrapper.find("input").setValue("Weekend porridge");
  await w.submit();
  assert.equal(await running, "d1");
  assert.deepEqual(dish(written, "d1"), { ...DISH, name: "Weekend porridge" });
});
