import "./stubs/dom.mjs";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import { MARKET, MARKET_RECORDS } from "#/shared/config/index.js";
import { Notice } from "obsidian";

let mount, View, AddButton, Search, testWindows;
// the note: green tea on line 3, rice on line 5
const NOTE = "# Market\n\n## 🌿 Harvest\n- [ ] m1\n\n- [ ] m2\n";
before(async () => {
  window.moment = () => ({ format: () => "2026-11-05" });
  ({ mount } = await import("@vue/test-utils"));
  View = (await import("#/components/pages/dashboard/widgets/market/index.vue")).default;
  AddButton = (await import("#/components/pages/dashboard/widgets/market/CelestialMarketAdd.vue"))
    .default;
  ({ Search } = await import("#/components/uikit/Search/index.ts"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
});
const data = {
  empty: false, left: "2 items left", soon: "salt",
  groups: [{ label: "🌿 Harvest", rows: [{ line: 3, id: "m1", name: "green tea" }, { line: 5, id: "m2", name: "rice" }] }],
};

test("Celestial Market: items by group, what runs low, how many are left", () => {
  const text = mount(View, { props: { state: { data } } }).text();
  for (const s of ["🌿 Harvest", "green tea", "rice", "running low soon: salt", "2 items left"]) assert.match(text, new RegExp(s));
});

test("✓ sparkles the row at once and writes it as bought after the sparkle, once", async () => {
  const { files } = vault({ [`${MARKET}.md`]: NOTE });
  const w = mount(View, { props: { state: { data } } });
  const tea = w.findAll(".ui-market__item")[0];
  await tea.find('[aria-label="bought"]').trigger("click");
  await tea.find('[aria-label="bought"]').trigger("click");
  assert.ok(tea.classes().includes("ui-market__item--bought"));
  assert.equal(files[`${MARKET}.md`], NOTE);
  await new Promise(r => setTimeout(r, 700));
  assert.equal(files[`${MARKET}.md`], NOTE.replace("- [ ] m1", "- [x] m1 [completion:: 2026-11-05]"));
});

test("Celestial Market's note missing: Create …", () => {
  const w = mount(View, { props: { state: { data: { missing: true, path: "x/Celestial Market.md" } } } });
  assert.equal(w.text(), "✦ Create x/Celestial Market.md");
});

test("a bought item back on the list can be bought again; a line that changed meanwhile lets go of the row", async () => {
  const { reactive, nextTick } = await import("vue");
  const state = reactive({ data });
  const { files } = vault({ [`${MARKET}.md`]: NOTE });
  const w = mount(View, { props: { state } });
  await w.findAll(".ui-market__item")[0].find('[aria-label="bought"]').trigger("click");
  await new Promise(r => setTimeout(r, 700));
  // written: the list comes back without it, then with it again (unticked in the note)
  state.data = { ...data, groups: [{ label: "🌿 Harvest", rows: [{ line: 5, id: "m2", name: "rice" }] }] }; await nextTick();
  state.data = data; await nextTick();
  const tea = () => w.findAll(".ui-market__item")[0];
  assert.ok(!tea().classes().includes("ui-market__item--bought"));
  files[`${MARKET}.md`] = NOTE.replace("m1", "m3");   // the line changed meanwhile: nothing written
  await tea().find('[aria-label="bought"]').trigger("click");
  await new Promise(r => setTimeout(r, 700)); await nextTick();
  assert.match(files[`${MARKET}.md`], /- \[ \] m3/);
  assert.match(String(Notice.last), /changed meanwhile/);
  assert.ok(!tea().classes().includes("ui-market__item--bought"));   // free again
});

test("🗑: a tapped name shows it; armed by the first click, the second takes the line off unbought",
  async () => {
    const { nextTick } = await import("vue");
    const { files } = vault({ [`${MARKET}.md`]: NOTE });
    const w = mount(View, { props: { state: { data } } });
    const tea = () => w.findAll(".ui-market__item")[0];

    await tea().find(".ui-market__text").trigger("click");
    assert.ok(tea().classes().includes("ui-market__item--open"));
    await tea().find(".ui-market__del").trigger("click");
    assert.ok(tea().find(".ui-market__del").classes().includes("ui-del--armed"));
    assert.equal(tea().find(".ui-market__del").text(), "✓?");
    assert.equal(files[`${MARKET}.md`], NOTE);
    await tea().find(".ui-market__del").trigger("click");
    await new Promise(r => setTimeout(r)); await nextTick();
    assert.equal(files[`${MARKET}.md`], "# Market\n\n## 🌿 Harvest\n\n- [ ] m2\n");
  });

test("a row's amounts: one shows after the name, several a ⚖ count; a tap on the name lists them",
  async () => {
    const rows = [
      { line: 3, id: "m1", name: "chicken thigh", needs: [
        { dish: "Pilaf", amount: "900 g" }, { dish: "Soup", amount: "400 g" }] },
      { line: 5, id: "m2", name: "rice", needs: [{ dish: "Pilaf", amount: "2 cups" }] },
      { line: 6, id: "m3", name: "salt", needs: [{ dish: "Soup", amount: "" }] },
      { line: 7, id: "m4", name: "tea", needs: [] },
    ];
    const w = mount(View, { props: { state: { data: { ...data, groups: [{ label: "x", rows }] } } } });
    const items = w.findAll(".ui-market__item");
    const need = i => items[i].find(".ui-market__need");

    assert.equal(need(0).text(), "⚖2");
    assert.equal(need(1).text(), "2 cups");
    assert.equal(need(2).exists(), false);
    assert.equal(need(3).exists(), false);
    assert.equal(items[0].find(".ui-market__needs").exists(), false);
    await items[0].find(".ui-market__text").trigger("click");
    assert.deepEqual(w.findAll(".ui-market__item")[0].findAll(".ui-market__needs li")
      .map(l => l.text()), ["Pilaf — 900 g", "Soup — 400 g"]);
    await items[2].find(".ui-market__text").trigger("click");
    assert.deepEqual(w.findAll(".ui-market__item")[2].findAll(".ui-market__needs li")
      .map(l => l.text()), ["Soup"]);
  });

test("✎ opens the item's Edit item window; ＋ the search of items, a new one its Category",
  async t => {
    const windows = testWindows();
    const { files } = vault({ [MARKET_RECORDS]: JSON.stringify({ m1: { name: "green tea",
      type: "food" } }), [`${MARKET}.md`]: NOTE });

    try {
      const w = mount(View, { props: { state: { data } } });

      await w.findAll(".ui-market__item")[0].find('[aria-label="edit item"]').trigger("click");
      const edit = await windows.next();

      assert.equal(edit.title, "Edit item");
      assert.equal(edit.props.id, "m1");
      await edit.close();

      t.mock.method(Search, "pickGrouped", async (_app, _title, find) => find("Kite").at(-1));
      await mount(AddButton).find("button").trigger("click");
      const category = await windows.next();

      assert.equal(category.title, "✦ Kite");
      await category.wrapper.findAll(".ui-field-choice")[0].trigger("click");
      await category.submit();
      assert.equal(JSON.parse(files[MARKET_RECORDS]).m3.name, "Kite");
    } finally { windows.restore(); }
  });
