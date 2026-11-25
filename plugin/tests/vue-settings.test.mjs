import "./stubs/dom.mjs";
// Settings entry points, fields and saving through the window test frame.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import config, { CONFIG, TASK_RECORDS, applyConfig } from "#/shared/config/index.js";
import { vault } from "./stubs/vault.mjs";

let mount, testWindows, registerCommands, taskStore, PageNavigation;
before(async () => {
  ({ mount } = await import("@vue/test-utils"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
  ({ registerCommands } = await import("#/commands/commands.ts"));
  ({ taskStore } = await import("#/entities/task/index.js"));
  PageNavigation = (await import("#/components/app/PageNavigation/index.vue")).default;
});

test("Settings command shows five tabs, requires numbers and keeps invalid values for editing",
  async t => {
    const records = { t1: { name: "Sweep", area: "base" }, t2: { name: "Walk", area: "body" } };
    const { files, app } = vault({ [TASK_RECORDS]: JSON.stringify(records) });
    applyConfig();
    taskStore.putRecords(records);
    t.after(() => { applyConfig(); taskStore.putRecords({}); });
    const commands = new Map();
    registerCommands({ app, addCommand: x => commands.set(x.id, x) });
    const windows = testWindows();

    try {
      const saving = commands.get("settings").callback();
      assert.equal(windows.all.length, 1);
      const [w] = windows.all;
      const tabs = w.wrapper.findAll(".ui-tabs__tab");
      assert.equal(w.title, "✦ Settings");
      assert.deepEqual(tabs.map(tab => tab.text()),
        ["Appearance", "Difficulties", "Areas", "XP Today & Level", "Recipes"]);
      const pane = () => w.wrapper.get(".ui-window__pane:not([hidden])");
      const save = w.wrapper.get(".ui-window__submit");
      assert.equal(save.text(), "Save");
      assert.equal(pane().get("button.mod-cta").text(), "Winx");
      assert.equal(files[CONFIG], undefined);

      await tabs[1].trigger("click");
      const difficulty = pane().findAll(".ui-field-list__line").at(-1);
      assert.equal(difficulty.text(), "No XP");
      assert.equal(difficulty.get('input[placeholder="XP"]').element.readOnly, true);
      const gold = difficulty.get('input[placeholder="gold"]');
      await gold.setValue("");
      assert.equal(save.element.disabled, true);
      await gold.setValue("0");

      await tabs[2].trigger("click");
      const base = pane().findAll(".ui-field-list__line").find(row =>
        row.findAll('input[placeholder="body"]').some(i => i.element.value === "base"));
      assert.equal(base.get('input[type="color"]').element.value, "#4fb59a");
      assert.equal(base.get('input[aria-label="Apply"]').element.checked, true);
      await base.get('input[placeholder="body"]').setValue("home");

      await tabs[3].trigger("click");
      const first = pane().get('input[placeholder="100"]');
      const step = pane().get('input[placeholder="25"]');
      await first.setValue("");
      assert.equal(save.element.disabled, true);
      await first.setValue("0");
      await step.setValue("0");
      await w.submit();
      assert.match(Notice.last, /first level must cost/);
      assert.deepEqual(windows.all, [w]);
      assert.equal(first.element.value, "0");
      assert.equal(files[CONFIG], undefined);

      await first.setValue("75");
      await w.submit();
      await saving;
      assert.deepEqual(config.levelCost, { base: 75, step: 0 });
      assert.equal(JSON.parse(files[TASK_RECORDS]).t1.area, "home");
      assert.equal(Notice.last, "✦ Settings saved · 1 tasks moved");
    } finally { windows.restore(); }
  });

test("Other → Settings opens the window and closes the drawer", async () => {
  const { files } = vault();
  const windows = testWindows();
  const nav = mount(PageNavigation, {
    global: { provide: { ui: { state: { page: "dashboard" }, go: async () => {} } } },
  });

  try {
    await nav.findAll(".ui-btn--rail").at(-1).trigger("click");
    await nav.get(".ui-menu__row--last button").trigger("click");
    assert.equal(windows.all.length, 1);
    assert.equal(nav.find(".ui-drawer").exists(), false);
    const [w] = windows.all;
    assert.equal(w.title, "✦ Settings");
    await w.close();
    assert.equal(files[CONFIG], undefined);
  } finally { windows.restore(); nav.unmount(); }
});

test("a saved empty Recipes list allows saving the theme", async t => {
  const initial = { dishTypes: [] };
  const { app, files } = vault({ [CONFIG]: JSON.stringify(initial) });
  applyConfig(initial);
  t.after(() => applyConfig());
  const commands = new Map();
  registerCommands({ app, addCommand: x => commands.set(x.id, x) });
  const windows = testWindows();
  t.after(windows.restore);
  const saving = commands.get("settings").callback();
  const w = await windows.next();

  await w.wrapper.get('button[title="Gothic"]').trigger("click");
  await w.submit();
  const saved = JSON.parse(files[CONFIG]);

  assert.deepEqual(saved.dishTypes, []);
  assert.equal(saved.theme, "gothic");
  await saving;
});
