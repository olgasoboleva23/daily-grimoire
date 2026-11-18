import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// each component draws the markup the styles expect (the components' index.scss): the same as the old uikit/*.js did,
// written out here; Vue's <!--v-if--> placeholders left out (no box, no style)
let mount, nextTick, ui;
before(async () => {
  GlobalRegistrator.register();
  HTMLElement.prototype.isShown = function () { return !this.hidden && this.checkVisibility(); };
  ({ mount } = await import("@vue/test-utils"));
  ({ nextTick } = await import("vue"));
  // a component is <Name>.vue, or <Name>/index.vue when it has its own styles
  const load = async n => (await import(`../src/components/uikit/${n}`)).default;
  ui = Object.fromEntries(await Promise.all(["UiButton", "UiNoteLink", "UiEmpty", "UiMissing", "UiFailed",
    "UiGroupHeader", "UiAddForm", "UiCard", "UiTable"].map(async n => {
    const styled = ["UiButton", "UiEmpty", "UiAddForm", "UiCard", "UiTable"].includes(n);

    return [n, await load(styled ? `${n}/index.vue` : `${n}.vue`)];
  })));
});
const draws = (vue, html) => assert.equal(vue.element.outerHTML.replace(/<!--[^]*?-->/g, ""), html);

test("UiButton: kinds, on, title, extra classes", () => {
  draws(mount(ui.UiButton, { props: { title: "delete task" }, slots: { default: "🗑" } }),
    '<button class="ui-btn ui-btn--round" aria-label="delete task" data-tip="ui-tooltip">🗑</button>');
  // on a blue place (Missed, today): the pink tooltip
  draws(mount(ui.UiButton, { props: { title: "move to today", tip: "pink" }, slots: { default: "☀️" } }),
    '<button class="ui-btn ui-btn--round" aria-label="move to today" data-tip="ui-tooltip ui-tooltip--pink">☀️</button>');
  draws(mount(ui.UiButton, { props: { kind: "pill" }, attrs: { class: "ui-weight__list" }, slots: { default: "✦ list" } }),
    '<button class="ui-btn ui-btn--pill ui-weight__list">✦ list</button>');
  draws(mount(ui.UiButton, { props: { kind: "toggle", on: true }, slots: { default: "✓ done" } }), '<button class="ui-btn ui-btn--toggle ui-btn--on">✓ done</button>');
  draws(mount(ui.UiButton, { props: { kind: "toggle" }, slots: { default: "✓ done" } }), '<button class="ui-btn ui-btn--toggle">✓ done</button>');
});

test("UiNoteLink: a short link to an app page's note switches the page in place", async () => {
  const { setApp } = await import("#/helpers/app.js");
  const went = [], opened = [];
  const tab = { go: (...a) => went.push(a) };
  const { UiView } = await import("#/components/app/view.ts");
  const front = Object.assign(Object.create(UiView.prototype), tab);

  setApp({
    metadataCache: { getFirstLinkpathDest: () => ({ path: "02 Areas/Finance.md" }) },
    workspace: { getActiveViewOfType: () => front, openLinkText: (...a) => opened.push(a) },
  });
  await mount(ui.UiNoteLink, { props: { path: "Finance" } }).find("button").trigger("click");
  assert.deepEqual(went.map(a => [a[0], a[1]]), [["finance", {}]]);
  assert.deepEqual(opened, []);
});

