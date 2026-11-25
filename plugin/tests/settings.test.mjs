// Settings validation, configuration writes and area moves against an in-memory vault.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { saveSettings } from "#/controllers/settings.js";
import config, { applyConfig } from "#/helpers/config.js";
import { CONFIG, TASK_RECORDS } from "#/helpers/paths.js";
import { settingsValues, settingsProblem, toConfig, areaRenames } from "#/models/settings.js";
import { levelInfo } from "#/models/xp.js";
import { taskStore } from "#/store/tasks.js";
import { vault } from "./stubs/vault.mjs";

test("level settings reject invalid costs and allow a constant positive cost", () => {
  applyConfig();
  const v = settingsValues(config), records = new Map();

  for (const base of [0, -1, NaN, Infinity, -Infinity, null, "100"])
    assert.match(settingsProblem({ ...v, base }, records, config), /first level/);
  for (const step of [-1, NaN, Infinity, -Infinity, null, "25"])
    assert.match(settingsProblem({ ...v, step }, records, config), /level increase/);
  assert.equal(settingsProblem({ ...v, base: 50, step: 0 }, records, config), null);
});

test("invalid level costs from config.json use defaults; a zero increase stays zero", () => {
  try {
    for (const value of [0, -1, NaN, Infinity, -Infinity, null, "0"]) {
      applyConfig({ levelCost: { base: value, step: 0 } });
      assert.deepEqual(config.levelCost, { base: 100, step: 0 });
      assert.deepEqual(levelInfo(250, config.levelCost.base, config.levelCost.step),
        { level: 3, progress: 50, cost: 100 });
    }
    for (const value of [-1, NaN, Infinity, -Infinity, null, "0"]) {
      applyConfig({ levelCost: { base: 50, step: value } });
      assert.deepEqual(config.levelCost, { base: 50, step: 25 });
      assert.deepEqual(levelInfo(125, config.levelCost.base, config.levelCost.step),
        { level: 3, progress: 0, cost: 100 });
    }
  } finally {
    applyConfig();
  }
});

test("applyConfig: config.json's numbers over the defaults, the maps again; {} puts the defaults back", () => {
  applyConfig({ difficulties: { easy: { xp: 7 } }, levels: { glow: 40 }, levelCost: { step: 50 },
    areas: [{ key: "home", icon: "🏠", title: "Home", name: "Hearth", color: "#123456" }] });
  assert.equal(config.xpMap.easy, 7);
  assert.equal(config.difficulties[0].gold, 2);   // not in the file: the default
  assert.deepEqual(config.levels.map(l => l.max), [0, 10, 40, 30, Infinity]);
  assert.deepEqual(config.levelCost, { base: 100, step: 50 });
  assert.deepEqual(config.areas, [{ key: "home", icon: "🏠", title: "Home", name: "Hearth", color: "#123456", label: "🏠 Home" }]);
  assert.deepEqual([config.areaMap, config.areaIcons, config.areaColors], [{ home: "Hearth" }, { home: "🏠" }, { home: "#123456" }]);
  applyConfig({});
  assert.equal(config.xpMap.easy, 5);
  assert.deepEqual(config.areas.map(a => a.key), ["body", "mind", "wealth", "base", "occasions", "rest"]);
});

test("the window's values and back: config.json as the window left it", () => {
  applyConfig({});
  const v = settingsValues(config);
  assert.deepEqual(v.difficulties[1], { key: "medium", label: "⭐⭐ Medium", xp: 10, gold: 5 });
  assert.deepEqual(v.areas[0], { key: "body", icon: "🌺", title: "Body", name: "Vitality", color: "#e8609a", was: "body", apply: true });
  const json = toConfig({ ...v, glow: 35,
    difficulties: v.difficulties.map(d => d.key === "medium" ? { ...d, xp: 12 } : d) });
  assert.deepEqual(json.difficulties.medium, { xp: 12, gold: 5 });
  assert.deepEqual(json.levels, { spark: 10, glow: 35, aura: 30 });
  assert.deepEqual(json.areas[0], { key: "body", icon: "🌺", title: "Body", name: "Vitality", color: "#e8609a" });
});

test("what the window can't save: an area with tasks taken off, a bad or doubled key, thresholds out of order", () => {
  applyConfig({});
  const v = settingsValues(config), records = new Map([["t1", { area: "base" }], ["t2", { area: "base" }]]);
  assert.equal(settingsProblem(v, records, config), null);
  assert.match(settingsProblem({ ...v, areas: v.areas.filter(a => a.key !== "base") }, records, config), /Base.*2 tasks/);
  assert.match(settingsProblem({ ...v, areas: [...v.areas, { key: "body", icon: "x", title: "X" }] }, records, config), /body.*twice/);
  assert.match(settingsProblem({ ...v, areas: [...v.areas, { key: "My Area", icon: "x", title: "X" }] }, records, config), /My Area/);
  assert.match(settingsProblem({ ...v, glow: 5 }, records, config), /SPARK.*GLOW.*AURA/);
});

test("the area renames include only changed keys with Apply", () => {
  applyConfig({});
  const v = settingsValues(config);
  const areas = v.areas.map(a => a.key === "base" ? { ...a, key: "home" } : a);
  assert.deepEqual(areaRenames({ ...v, areas }), new Map([["base", "home"]]));
  assert.equal(areaRenames({ ...v, areas: areas.map(a => ({ ...a, apply: false })) }).size, 0);
});

