// Recipe storage, ingredient selection and shopping-list writes against an in-memory vault.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDish, askDish, editDish, loadRecipes, productsToList, removeDish,
} from "#/controllers/dishes.js";
import { loadCelestialMarket } from "#/controllers/widgets/market.js";
import { addEaten, loadFood } from "#/controllers/food.js";
import { Search } from "#/components/uikit/Search/index.ts";
import { Form } from "#/components/uikit/Form/index.ts";
import { foodChoices, foodWeek } from "#/models/food.js";
import { DISHES, FOOD_DATA, FOOD_LOG, MARKET_NOTE, MARKET_RECORDS } from "#/helpers/paths.js";
import { KINDS } from "#/models/kinds.js";
import { vault } from "./stubs/vault.mjs";

globalThis.window = { moment: () => ({ format: () => "2026-11-20" }) };

const ingredients = [{ item: "m1", amount: "2" }, { item: "m2", amount: "" }];
const dish = { name: "Soup", ingredients, link: "" };
const fixture = () => vault({
  [MARKET_RECORDS]: JSON.stringify({ m1: { name: "Peas", type: "food", marks: ["a"] },
    m2: { name: "Beans", type: "food", marks: ["a", "b"] }, m3: { name: "Glue", type: "home" } }),
  [FOOD_DATA]: JSON.stringify({ marks: [{ tag: "a", icon: "A" }, { tag: "b", icon: "B" }] }),
  [DISHES]: JSON.stringify({ d1: dish }),
  [MARKET_NOTE]: "- [ ] m1\n",
});

test("a dish joins products in ingredient order, shares each mark once and counts in the week", async () => {
  const { files } = fixture();
  const data = await loadRecipes();
  assert.deepEqual(data.dishes[0].marks, ["a", "b"]);
  assert.deepEqual(data.dishes[0].ingredients.map(i => i.name), ["Peas", "Beans"]);
  const date = "2026-11-20", log = { [date]: { eaten: ["d1", "m1", "d8"] } };
  const [day] = foodWeek({ ...await loadFood(), log, days: [date], journals: [], courses: [] });
  assert.deepEqual(day.counts, { a: 2, b: 1 });
  assert.deepEqual(day.items.map(i => [i.kind, i.name]), [["dish","Soup"], ["item","Peas"], ["dish","d8"]]);
  files[MARKET_RECORDS] = "{}";
  const missing = (await loadRecipes()).dishes[0];
  assert.equal(missing.missing, true);
  assert.equal(missing.ingredients[0].name, "m1");
});

test("choices sort mixed food by recent date, distinct log days, then name", async () => {
  fixture();
  const data = await loadFood();
  const log = Object.fromEntries([
    ["2026-11-20", ["m1"]], ["2026-11-14", ["m2"]], ["2026-11-12", ["d1","d1"]],
  ].map(([day, eaten]) => [day, { eaten }]));
  const choices = () => foodChoices({ ...data, today:"2026-11-20", log });
  assert.deepEqual(choices().map(c => [c.id,c.recent]), [["m1",true],["m2",true],["d1",false]]);
  assert.deepEqual(choices()[2].ingredients, ["Peas","Beans"]);
  assert.equal(choices()[2].icons,"AB");
  delete log["2026-11-20"]; delete log["2026-11-14"];
  log["2026-11-10"] = { eaten: ["m2"] };
  assert.deepEqual(choices().map(c => c.id), ["m2","d1","m1"]);
});

test("concurrent dish adds use distinct ids; invalid links preserve data; logged ids survive deletion", async () => {
  const { files } = fixture();
  delete files[DISHES];
  const ids = await Promise.all([addDish(dish), addDish(dish)]);
  assert.deepEqual(ids, ["d1","d2"]);
  assert.equal(await editDish("d1", { ...dish, link: "gone.md" }), false);
  assert.equal(await addDish({ ...dish, link: "bad.txt" }), null);
  files[FOOD_LOG] = '{"2026-11-10":{"eaten":["d2"]}}';
  assert.equal(await removeDish("d2"), true);
  assert.equal(await addDish(dish), "d3");
});

