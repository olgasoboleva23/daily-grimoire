import { test } from "node:test";
import assert from "node:assert/strict";
import { useRedraw, useNewDay, useBusy, useDataviewChanges, useFileChanges, useWhenIndexed, useTabDate } from "#/shared/lib/use.js";
import { openNote, setApp } from "#/shared/host/index.js";

// a component that keeps what it's given: DOM listeners by type, workspace / vault events by name, intervals
const component = () => {
  const dom = {}, events = {}, intervals = [];
  const on = name => (fn => ({ name, fn }));
  return {
    dom, events, intervals,
    app: { workspace: { on: (n, fn) => ({ n, fn }), opened: [], openLinkText(p, src, tab) { this.opened.push([p, tab]); } }, vault: { on: (n, fn) => ({ n, fn }) }, metadataCache: { on: (n, fn) => ({ n, fn }) } },
    registerDomEvent(el, type, fn) { dom[type] = fn; (el.listeners ??= {})[type] = fn; },
    register() {},
    registerEvent(ref) { (events[ref.n] ??= []).push(ref.fn); },
    registerInterval(id) { intervals.push(id); },
  };
};
// an element with a data-action, inside the root
const root = { contains: () => true };
const button = action => ({ dataset: { action }, matches: () => false, closest(sel) { return sel === "[data-action]" ? this : null; } });

test("useRedraw: hidden, a redraw waits; shown, the next leaf or layout change draws it once", () => {
  const c = component(); let shown = false, draws = 0;
  const { redraw } = useRedraw(c, () => shown, () => draws++);
  redraw();
  assert.equal(draws, 0);
  shown = true;
  c.events["layout-change"][0]();
  c.events["active-leaf-change"][0]();   // already drawn: not again
  assert.equal(draws, 1);
});

test("useRedraw: a ui:page switch catches up too", () => {
  const c = component(); let shown = false, draws = 0;
  const { redraw } = useRedraw(c, () => shown, () => draws++);
  redraw();
  shown = true;
  c.events["ui:page"][0]();
  assert.equal(draws, 1);
});

test("useNewDay: the handler runs once when the date changes", () => {
  let day = "2026-11-01", tick = null;
  globalThis.window = { moment: () => ({ format: () => day }), setInterval: fn => { tick = fn; return 1; } };
  const c = component(), seen = [];
  useNewDay(c, d => seen.push(d));
  tick();
  day = "2026-11-02"; tick(); tick();
  assert.deepEqual(seen, ["2026-11-02"]);
});

test("useBusy: a write to a watched file adds the class, a write elsewhere doesn't", () => {
  const c = component(), el = { classList: new Set() };
  el.classList.add = el.classList.add.bind(el.classList);
  globalThis.window = { setTimeout: () => 0, clearTimeout: () => {} };
  useBusy(c, p => p.startsWith("Tasks/"), () => el, "x--busy");
  c.events.modify[0]({ path: "Notes/a.md" });
  assert.equal(el.classList.has("x--busy"), false);
  c.events.modify[0]({ path: "Tasks/a.md" });
  assert.equal(el.classList.has("x--busy"), true);
});

test("useDataviewChanges: a re-indexed file it watches runs fn, another does not", () => {
  const c = component(), seen = [];
  useDataviewChanges(c, () => seen.push("tasks"), { watched: p => p.startsWith("Tasks/") });
  c.events["dataview:metadata-change"][0]("update", { path: "Notes/a.md" });
  c.events["dataview:metadata-change"][0]("update", { path: "Tasks/a.md" });
  assert.deepEqual(seen, ["tasks"]);
});

test("useWhenIndexed: now when Dataview's index is ready (or Dataview is off), else once it's built, one time", () => {
  const index = { initialized: false };
  setApp({ plugins: { plugins: { dataview: { api: { index } } } } });
  const c = component(); let n = 0;
  useWhenIndexed(c, () => n++);
  assert.equal(n, 0);
  c.events["dataview:index-ready"][0]();
  c.events["dataview:index-ready"][0]();   // built again: not again
  assert.equal(n, 1);
  index.initialized = true;
  useWhenIndexed(component(), () => n++);
  setApp({ plugins: { plugins: {} } });
  useWhenIndexed(component(), () => n++);
  assert.equal(n, 3);
});

test("useTabDate: the dashboard's date change reaches a block inside a dated tab only", () => {
  let dated = false; const el = { closest: () => dated ? {} : null }, c = component(); let n = 0;
  useTabDate(c, el, () => n++);
  c.events["ui:date"][0]();
  dated = true; c.events["ui:date"][0]();
  assert.equal(n, 1);
});

// the notes the vault knows: a short link finds its full path, as Obsidian's link resolution does
const vaultNotes = { Finance: "02 Areas/Finance.md", Ideas: "Notes/Ideas.md" };
const resolve = (href) => { const p = vaultNotes[href.replace(/^.*\//, "")]; return p && { path: p }; };

// a link clicked; `ui` is the tab in front (null: not an app tab), here one that notes its go()
const clickIn = (href, { mod = false, ui = null } = {}) => {
  const c = component(), went = [];

  c.app.metadataCache.getFirstLinkpathDest = resolve;
  setApp(c.app);
  openNote(href, "", { mod }, ui ? { go: (...a) => went.push(a) } : null);
  return { opened: c.app.workspace.opened, went };
};

test("openNote: a note link opens its note (Cmd/Ctrl: a new tab)", () => {
  const plain = clickIn("Ideas"), mod = clickIn("Ideas", { mod: true });
  assert.deepEqual(plain.opened, [["Ideas", false]]);
  assert.deepEqual(mod.opened, [["Ideas", true]]);
});

test("openNote in an app tab: an ordinary note opens in a new tab", () => {
  const { opened, went } = clickIn("Ideas", { ui: true });

  assert.deepEqual(opened, [["Ideas", true]]);
  assert.deepEqual(went, []);
});

test("openNote in an app tab: a short link to an app page's note switches the page", () => {
  const short = clickIn("Finance", { ui: true });
  const full = clickIn("02 Areas/Finance", { ui: true });
  const mod = clickIn("Finance", { ui: true, mod: true });

  for (const r of [short, full]) {
    assert.deepEqual(r.went.map(a => [a[0], a[1]]), [["finance", {}]]);
    assert.deepEqual(r.opened, []);
  }
  assert.equal(mod.went[0][2].mod, true);   // go() opens a new app tab for it
});

test("openNote outside an app tab: an app page's note opens as a note", () => {
  assert.deepEqual(clickIn("Finance").opened, [["Finance", false]]);
});

test("Recipes follows the currently linked notes on indexing, rename and deletion", async () => {
  const { default: recipes } = await import("#/pages/recipes/index.js");
  const c = component(), dish = { link: "Menu/A.md" };
  let draws = 0;
  const linked = path => recipes.watchesNote({ dishes: [dish] }, path);
  useFileChanges(c, () => draws++, linked, true);
  c.events.changed[0]({ path: "Daily.md" });
  c.events.changed[0]({ path: dish.link });
  dish.link = "Elsewhere/B.md";
  c.events.changed[0]({ path: "Menu/A.md" });
  c.events.changed[0]({ path: dish.link });
  c.events.rename[0]({ path: "Moved.md" }, dish.link);
  c.events.delete[0]({ path: dish.link });
  assert.equal(draws, 4);
});