test("saveSettings writes and applies config, moves checked areas and reports the count",
  async t => {
    const original = { promptStart: "Saved prompt" };
    const records = {
      t1: { name: "Cook", area: "base" },
      t2: { name: "Clean", area: "base" },
      t3: { name: "Walk", area: "body" },
    };
    const { files } = vault({
      [CONFIG]: JSON.stringify(original), [TASK_RECORDS]: JSON.stringify(records),
    });
    applyConfig(original);
    taskStore.putRecords(records);
    t.after(() => { applyConfig(); taskStore.putRecords({}); });
    const values = settingsValues(config);
    const areas = values.areas.map(area => {
      if (area.key === "base") return { ...area, key: "home", apply: true };
      if (area.key === "body") return { ...area, key: "fitness", apply: false };
      return area;
    });
    const next = { ...values, base: 75, step: 0, areas };

    assert.deepEqual(await saveSettings(next), { moved: 2 });
    assert.deepEqual(JSON.parse(files[CONFIG]), { ...original, ...toConfig(next) });
    assert.deepEqual(config.levelCost, { base: 75, step: 0 });
    assert.equal(config.areaMap.home, "Sanctuary");
    assert.deepEqual(JSON.parse(files[TASK_RECORDS]), {
      t1: { ...records.t1, area: "home" }, t2: { ...records.t2, area: "home" }, t3: records.t3,
    });
    assert.equal(Notice.last, "✦ Settings saved · 2 tasks moved");
  });

test("saveSettings reports zero moves when only a setting changes", async t => {
  const { files } = vault();
  applyConfig();
  taskStore.putRecords({});
  t.after(() => applyConfig());

  assert.deepEqual(await saveSettings({ ...settingsValues(config), theme: "gothic" }), {
    moved: 0,
  });
  assert.equal(JSON.parse(files[CONFIG]).theme, "gothic");
  assert.equal(config.theme, "gothic");
  assert.equal(Notice.last, "✦ Settings saved");
});

test("a failed task move leaves settings and task areas intact, then can be retried", async t => {
  applyConfig();
  const records = { t1: { name: "Sweep", area: "base" }, t2: { name: "Walk", area: "body" } };
  const original = { promptStart: "Original" };
  const { app, files } = vault({
    [CONFIG]: JSON.stringify(original), [TASK_RECORDS]: JSON.stringify(records),
  });
  taskStore.putRecords(records);
  t.after(() => { applyConfig(); taskStore.putRecords({}); });
  const process = app.vault.process;
  let fail = true;
  app.vault.process = async (file, fn) => {
    if (fail && file.path === TASK_RECORDS) throw new Error("task write failed");
    return process(file, fn);
  };
  const values = settingsValues(config);
  values.areas.find(area => area.was === "base").key = "home";

  await assert.rejects(saveSettings(values), /task write failed/);
  assert.deepEqual(JSON.parse(files[CONFIG]), original);
  assert.deepEqual(JSON.parse(files[TASK_RECORDS]), records);
  assert.equal(config.areaMap.base, "Sanctuary");

  fail = false;
  assert.deepEqual(await saveSettings(values), { moved: 1 });
  assert.equal(JSON.parse(files[TASK_RECORDS]).t1.area, "home");
  assert.equal(config.areaMap.home, "Sanctuary");
});

test("a failed config write restores moved areas and preserves task edits", async t => {
  applyConfig();
  const records = { t1: { name: "Sweep", area: "base" } };
  const { app, files } = vault({
    [CONFIG]: "{}", [TASK_RECORDS]: JSON.stringify(records),
  });
  taskStore.putRecords(records);
  t.after(() => { applyConfig(); taskStore.putRecords({}); });
  const process = app.vault.process;
  let pendingArea;
  app.vault.process = async (file, fn) => {
    if (file.path !== CONFIG) return process(file, fn);
    const tasks = JSON.parse(files[TASK_RECORDS]);
    pendingArea = tasks.t1.area;
    tasks.t1.name = "Dust";
    files[TASK_RECORDS] = JSON.stringify(tasks);
    throw new Error("config write failed");
  };
  const values = settingsValues(config);
  values.areas.find(area => area.was === "base").key = "home";

  await assert.rejects(saveSettings(values), /config write failed/);
  assert.equal(pendingArea, "home");
  assert.equal(files[CONFIG], "{}");
  assert.deepEqual(JSON.parse(files[TASK_RECORDS]).t1, { name: "Dust", area: "base" });
  assert.equal(config.areaMap.base, "Sanctuary");
});

test("dish type edits are independent, normalized, validated and saved in display order", () => {
  applyConfig();
  const v = settingsValues(config);
  assert.deepEqual(v.dishTypes.map(t => t.key), ["soup", "main", "dessert"]);
  v.dishTypes[0].name = "Changed";
  assert.equal(config.dishTypes[0].name, "Soups");
  v.dishTypes = [{ key: " #Tea ", name: " Tea " }, { key: "cake", name: "Cake" }];
  assert.equal(settingsProblem(v, new Map(), config), null);
  const saved = toConfig(v);
  assert.deepEqual(saved.dishTypes, [{ key: "tea", name: "Tea" }, { key: "cake", name: "Cake" }]);
  try {
    applyConfig(saved);
    assert.deepEqual(config.dishTypes, saved.dishTypes);
    assert.equal(settingsProblem({ ...v, dishTypes: [] }, new Map(), config), null);
    applyConfig(JSON.parse(JSON.stringify(toConfig({ ...v, dishTypes: [] }))));
    assert.deepEqual(settingsValues(config).dishTypes, []);
    for (const row of [{ key: "#All", name: "A" }, { key: "other", name: "O" },
      { key: "TEA", name: "Again" }, { key: "#", name: "Empty" }, { key: "ok", name: " " }]) {
      assert.ok(settingsProblem({ ...v, dishTypes: [...v.dishTypes, row] }, new Map(), config));
    }
  } finally { applyConfig(); }
});