test("UiNoteLink, UiEmpty, UiMissing, UiFailed, UiGroupHeader, UiAddForm, UiCard", () => {
  draws(mount(ui.UiNoteLink, { props: { path: "x/Cycle.md" }, slots: { default: "dates" } }), '<button class="ui-btn ui-btn--pill">dates</button>');
  draws(mount(ui.UiEmpty, { props: { text: "All bought" } }), '<div class="ui-empty ui-text-center">✦ All bought</div>');
  draws(mount(ui.UiEmpty), '<div class="ui-empty ui-text-center">✦ Nothing here yet</div>');
  draws(mount(ui.UiMissing, { props: { path: "x/Goals.md" } }), '<div class="ui-empty ui-text-center">✦ Create x/Goals.md</div>');
  draws(mount(ui.UiFailed, { props: { text: "Goals.md is broken" } }),
    '<div class="ui-empty ui-text-center ui-empty--error">⚠ couldn\'t draw: Goals.md is broken<button class="ui-btn ui-btn--chip ui-empty__retry">retry</button></div>');
  draws(mount(ui.UiGroupHeader, { props: { label: "🌿 Harvest", count: 3 } }),
    '<div class="ui-group-header"><span>🌿 Harvest</span><span class="ui-group-header__count">3</span></div>');
  draws(mount(ui.UiGroupHeader, { props: { label: "🌿 Harvest" } }), '<div class="ui-group-header"><span>🌿 Harvest</span></div>');
  const input = { name: "kg", type: "number", placeholder: "today, kg" };
  draws(mount(ui.UiAddForm, { props: { input, submit: "Save" } }),
    '<form class="ui-add-form ui-flex ui-gap-s"><input class="ui-input ui-input--field ui-add-form__input" type="number" placeholder="today, kg" name="kg"><button class="ui-add-form__submit" type="submit">Save</button></form>');
  draws(mount(ui.UiCard, { props: { title: "Weight", meta: ["scroll"] }, slots: { default: "<b>40 kg</b>" } }),
    '<div class="callout ui-widget" data-callout="card" data-callout-metadata="scroll" data-callout-fold=""><div class="callout-title ui-widget__title" dir="auto"><div class="callout-icon"></div><div class="callout-title-inner">Weight</div></div><div class="callout-content ui-widget__body"><b>40 kg</b></div></div>');
});

test("UiButton: a mirrored nav chevron (next) gets its modifier", () => {
  const next = mount(ui.UiButton, { props: { kind: "nav", mirrored: true, title: "next" }, slots: { default: "›" } });
  assert.equal(next.find("button").classes().join(" "), "ui-btn ui-btn--nav ui-btn--mirrored");
});

test("UiCard puts a widget's own class on its body (the shop's ui-shop)", () => {
  const card = mount(ui.UiCard, { props: { title: "Shop", bodyClass: "ui-shop" } });
  assert.equal(card.find(".ui-widget__body").classes().join(" "), "callout-content ui-widget__body ui-shop");
});

test("UiFailed's retry and UiAddForm's submit reach the parent", async () => {
  const failed = mount(ui.UiFailed, { props: { text: "x" } });
  await failed.find("button").trigger("click");
  assert.equal(failed.emitted("retry").length, 1);
  const form = mount(ui.UiAddForm, { props: { input: { name: "kg" } } });
  await form.find("input").setValue("60.2");
  await form.find("form").trigger("submit");
  assert.deepEqual(form.emitted("submit")[0], ["60.2"]);
});

test("UiTable: the columns' heads and classes, a row per item named by row-class, a cell's text or the cell slot; a column's tip on its head", () => {
  const columns = [{ key: "name", label: "Код", class: "x-name", tip: "the medicine" }, { key: "n", label: "N", align: "center" }];
  const rows = [{ name: "АЕ", n: 1, when: "past" }, { name: "МА", n: 2, when: "today" }];
  const w = mount(ui.UiTable, {
    props: { columns, rows, rowKey: r => r.name, rowClass: r => `x-${r.when}` },
    slots: { cell: `<template #cell="{ row, col }"><b v-if="col.key === 'n'">{{ row.n * 10 }}</b><template v-else>{{ row[col.key] }}</template></template>` },
  });

  draws(mount(ui.UiTable, { props: { columns: [{ key: "a", label: "A" }], rows: [], bordered: true } }),
    '<table class="ui-table ui-table--bordered"><thead><tr><th class="ui-table__head">A</th></tr></thead><tbody></tbody></table>');
  draws(w, '<table class="ui-table"><thead><tr><th class="ui-table__head x-name" aria-label="the medicine" data-tip="ui-tooltip">Код</th><th class="ui-table__head ui-table__head--center">N</th></tr></thead>'
    + '<tbody><tr class="ui-table__row x-past"><td class="ui-table__cell x-name">АЕ</td><td class="ui-table__cell ui-table__cell--center"><b>10</b></td></tr>'
    + '<tr class="ui-table__row x-today"><td class="ui-table__cell x-name">МА</td><td class="ui-table__cell ui-table__cell--center"><b>20</b></td></tr></tbody></table>');
});

