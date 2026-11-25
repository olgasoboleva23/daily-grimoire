// Recipe writes, product lookup and shopping-list writes against an in-memory vault.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDish, editDish, loadRecipes, productsToList, readDish, readProducts,
  removeDish,
} from "#/controllers/dishes.js";
import {
  addToMarket, editMarketItem, loadCelestialMarket, readMarketItem,
} from "#/controllers/widgets/market.js";
import { loadFood } from "#/controllers/food.js";
import { Search } from "#/components/uikit/Search/index.ts";
import { pickRecipeNote } from "#/components/windows/recipes/DishFormWindow/pickRecipeNote.js";
import { Notice } from "obsidian";
import { foodChoices, foodWeek } from "#/models/food.js";
import { DISHES, FOOD_DATA, FOOD_LOG, MARKET_NOTE, MARKET_RECORDS } from "#/shared/config/index.js";
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

test("a dish joins products in ingredient order and counts each mark once", async () => {
  const { files } = fixture();
  const data = await loadRecipes();
  assert.deepEqual(data.dishes[0].marks, ["a", "b"]);
  assert.deepEqual(data.dishes[0].ingredients.map(i => i.name), ["Peas", "Beans"]);
  const date = "2026-11-20", log = { [date]: { eaten: ["d1", "m1", "d8"] } };
  const [day] = foodWeek({ ...await loadFood(), log, days: [date], journals: [], courses: [] });
  assert.deepEqual(day.counts, { a: 2, b: 1 });
  assert.deepEqual(day.items.map(i => [i.kind, i.name]),
    [["dish", "Soup"], ["item", "Peas"], ["dish", "d8"]]);
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

test("dish writes allocate distinct IDs, reject bad links and reserve logged IDs", async () => {
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

test("manual and recipe additions share an open row and keep purchases", async () => {
  const { files } = fixture();
  const history = "- [x] m1 [completion:: 2026-11-20]\n";

  files[MARKET_NOTE] = history;
  const results = await Promise.all([
    addToMarket("Peas", "food", "m1"),
    productsToList([{ item: "m1", dish: "Soup", amount: "200 g" }]),
  ]);

  assert.deepEqual(results, [true, { added: 0, joined: 1 }]);
  assert.equal(files[MARKET_NOTE], history + "- [ ] m1 [need:: Soup · 200 g]\n");
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

test("a new dish stores product IDs and the selected note path", async () => {
  const { files } = fixture();
  files["Steps.md"] = "Mix";
  const id = await addDish({ ...dish, name: " Stew ", link: "Steps.md" });

  assert.deepEqual(await readDish(id), {
    name: "Stew", type: "", ingredients, link: "Steps.md",
  });
});

test("a recipe note can be created from the dish title and linked to the dish",
  async t => {
    const { files } = fixture();
    files["Old.md"] = "x";
    const seen = [];
    t.mock.method(Search, "pick", async (_app, _title, choices) => {
      seen.push(choices("").map(c => c.isNew ? `+ ${c.name}` : c.path).slice(0, 1));
      seen.push(choices("").some(c => c.path === "Old.md"));
      seen.push(choices("Borscht")[0].name);
      return choices("")[0];
    });

    const link = await pickRecipeNote("Stew");
    const id = await addDish({ ...dish, name: "Stew", link });
    const path = `${KINDS.recipe.folder}/Stew.md`;

    assert.deepEqual(seen, [["+ Stew"], true, "Borscht"]);
    assert.match(files[path], /type: recipe/);
    assert.match(files[path], /## Steps/);
    assert.equal(JSON.parse(files[DISHES])[id].link, path);
  });

test("dishes keep their type across edits while it is hidden in settings", async () => {
  const { applyConfig } = await import("#/shared/config/index.js");
  const { files } = fixture();
  files["Steps.md"] = "Mix";
  const id = await addDish({ ...dish, type: " soup ", link: "Steps.md" });
  const displayed = async () => (await loadRecipes()).dishes.find(d => d.id === id).type;
  assert.equal(await displayed(), "soup");
  try {
    applyConfig({ dishTypes: [] });
    assert.equal(await displayed(), "");
    const before = JSON.stringify(await readDish(id));
    assert.equal(await editDish(id, { ...dish, name: "Renamed", type: "", link: "Steps.md" }, {
      before, offeredTypes: [],
    }), true);
    assert.equal(JSON.parse(files[DISHES])[id].type, "soup");
  } finally { applyConfig(); }
  assert.equal(await displayed(), "soup");
  const before = JSON.stringify(await readDish(id));
  const offeredTypes = ["soup", "main", "dessert"];
  assert.equal(await editDish(id, { ...dish, name: "Renamed", type: "main" }, {
    before, offeredTypes,
  }), true);
  assert.equal(await displayed(), "main");
  assert.equal(JSON.parse(files[DISHES])[id].link, "");
  assert.equal(await editDish(id, dish), true);
  assert.equal(JSON.parse(files[DISHES])[id].type, "");
});

test("readProducts returns current names and marks for food records only", async () => {
  const { files } = fixture();
  const records = JSON.parse(files[MARKET_RECORDS]);
  records.m4 = { name: "Mint", type: "food" };
  files[MARKET_RECORDS] = JSON.stringify(records);
  const before = await readMarketItem("m1");

  assert.equal(await editMarketItem("m1", { ...before, name: "Green peas" }, before), true);
  assert.deepEqual(await readProducts(), [
    { id: "m1", name: "Green peas", marks: ["a"] },
    { id: "m2", name: "Beans", marks: ["a", "b"] },
    { id: "m4", name: "Mint", marks: [] },
  ]);
  assert.deepEqual((await readDish("d1")).ingredients, ingredients);
});

test("an ingredient stores alternatives with separate amounts and can clear them", async () => {
  const { files } = fixture();
  const line = { item: "m1", amount: " 2 ",
    alt: [{ item: "m2", amount: " 3 " }, { amount: "1" }, { item: "m4", amount: "a pinch" }] };
  const id = await addDish({ ...dish, ingredients: [line] });
  const alt = [{ item: "m2", amount: "3" }, { item: "m4", amount: "a pinch" }];
  const stored = () => JSON.parse(files[DISHES])[id].ingredients;
  assert.deepEqual(stored(), [{ item: "m1", amount: "2", alt }]);
  await editDish(id, { ...dish, ingredients: [{
    ...line, alt: [{ item: "m2", amount: " 7 " }, { item: "m4", amount: " 1 " }],
  }] });
  assert.deepEqual(stored()[0].alt, [{ item: "m2", amount: "7" }, { item: "m4", amount: "1" }]);
  assert.equal(line.alt[0].amount, " 3 ");
  await editDish(id, { ...dish, ingredients: [{ ...line, alt: [{ amount: "1" }] }] });
  assert.deepEqual(stored(), [{ item: "m1", amount: "2" }]);
  const loaded = (await loadRecipes()).dishes.find(d => d.id === id);
  assert.deepEqual(loaded.ingredients[0].alt, []);
});

test("editDish rejects a stale record and keeps the newer ingredients", async () => {
  const { files } = fixture();
  const updated = { ...dish, ingredients: [{ item: "m1", amount: "200 g" }] };
  const initial = await readDish("d1");
  const before = JSON.stringify(initial);

  assert.equal(await editDish("d1", updated), true);
  const saved = files[DISHES];
  assert.equal(await editDish("d1", { ...initial, name: "Renamed" }, { before }), false);
  assert.equal(files[DISHES], saved);
  assert.match(Notice.last, /dish could not be saved/);
});
