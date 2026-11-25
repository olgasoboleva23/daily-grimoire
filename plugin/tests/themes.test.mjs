import "./stubs/dom.mjs";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Component } from "obsidian";
import * as sass from "sass";
import postcss from "postcss";
import config, { applyConfig, THEMES, CONFIG, THEME_IMAGES } from "#/shared/config/index.js";
import { settingsValues, toConfig } from "#/models/settings.js";
import { useTheme } from "#/controllers/theme.js";
import { useTaskStore, taskStore } from "#/store/tasks.js";
import { setApp } from "#/shared/host/index.js";
import { chartColor } from "#/shared/lib/chart.js";

after(() => { applyConfig(); GlobalRegistrator.unregister(); });
const settle = () => new Promise(r => setTimeout(r, 5));

test("theme follows loaded/synced settings, late images, reset and plugin unload", async () => {
  const files = { [CONFIG]: JSON.stringify({ theme: "gothic" }) };
  const events = new Map(), draws = [], plugin = new Component();
  const on = (name, fn) => {
    const listeners = events.get(name) ?? new Set();
    events.set(name, listeners); listeners.add(fn);
    return { off: () => listeners.delete(fn) };
  };
  const fire = (name, ...args) => events.get(name)?.forEach(fn => fn(...args));
  plugin.app = {
    metadataCache: { on },
    vault: {
      on, getFileByPath: path => path in files ? { path } : null,
      cachedRead: async f => files[f.path], getResourcePath: f => `app://vault/${f.path}`,
    },
    workspace: { layoutReady: true, trigger: event => draws.push(event) },
  };
  setApp(plugin.app);
  applyConfig();
  useTaskStore(plugin); useTheme(plugin); await settle();
  assert.equal(config.theme, "gothic");
  assert.ok(document.body.classList.contains("ui-theme-gothic"));
  assert.equal(document.body.style.getPropertyValue("--ui-theme-image"), "none");
  const image = `${THEME_IMAGES}/gothic.avif`;
  files[image] = "image"; fire("create", { path: image });
  assert.match(document.body.style.getPropertyValue("--ui-theme-image"), /gothic\.avif/);

  for (const { value } of THEMES) {
    const json = toConfig({ ...settingsValues(config), theme: value });
    assert.equal(json.theme, value);
    assert.equal(json.levelCost.base, 100);
    files[CONFIG] = JSON.stringify(json); fire("modify", { path: CONFIG }); await settle();
    assert.equal(config.theme, value);
    assert.equal(document.body.classList.contains(`ui-theme-${value}`), value !== "winx");
  }
  files[CONFIG] = '{"theme":"missing"}'; fire("modify", { path: CONFIG }); await settle();
  assert.equal(config.theme, "winx");
  assert.equal(document.body.style.getPropertyValue("--ui-theme-image"), "");
  files[CONFIG] = '{"theme":"winx-dark"}'; fire("modify", { path: CONFIG }); await settle();
  assert.ok(draws.includes("ui:theme"));
  plugin.unload();
  assert.equal(document.body.className, "");
  assert.equal(document.body.style.getPropertyValue("--ui-theme-image"), "");
  const count = draws.length;
  taskStore.version.value++; fire("create", { path: image });
  assert.equal(draws.length, count);
});

test("each theme defines the palette in Winx only and ships its AVIF and heading font", () => {
  const styles = new URL("../src/styles/", import.meta.url).pathname;
  const defaults = postcss.parse(sass.compile(`${styles}_tokens.scss`).css);
  const required = new Set();
  defaults.walkDecls(d => required.add(d.prop));
  const themes = postcss.parse(sass.compile(`${styles}_themes.scss`).css);
  const fonts = readFileSync(`${styles}_fonts.scss`, "utf8");
  const expected = { "winx-dark": "Cinzel", gothic: "Pirata One", da2: "Cinzel Decorative",
    "heavenly-delusion": "ui-monospace, monospace" };
  for (const [name, font] of Object.entries(expected)) {
    const rule = themes.nodes.find(r => r.selector?.startsWith(`body.ui-theme-${name} `));
    assert.ok(rule.selector.includes('.workspace-leaf-content[data-type=ui-app]'));
    const declarations = new Map(rule.nodes.map(d => [d.prop, d.value]));
    for (const token of required) assert.ok(declarations.has(token), `${name}: ${token}`);
    if (font === "ui-monospace, monospace") assert.equal(declarations.get("--ui-font-deco"), font);
    else {
      assert.equal(declarations.get("--ui-font-deco"), `"${font}"`);
    assert.ok(fonts.includes(`font-family: ${font};`) || fonts.includes(`font-family: "${font}";`));
    }
    assert.ok(existsSync(new URL(`../../00 System/Assets/themes/${name}.avif`, import.meta.url)));
  }
});

test("chart colors come from the Winx container instead of Obsidian's palette", () => {
  const root = document.createElement("div");
  root.className = "workspace-leaf-content"; root.dataset.type = "ui-app";
  root.style.setProperty("--ui-pink-deep", "#f4a6c8");
  document.body.style.setProperty("--ui-pink-deep", "#d878a8");
  document.body.append(root);
  assert.equal(chartColor("--ui-pink-deep", 0.3), "rgba(244, 166, 200, 0.3)");
  root.style.setProperty("--ui-pink-deep", "#a3201f");
  assert.equal(chartColor("--ui-pink-deep"), "rgba(163, 32, 31, 1)");
  root.remove(); document.body.style.removeProperty("--ui-pink-deep");
});

test("theme XP names follow the same custom thresholds and survive settings round trips", () => {
  const expected = {
    winx: ["VOID", "SPARK", "GLOW", "AURA", "TRANSFORMATION"],
    "winx-dark": ["VOID", "SPARK", "GLOW", "AURA", "TRANSFORMATION"],
    gothic: ["Затишье", "Искра", "Поток", "Разряд", "Буря"],
    "heavenly-delusion": ["Тишина", "Эхо", "Сигнал", "Контакт", "Горизонт"],
    da2: ["Покой", "Пробуждение", "Пламя", "Сияние", "Справедливость"],
  };
  try {
    for (const [theme, names] of Object.entries(expected)) {
      applyConfig({ theme, levels: { spark: 12, glow: 24, aura: 36 } });
      assert.deepEqual(config.levels.map(l => l.name), names);
      assert.deepEqual(config.levels.map(l => l.max), [0, 12, 24, 36, Infinity]);
      assert.equal(config.levels.find(l => 25 <= l.max).name, names[3]);
      const saved = toConfig(settingsValues(config));
      assert.deepEqual(saved.levels, { spark: 12, glow: 24, aura: 36 });
      applyConfig(saved);
      assert.deepEqual(config.levels.map(l => l.name), names);
    }
  } finally { applyConfig(); }
});
