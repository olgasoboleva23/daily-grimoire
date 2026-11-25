import "./stubs/dom.mjs";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import { COURSES, DISHES, FOOD_DATA, FOOD_LOG, JOURNALS, MARKET_RECORDS } from "#/shared/config/index.js";
import { forFood } from "#/entities/course/index.js";

let mount, FoodPage, loadFood, DEFAULT_MARKS, Search, testWindows;
before(async () => {
  window.moment = () => ({ format: () => "2026-11-04" });   // a Wednesday
  ({ mount } = await import("@vue/test-utils"));
  FoodPage = (await import("#/components/pages/food/index.vue")).default;
  ({ loadFood } = await import("#/controllers/food.js"));
  ({ DEFAULT_MARKS } = await import("#/entities/food-log/index.js"));
  ({ Search } = await import("#/shared/ui/Search/index.ts"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
});
const tick = () => new Promise(r => setTimeout(r));
const LOG = { "2026-11-02": { eaten: ["m1", "m2", "d1"], note: "сыпь" } };
// a course as courses.json keeps it (made-up)
const REC = {
  start: "2026-11-02", meds: [{ name: "мастодинон", code: "МА", times: ["morning", "evening"], ranges: [{ from: 1, to: 2 }] }],
  notes: "", marks: { "2026-11-03": { "МА🌙": "✅" } }, dayNotes: {},
};
const data = () => ({
  today: "2026-11-04", marks: DEFAULT_MARKS, log: LOG,
  items: [{ id: "m1", name: "каша с 4 ч", type: "food", marks: ["m1"] },
    { id: "m2", name: "кофе с бзм", type: "food", marks: ["m3"] }],
  dishes: [{ id: "d1", name: "оладьи", ingredients: [{ item: "m1", amount: "" }], link: "" }],
  journals: [{ path: `${JOURNALS}/Высыпания.md`, name: "Высыпания", lag: 1, entries: new Map([["2026-11-03", { level: 2, reasons: ["🍰"] }]]) }],
  courses: [forFood("c1", REC)],
});

test("the food page: the week, a row a day: what was eaten with its marks, the marks counted, the journal the next day, the course, the note", async () => {
  const went = [];
  const w = mount(FoodPage, { props: { state: { data: data() } }, global: {
    provide: { ui: { go: (...args) => went.push(args) } },
  } });
  const rows = w.findAll(".ui-table__row");

  assert.equal(rows.length, 7);
  assert.match(w.find(".ui-food__week").text(), /2 ноя – 8 ноя/);
  const mon = rows[0];

  assert.deepEqual(mon.findAll(".ui-food__item-name").map(i => i.text()),
    ["каша с 4 ч 🍫", "кофе с бзм 🥛↓", "🍲 оладьи 🍫"]);
  assert.deepEqual(mon.findAll(".ui-food__count").map(c => c.text()), ["2", "", "1"]);
  assert.equal(mon.find(".ui-food__level").text(), "2");   // Высыпания on the 3rd
  assert.ok(w.findAll(".ui-table__head").map(h => h.text()).includes("Высыпания +1д"));   // the next day's, said in its head
  assert.equal(mon.find(".ui-food__course").text(), "💊");
  await mon.find(".ui-food__course").trigger("click");
  await mon.find(".ui-food__course").trigger("click", { mod: true });
  assert.deepEqual(went.map(([page, params, e]) => [page, params, !!e.mod]),
    [["meds", {}, false], ["meds", {}, true]]);
  assert.equal(mon.find(".ui-food__med").text(), "МА");
  assert.equal(mon.find(".ui-food__med").attributes("aria-label"), "мастодинон: не принято");
  assert.ok(mon.find(".ui-food__med").classes().includes("ui-food__med--not"));   // no ✅ that day
  assert.ok(!rows[1].find(".ui-food__med").classes().includes("ui-food__med--not"));
  assert.equal(rows[2].find(".ui-food__course").exists(), false);   // the course is over
  assert.equal(mon.find(".ui-food__note input").element.value, "сыпь");
  assert.ok(rows[2].classes().includes("ui-food__row--today"));
});

test("the food page: ‹ › step a week; × takes an eaten one off; a note typed is written", async () => {
  const { files } = vault({ [FOOD_LOG]: JSON.stringify(LOG) });
  const day = date => JSON.parse(files[FOOD_LOG])[date];
  const w = mount(FoodPage, { props: { state: { data: data() } } });

  await w.find(".ui-food__prev").trigger("click");
  assert.match(w.find(".ui-food__week").text(), /26 окт – 1 ноя/);
  await w.find(".ui-food__next").trigger("click");
  await w.findAll(".ui-table__row")[0].findAll(".ui-food__off")[1].trigger("click"); await tick();
  assert.deepEqual(day("2026-11-02"), { eaten: ["m1", "d1"], note: "сыпь" });
  const input = w.findAll(".ui-table__row")[1].find(".ui-food__note input");

  input.element.value = "ок";
  await input.trigger("change"); await tick();
  assert.deepEqual(day("2026-11-03"), { eaten: [], note: "ок" });
});

test("loadFood: the foods and marks, the log, the journals, the medication courses", async () => {
  vault({
    [FOOD_DATA]: JSON.stringify({ marks: [{ tag: "m1", icon: "🍫", name: "какао" }] }),
    [MARKET_RECORDS]: JSON.stringify({ m1: { name: "чай", type: "food" }, m2: { name: "мыло", type: "care" } }),
    [DISHES]: JSON.stringify({ d1: { name: "чай с мёдом", ingredients: [{ item: "m1", amount: "" }], link: "" } }),
    [FOOD_LOG]: JSON.stringify(LOG), [`${JOURNALS}/Высыпания.md`]: "- 2026-11-03 1\n",
    [COURSES]: JSON.stringify({ c1: { ...REC, marks: { "2026-11-02": { "МА🌙": "✅" }, "2026-11-03": { "МА🌙": "❌" } } } }),
  }, { props: { [`${JOURNALS}/Высыпания.md`]: { lag: 1 } } });
  const d = await loadFood();

  assert.deepEqual(d.items, [{ id: "m1", name: "чай", type: "food", marks: [] }]);
  assert.deepEqual(d.dishes.map(x => x.id), ["d1"]);
  assert.deepEqual(d.marks.map(m => m.icon), ["🍫"]);
  assert.deepEqual(d.log, LOG);
  assert.deepEqual([d.journals[0].name, d.journals[0].lag], ["Высыпания", 1]);
  assert.deepEqual(d.courses.map(({ taken, ...c }) => c), [{ id: "c1", name: "мастодинон", start: "2026-11-02", days: 2, meds: [{ code: "МА", name: "мастодинон", days: 2, ranges: [{ from: 1, to: 2 }] }] }]);
  assert.deepEqual([...d.courses[0].taken], [["2026-11-02", new Set(["МА"])], ["2026-11-03", new Set()]]);   // a ✅ that day (❌ isn't one)
});

test("the food page: a training task adds a 🏋 column, ✓ on the days it was done", () => {
  const w = mount(FoodPage, { props: { state: { data: { ...data(), task: { id: "t5", name: "gym", days: new Set(["2026-11-02"]) } } } } });
  const rows = w.findAll(".ui-table__row");

  assert.ok(w.findAll(".ui-table__head").map(h => h.text()).includes("🏋"));
  assert.equal(rows[0].find(".ui-food__trained").text(), "✓");
  assert.equal(rows[1].find(".ui-food__trained").text(), "");
});

test("loadFood: no files yet: the default marks, nothing eaten, no task", async () => {
  vault();
  const d = await loadFood();

  assert.deepEqual([d.marks, d.items, d.dishes, d.log, d.courses, d.task],
    [DEFAULT_MARKS, [], [], {}, [], null]);
});

test("setFoodNote, removeEaten: one day of log.json changed", async () => {
  const { files } = vault({ [FOOD_LOG]: JSON.stringify(LOG) });
  const { removeEaten, setFoodNote } = await import("#/entities/food-log/index.js");

  await setFoodNote("2026-11-02", " пятна ");
  assert.equal(JSON.parse(files[FOOD_LOG])["2026-11-02"].note, "пятна");
  await removeEaten("2026-11-02", 1);
  assert.deepEqual(JSON.parse(files[FOOD_LOG])["2026-11-02"].eaten, ["m1", "d1"]);
});

test("saveMarks trims the values, assigns a tag and preserves the training task", async () => {
  const FOOD = { marks: [{ tag: "m2", icon: "🥛", name: "молоко" }], task: "t5" };
  const { files } = vault({ [FOOD_DATA]: JSON.stringify(FOOD) });
  const { saveMarks } = await import("#/entities/food-log/index.js");

  await saveMarks([...FOOD.marks, { icon: " 🍓 ", name: " ягоды " }]);
  assert.deepEqual(JSON.parse(files[FOOD_DATA]), {
    ...FOOD, marks: [...FOOD.marks, { tag: "m3", icon: "🍓", name: "ягоды" }],
  });
});

test("logEaten appends a serving and keeps the day's note", async () => {
  const { files } = vault({ [FOOD_LOG]: JSON.stringify(LOG) });
  const { logEaten } = await import("#/entities/food-log/index.js");
  const date = "2026-11-02";

  await logEaten(date, "m1");
  assert.deepEqual(JSON.parse(files[FOOD_LOG])[date], {
    eaten: [...LOG[date].eaten, "m1"], note: LOG[date].note,
  });
});

test("the food page: a dish eaten opens its window, a product its Edit item window", async () => {
  vault({
    [MARKET_RECORDS]: JSON.stringify({ m1: { name: "каша с 4 ч", type: "food" } }),
    [DISHES]: JSON.stringify({ d1: data().dishes[0] }),
  });
  const windows = testWindows();

  try {
    const w = mount(FoodPage, { props: { state: { data: data() } } });
    const [porridge, , pancakes] = w.findAll(".ui-table__row")[0].findAll(".ui-food__item-name");

    await pancakes.trigger("click"); await tick();
    assert.equal(windows.all.length, 1);
    const dish = await windows.next();
    assert.equal(dish.title, "🍲 оладьи");
    assert.deepEqual(dish.props, { dish: "d1" });
    await dish.close();

    await porridge.trigger("click");
    const edit = await windows.next();

    assert.equal(edit.title, "Edit item");
    assert.equal(edit.props.id, "m1");
    await edit.close();
  } finally { windows.restore(); }
});

test("the food page: ⚙ opens ✦ Marks with the marks of food.json", async () => {
  const marks = [{ tag: "m1", icon: "🍫", name: "какао" }];
  const windows = testWindows();

  vault({ [FOOD_DATA]: JSON.stringify({ marks }) });
  try {
    const w = mount(FoodPage, { props: { state: { data: data() } } });

    await w.find('[aria-label="the marks"]').trigger("click");
    const edit = await windows.next();

    assert.equal(edit.title, "✦ Marks");
    assert.deepEqual(edit.props, { marks });
    await edit.close();
  } finally { windows.restore(); }
});

test("＋ on a day: the search of products and dishes; one picked is logged, a new product " +
  "or dish first gets its window", async t => {
  const { files } = vault({
    [MARKET_RECORDS]: JSON.stringify({ m1: { name: "Peas", type: "food" } }),
    [DISHES]: JSON.stringify({ d1: { name: "Soup", ingredients: [{ item: "m1", amount: "" }],
      link: "" } }),
    [FOOD_LOG]: JSON.stringify({}),
  });
  const windows = testWindows(), logged = () => JSON.parse(files[FOOD_LOG])["2026-11-02"].eaten;
  const answers = [
    hits => hits.find(c => c.kind === "dish"), hits => hits.find(c => c.create === "product"),
    hits => hits.find(c => c.create === "dish"),
  ];

  t.mock.method(Search, "pick", async (_app, title, find) => {
    assert.equal(title, "What was eaten…");
    const hits = find("Peas");

    assert.deepEqual(hits.slice(-2).map(c => c.create), ["product", "dish"]);
    return answers.shift()(hits);
  });
  try {
    const w = mount(FoodPage, { props: { state: { data: data() } } });
    const add = () => w.findAll(".ui-table__row")[0].find('[aria-label="add what was eaten"]');

    await add().trigger("click"); await tick(); await tick();
    assert.deepEqual(logged(), ["d1"]);
    await add().trigger("click");
    const product = await windows.next();

    assert.equal(product.title, "New product");
    await product.submit(); await tick();
    assert.deepEqual(logged(), ["d1", "m2"]);
    await add().trigger("click");
    const dish = await windows.next();

    assert.equal(dish.title, "New dish");
    assert.equal(dish.wrapper.find("input").element.value, "Peas");
    await dish.close(); await tick();
    assert.deepEqual(logged(), ["d1", "m2"]);
  } finally { windows.restore(); }
});

test("an archived dish keeps its name and marks on eaten days and is omitted from the picker", async t => {
  vault({
    [MARKET_RECORDS]: JSON.stringify({ m1: { name: "Свёкла", type: "food", marks: ["m1"] } }),
    [DISHES]: JSON.stringify({ d1: { name: "Борщ", ingredients: [{ item: "m1" }], deleted: true } }),
    [FOOD_LOG]: JSON.stringify({ "2026-11-02": { eaten: ["d1"] } }),
  });
  const w = mount(FoodPage, { props: { state: { data: await loadFood() } } });
  const day = w.findAll(".ui-table__row")[0];

  assert.match(day.text(), /Борщ \(deleted\) 🍫/);
  assert.equal(day.find(".ui-food__count").text(), "1");
  let choices;
  t.mock.method(Search, "pick", async (_app, _title, find) => { choices = find(""); });
  await day.find('[aria-label="add what was eaten"]').trigger("click");
  await tick();
  assert.deepEqual(choices.map(c => c.name), ["Свёкла"]);
});