test("market amounts are merged by product and kept by dish across concurrent clicks", async () => {
  const { files } = fixture();
  files[MARKET_NOTE] = "## Shopping\r\n- [ ] m1\r\n- [x] m2 [completion:: 2026-11-20]\r\n";
  const stew = { item: "m1", amount: "900 g", dish: "Stew [large]" };
  const side = { item: "m2", amount: "", dish: "Side" };
  const results = await Promise.all([
    productsToList([stew, stew, side, { ...side, item: "m3" }, { ...side, item: "m99" }]),
    productsToList([{ ...stew, dish: "Soup", amount: "400 g" }, side,
      { ...side, dish: "Salad", amount: "[to taste]" }]),
  ]);
  assert.deepEqual(results, [{ added: 1, joined: 1 }, { added: 0, joined: 2 }]);
  assert.deepEqual(await productsToList([stew, side]), { added: 0, joined: 0 });
  assert.deepEqual(await productsToList([]), { added: 0, joined: 0 });
  assert.equal(files[MARKET_NOTE], [
    "## Shopping", "- [ ] m1 [need:: Stew (large) · 900 g] [need:: Soup · 400 g]",
    "- [x] m2 [completion:: 2026-11-20]", "- [ ] m2 [need:: Side] [need:: Salad · (to taste)]", "",
  ].join("\r\n"));
  const rows = (await loadCelestialMarket()).groups.flatMap(g => g.rows);
  assert.deepEqual(rows.find(r => r.id === "m2").needs,
    [{ dish: "Side", amount: "" }, { dish: "Salad", amount: "(to taste)" }]);
});

test("a new shopping list keeps both amounts on its first product line", async () => {
  const { files } = fixture();
  delete files[MARKET_NOTE];
  const lines = [
    { item: "m1", dish: "Stew", amount: "4" }, { item: "m1", dish: "Soup", amount: "2" },
  ];
  assert.deepEqual(await productsToList(lines), { added: 1, joined: 0 });
  assert.equal(files[MARKET_NOTE], "- [ ] m1 [need:: Stew · 4] [need:: Soup · 2]\n");
});

test("dish form saves the picked products and the note path", async () => {
  const { app, files } = fixture();
  files["Steps.md"] = "Mix";
  const id = await askDish(app, {name:"Stew"}, async (_app, _title, rows, options) => {
    assert.equal(options.values.name,"Stew");
    assert.equal(rows.find(r => r.key === "ingredients").list[0].show("m1"), "Peas");
    return { ...dish, link:"Steps.md" };
  });
  assert.equal(JSON.parse(files[DISHES])[id].link, "Steps.md");
});

test("the food picker logs a selected dish and keeps its ingredients as product references", async t => {
  const { files } = fixture();
  t.mock.method(Search, "pick", async (_app, _title, choices) => {
    const hits = choices("Peas");
    assert.deepEqual(hits.slice(-2).map(choice => choice.create), ["product", "dish"]);
    return hits.find(choice => choice.kind === "dish");
  });

  await addEaten("2026-11-20");
  const data = await loadFood();
  assert.deepEqual(data.log["2026-11-20"].eaten, ["d1"]);
  assert.deepEqual(data.dishes[0].ingredients, ingredients);
  assert.deepEqual(data.items.map(item => item.id), ["m1", "m2"]);
  assert.equal(JSON.parse(files[DISHES]).d1.name, "Soup");
});