test("Search.pickGrouped: a header over each group's first row, the name and its note; a new one has neither", async () => {
  const { Search } = await import("#/components/uikit/Search/index.ts");
  const pick = Search.pick, drawn = [];
  const el = { createDiv: o => (drawn.push(o.text ?? o.cls), el), createSpan: o => drawn.push(o.text) };
  Search.pick = async (app, placeholder, find, render) => find("q").forEach(c => render(c, el));
  try {
    await Search.pickGrouped(null, "", () => [
      { name: "a", g: 1 }, { name: "b", g: 1 }, { name: "c", g: 2 }, { name: "d", isNew: true },
    ], { groupOf: c => c.g, label: g => `#${g}`, note: c => c.name.toUpperCase() });
  } finally { Search.pick = pick; }
  const row = "ui-search__row ui-row ui-between ui-gap-l";
  assert.deepEqual(drawn, ["#1", row, "a", "A", row, "b", "B", "#2", row, "c", "C", row, "+ new: d", ""]);
});

test("UiCard: a cover picture above the title; none without one", () => {
  const card = mount(ui.UiCard, { props: { title: "Trip", cover: "app://x/trip.webp" } });
  const img = card.find("img.ui-widget__cover");
  assert.equal(img.attributes("src"), "app://x/trip.webp");
  assert.equal(img.attributes("alt"), "");
  assert.equal(card.find(".ui-widget").element.firstElementChild, img.element);
  assert.equal(mount(ui.UiCard, { props: { title: "Trip" } }).find("img").exists(), false);
});

test("UiCard: wings by default, :wings=false draws it without (the --wingless modifier)", () => {
  const wingless = mount(ui.UiCard, { props: { title: "Trip", wings: false } });

  assert.equal(wingless.classes().includes("ui-widget--wingless"), true);
  assert.equal(mount(ui.UiCard, { props: { title: "Trip" } }).classes().includes("ui-widget--wingless"), false);
});

test("UiTabs: on the page background (a page without a card) the light look", async () => {
  const UiTabs = (await import("../src/components/uikit/UiTabs/index.vue")).default;
  const tabs = [{ key: "all", text: "All" }];
  const plain = mount(UiTabs, { props: { tabs } }), onBackground = mount(UiTabs, { props: { tabs, onBackground: true } });

  assert.equal(plain.classes().includes("ui-tabs--on-background"), false);
  assert.equal(onBackground.classes().includes("ui-tabs--on-background"), true);
});

test("UiAddForm: on the page background (no card under it) the --on-background look", () => {
  const onBackground = mount(ui.UiAddForm, { props: { onBackground: true } });

  assert.equal(onBackground.classes().includes("ui-add-form--on-background"), true);
  assert.equal(mount(ui.UiAddForm).classes().includes("ui-add-form--on-background"), false);
});

const navItems = [
  { key: "dashboard", icon: "✦", text: "Dashboard" },
  { key: "calendar", icon: "🗓", text: "Calendar" },
  { key: "other", icon: "⋯", text: "Other" },
];
const loadNav = async () => (await import("../src/components/uikit/UiNav/index.vue")).default;

test("UiNav: three items, the current one on, a click says which", async () => {
  const nav = mount(await loadNav(), { props: { items: navItems, current: "calendar" } });
  const items = nav.findAll(".ui-rail .ui-btn--rail");

  assert.equal(items.length, 3);
  assert.deepEqual(items.map(b => b.classes().includes("ui-btn--on")), [false, true, false]);
  await items[1].trigger("click");
  const [[key, event]] = nav.emitted("go");
  assert.equal(key, "calendar");
  assert.equal(event instanceof MouseEvent, true);
});

test("UiNav: hover opens it; a click shuts it until the pointer leaves", async () => {
  const nav = mount(await loadNav(), { props: { items: navItems, current: "calendar" } });
  const is = m => nav.classes().includes(`ui-rail--${m}`);

  await nav.trigger("pointerenter");
  assert.equal(is("open"), true);
  await nav.find(".ui-btn--rail").trigger("click");
  assert.deepEqual([is("shut"), is("open")], [true, false]);
  await nav.trigger("pointerleave");
  await nav.trigger("pointerenter");
  assert.deepEqual([is("shut"), is("open")], [false, true]);
});

test("UiNav: on the phone the bottom bar, no hover states", async () => {
  const nav = mount(await loadNav(), { props: { items: navItems, phone: true } });

  await nav.trigger("pointerenter");
  assert.deepEqual(nav.classes(), ["ui-rail", "ui-rail--phone"]);
});

