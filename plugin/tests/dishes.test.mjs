import { test } from "node:test";
import assert from "node:assert/strict";
import { addDish, askDish, dishToList, editDish, loadRecipes, removeDish } from "#/controllers/dishes.js";
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

test("dishToList counts only actual additions, including concurrent clicks", async () => {
  const { files } = fixture();
  assert.deepEqual((await Promise.all([dishToList("d1"),dishToList("d1")])).sort(), [0,1]);
  assert.equal(files[MARKET_NOTE].trim(), "- [ ] m1\n- [ ] m2");
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