test("the dish form's note picker makes a recipe note named after the dish (or as typed)",
  async t => {
    const { app, files } = fixture();
    files["Old.md"] = "x";
    const seen = [];
    t.mock.method(Search, "pick", async (_app, _title, choices) => {
      seen.push(choices("").map(c => c.isNew ? `+ ${c.name}` : c.path).slice(0, 1));
      seen.push(choices("").some(c => c.path === "Old.md"));
      seen.push(choices("Borscht")[0].name);
      return choices("")[0];
    });

    const id = await askDish(app, { name: "Stew" }, async (_app, _title, rows) => {
      const note = rows.find(r => r.key === "link");

      assert.equal(note.show(`${KINDS.recipe.folder}/Pie.md`), "Pie");
      return { ...dish, name: "Stew", link: await note.pick({ name: "Stew" }) };
    });
    const path = `${KINDS.recipe.folder}/Stew.md`;

    assert.deepEqual(seen, [["+ Stew"], true, "Borscht"]);
    assert.match(files[path], /type: recipe/);
    assert.match(files[path], /## Steps/);
    assert.equal(JSON.parse(files[DISHES])[id].link, path);
  });

test("cooked and ordered dishes keep their own type across edits and settings changes", async () => {
  const { applyConfig } = await import("#/helpers/config.js");
  const { files, app } = fixture();
  files["Steps.md"] = "Mix";
  const id = await addDish({ ...dish, type: " soup ", link: "Steps.md" });
  const displayed = async () => (await loadRecipes()).dishes.find(d => d.id === id).type;
  assert.equal(await displayed(), "soup");
  try {
    applyConfig({ dishTypes: [] });
    assert.equal(await displayed(), "");
    const hidden = (await loadRecipes()).dishes.find(d => d.id === id);
    await askDish(app, hidden, async (_app, _title, _rows, { values }) =>
      ({ ...values, name: "Renamed" }));
    assert.equal(JSON.parse(files[DISHES])[id].type, "soup");
  } finally { applyConfig(); }
  assert.equal(await displayed(), "soup");
  const cooked = (await loadRecipes()).dishes.find(d => d.id === id);
  await askDish(app, cooked, async (_app, _title, rows, { values }) => {
    const field = rows[rows.findIndex(r => r.key === "ingredients") + 1];
    assert.equal(field.key, "type");
    assert.deepEqual(field.options.map(o => o.value), ["", "soup", "main", "dessert"]);
    assert.equal(values.type, "soup");
    return { ...values, link: "", type: "main" };
  });
  assert.equal(await displayed(), "main");
  assert.equal(JSON.parse(files[DISHES])[id].link, "");
  assert.equal(await editDish(id, dish), true);
  assert.equal(JSON.parse(files[DISHES])[id].type, "");
});

test("the dish form: a line's product opens its edit window (not the picker); the line shows the new name",
  async t => {
    const { app, files } = fixture();
    t.mock.method(Search, "pick", async () => assert.fail("no picker on a chosen product"));
    t.mock.method(Form, "ask", async (_app, title, _rows, { values }) => {
      assert.equal(title, "Edit item");
      return { ...values, name: "Green peas" };
    });

    await askDish(app, dish, async (_app, _title, rows) => {
      const product = rows.find(r => r.key === "ingredients").list[0];

      assert.equal(await product.pick({ item: "m1", amount: "2" }), "m1");
      assert.equal(product.show("m1"), "Green peas");
      return null;
    });
    assert.equal(JSON.parse(files[MARKET_RECORDS]).m1.name, "Green peas");
  });

test("an ingredient stores alternatives with separate amounts and can clear them", async () => {
  const { files } = fixture();
  const alt = [{ item: "m2", amount: "3" }, { item: "m4", amount: "a pinch" }];
  const line = { item: "m1", amount: "2", alt };
  const id = await addDish({ ...dish, ingredients: [line] });
  const stored = () => JSON.parse(files[DISHES])[id].ingredients;
  assert.deepEqual(stored(), [line]);
  await editDish(id, { ...dish, ingredients: [{ ...line, alt: [{ amount: "1" }] }] });
  assert.deepEqual(stored(), [{ item: "m1", amount: "2" }]);
  const loaded = (await loadRecipes()).dishes.find(d => d.id === id);
  assert.deepEqual(loaded.ingredients[0].alt, []);
});

test("the Or form edits a copy and can save several products, clear or cancel", async t => {
  const { app } = fixture();
  const alt = [{ item: "m2", amount: "3" }];
  t.mock.method(Search, "pick", async (_app, _title, choices) => choices("Lentils").at(-1));
  t.mock.method(Form, "ask", async (_app, _title, _rows, { values }) => values);
  let form;
  await askDish(app, dish, async (_app, title, rows, options) => {
    if (title.startsWith("Instead of")) return form(title, rows, options);
    const fields = rows.find(r => r.key === "ingredients").list;
    assert.deepEqual(fields.map(f => f.name), ["Product", "Or", "Amount"]);
    const or = fields[1];
    form = async (heading, [row], { values, submit }) => {
      assert.equal(heading, "Instead of Peas");
      assert.equal(submit, "OK");
      assert.equal(row.key, "alt");
      values.alt[0].amount = "7";
      values.alt.push({ item: await row.list[0].pick({}), amount: "1" }, { amount: "2" });
      return values;
    };
    const next = await or.pick({ item: "m1", alt });
    assert.deepEqual(next.map(a => a.amount), ["7", "1"]);
    assert.equal(or.show(next), "Beans + Lentils");
    assert.equal(alt[0].amount, "3");
    form = title => { assert.equal(title, "Instead of …"); return { alt: [] }; };
    assert.deepEqual(await or.pick({}), []);
    form = () => null;
    assert.equal(await or.pick({ item: "m1", alt }), null);
    return null;
  });
});

test("the dish form rejects changes made since it was opened", async () => {
  const { app, files } = fixture();
  const updated = { ...dish, ingredients: [{ item: "m1", amount: "200 g" }] };
  const initial = (await loadRecipes()).dishes[0];

  const saved = await askDish(app, initial, async (_app, _title, _rows, { values }) => {
    await editDish(initial.id, updated);
    return { ...values, name: "Renamed" };
  });

  assert.equal(saved, null);
  const current = JSON.parse(files[DISHES])[initial.id];
  assert.equal(current.name, dish.name);
  assert.deepEqual(current.ingredients, updated.ingredients);
});