test("UiDrawer: closed draws nothing; open, Esc and the backdrop close it", async () => {
  const UiDrawer = (await import("../src/components/uikit/UiDrawer/index.vue")).default;
  const closed = mount(UiDrawer, { props: { open: false }, slots: { default: "rows" } });
  assert.equal(closed.find(".ui-drawer").exists(), false);

  const drawer = mount(UiDrawer,
    { props: { open: true, side: "bottom" }, slots: { default: "rows" } });
  assert.equal(drawer.find(".ui-drawer.ui-drawer--bottom .ui-drawer__panel").text(), "rows");
  await drawer.find(".ui-drawer__backdrop").trigger("click");
  await drawer.find(".ui-drawer__panel").trigger("keydown", { key: "Escape" });
  await drawer.find(".ui-drawer__panel").trigger("keydown", { key: "Enter" });
  assert.equal(drawer.emitted("close").length, 2);
  drawer.unmount();
});

test("UiDrawer: a labelled dialog; open, it takes the focus, closed, gives it back", async () => {
  const UiDrawer = (await import("../src/components/uikit/UiDrawer/index.vue")).default;
  const other = document.body.appendChild(document.createElement("button"));
  other.focus();
  const drawer = mount(UiDrawer, { props: { label: "Other" }, attachTo: document.body });

  await drawer.setProps({ open: true });
  await nextTick();
  const panel = drawer.find(".ui-drawer__panel");
  assert.deepEqual(["role", "aria-modal", "tabindex", "aria-label"].map(a => panel.attributes(a)),
    ["dialog", "true", "-1", "Other"]);
  assert.equal(document.activeElement, panel.element);
  await drawer.setProps({ open: false });
  await nextTick();
  assert.equal(document.activeElement, other);
  drawer.unmount();
  other.remove();
});

test("UiDrawer: desktop Tab stays in the panel, so Escape still closes it", async () => {
  const UiDrawer = (await import("../src/components/uikit/UiDrawer/index.vue")).default;
  const other = document.body.appendChild(document.createElement("button"));
  other.focus();
  const drawer = mount(UiDrawer, {
    attachTo: document.body,
    slots: { default: '<button disabled>Disabled</button><button hidden>Hidden</button>'
      + '<button tabindex="-1">Not tabbed</button><button>First</button><button>Last</button>' },
  });
  await drawer.setProps({ open: true });
  await nextTick();
  const panel = drawer.find(".ui-drawer__panel").element;
  const buttons = drawer.findAll("button"), first = buttons[3].element, last = buttons[4].element;
  const tab = shiftKey => {
    const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
    document.activeElement.dispatchEvent(event);
    return event.defaultPrevented;
  };

  assert.equal(document.activeElement === panel, true);
  assert.equal(tab(true), true);
  assert.equal(document.activeElement === last, true);
  assert.equal(tab(false), true);
  assert.equal(document.activeElement === first, true);
  assert.equal(tab(false), false);   // ordinary moves inside the panel stay native
  assert.equal(tab(true), true);
  assert.equal(document.activeElement === last, true);
  await buttons[4].trigger("keydown", { key: "Escape" });
  assert.equal(drawer.emitted("close").length, 1);
  await drawer.setProps({ open: false });
  assert.equal(document.activeElement === other, true);
  drawer.unmount();
  other.remove();
});

test("UiDrawer: the phone sheet leaves the bottom navigation reachable", async () => {
  const UiDrawer = (await import("../src/components/uikit/UiDrawer/index.vue")).default;
  const other = document.body.appendChild(document.createElement("button"));
  const dashboard = document.body.appendChild(document.createElement("button"));
  other.focus();
  const drawer = mount(UiDrawer, { props: { side: "bottom" }, attachTo: document.body,
    slots: { default: "<button>Settings</button>" } });
  await drawer.setProps({ open: true });
  await nextTick();
  const panel = drawer.find(".ui-drawer__panel");
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });

  panel.element.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.notEqual(panel.attributes("aria-modal"), "true");
  dashboard.focus();   // a click on the visible bottom bar
  await drawer.setProps({ open: false });
  assert.equal(document.activeElement === dashboard, true);
  drawer.unmount();
  other.remove();
  dashboard.remove();
});

test("UiNav: the current item is the page; the one whose drawer is open, expanded", async () => {
  const nav = mount(await loadNav(),
    { props: { items: navItems, current: "calendar", expanded: "other" } });
  const items = nav.findAll(".ui-btn--rail");

  assert.deepEqual(items.map(b => b.attributes("aria-current")), [undefined, "page", undefined]);
  assert.deepEqual(items.map(b => b.attributes("aria-expanded")), [undefined, undefined, "true"]);
});
