import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// The windows' kit: openWindow and its frames (uikit/Window/open.ts, the test frame in
// stubs/windows.mjs), the shell UiWindow, the fields (UiField, UiFieldText, UiFieldChoice,
// UiFieldPick, UiFieldList) and the two kit windows (ConfirmWindow, FieldWindow). Today's Form
// window's cases (tests/form.test.mjs) restated on the pieces: the same markup, the same values.
let mount, vue, Modal, open, testWindows, kit, confirm, askValue, filled, groupsFilled;

before(async () => {
  GlobalRegistrator.register();
  HTMLElement.prototype.setText = function (t) { this.textContent = t; };
  HTMLElement.prototype.addClass = function (c) { this.classList.add(c); };
  ({ mount } = await import("@vue/test-utils"));
  vue = await import("vue");
  ({ Modal } = await import("obsidian"));
  open = await import("#/components/uikit/Window/open.ts");
  ({ testWindows } = await import("./stubs/windows.mjs"));
  ({ confirm } = await import("#/components/uikit/ConfirmWindow/confirm.js"));
  ({ askValue } = await import("#/components/uikit/FieldWindow/ask.js"));
  ({ filled, groupsFilled } = await import("#/components/uikit/UiWindow/ready.js"));
  drawModals();
  kit = {
    UiWindow: (await import("#/components/uikit/UiWindow/index.vue")).default,
    UiField: (await import("#/components/uikit/UiField/index.vue")).default,
    UiFieldText: (await import("#/components/uikit/UiFieldText/index.vue")).default,
    UiFieldChoice: (await import("#/components/uikit/UiFieldChoice/index.vue")).default,
    UiFieldPick: (await import("#/components/uikit/UiFieldPick/index.vue")).default,
    UiFieldList: (await import("#/components/uikit/UiFieldList/index.vue")).default,
  };
});

const tick = async () => {
  await new Promise(r => setTimeout(r));
  await vue.nextTick();
};

// a made-up window: its title from the context, Enter and a button answer it, a textarea
const Probe = {
  props: { name: { type: String, required: true } },
  emits: ["done"],
  setup(props, { emit }) {
    const ctx = vue.inject(open.WINDOW);

    ctx.setTitle(`✦ ${props.name}`);
    ctx.onEnter(() => emit("done", "entered"));
    ctx.addClass("ui-probe-window");
  },
  template: '<button class="probe" @click="$emit(\'done\', name)">{{ name }}</button><textarea />',
};

// Obsidian's Modal stub drawn as Obsidian does: its elements, open() → onOpen, close() →
// onClose; the Enter handler its scope gets is kept
const modals = [];
let stub;
const drawModals = () => {
  stub = { open: Modal.prototype.open, close: Modal.prototype.close };
  Modal.prototype.open = function () {
    const el = () => document.createElement("div");

    Object.assign(this, { titleEl: el(), contentEl: el(), modalEl: el(), keys: {} });
    this.scope = { register: (mods, key, fn) => { this.keys[key] = fn; } };
    modals.push(this);
    this.onOpen();
  };
  Modal.prototype.close = function () { this.onClose(); };
};

after(() => Object.assign(Modal.prototype, stub));

const key = (target, prevented = []) => ({ target, preventDefault: () => prevented.push(1) });

test("openWindow: the Obsidian frame draws the window, its title and class, resolves done",
  async () => {
    const got = open.openWindow(Probe, { name: "Garden" });
    const modal = modals.at(-1);

    assert.equal(modal.titleEl.textContent, "✦ Garden");
    assert.ok(modal.modalEl.classList.contains("ui-probe-window"));
    modal.contentEl.querySelector(".probe").click();
    assert.equal(await got, "Garden");
    assert.equal(modal.contentEl.innerHTML, "");   // closed: the Vue app unmounted
  });

test("openWindow: closed any other way (×, Esc) resolves null and unmounts the window",
  async () => {
    const got = open.openWindow(Probe, { name: "Shed" });
    const modal = modals.at(-1);

    modal.close();
    assert.equal(await got, null);
    assert.equal(modal.contentEl.innerHTML, "");
  });

test("openWindow: Enter calls the window's submit, but a textarea's Enter is a new line",
  async () => {
    let answer = "open";
    const got = open.openWindow(Probe, { name: "Pond" }).then(r => { answer = r; });
    const modal = modals.at(-1);
    const prevented = [];

    modal.keys.Enter(key(modal.contentEl.querySelector("textarea"), prevented));
    await tick();
    assert.equal(answer, "open");
    assert.deepEqual(prevented, []);
    modal.keys.Enter(key(document.body, prevented));   // nothing focused
    await got;
    assert.equal(answer, "entered");
    assert.deepEqual(prevented, [1]);
  });

test("the test frame keeps two windows open and answers them in order; restore puts the Modal back",
  async () => {
    const windows = testWindows();
    const first = open.openWindow(Probe, { name: "Beds" });
    const second = open.openWindow(Probe, { name: "Rake" });
    const a = await windows.next(), b = await windows.next();

    assert.deepEqual([a.title, b.title], ["✦ Beds", "✦ Rake"]);
    assert.deepEqual(a.props, { name: "Beds" });
    assert.equal(a.component, Probe);
    assert.deepEqual(a.classes, ["ui-probe-window"]);
    assert.equal(windows.all.length, 2);
    await b.wrapper.find(".probe").trigger("click");
    assert.equal(await second, "Rake");
    await a.close();
    assert.equal(await first, null);
    assert.equal(windows.all.length, 0);

    const later = windows.next();   // asked before the window opens

    open.openWindow(Probe, { name: "Hoe" });
    assert.equal((await later).title, "✦ Hoe");
    windows.restore();
    assert.equal(windows.all.length, 0);
    open.openWindow(Probe, { name: "Spade" });
    assert.equal(modals.at(-1).titleEl.textContent, "✦ Spade");
    modals.at(-1).close();
  });

// a window written in a test: the kit's components, its values `v`; the frame's context faked
const fakeContext = () => ({
  title: null, enter: null, classes: [],
  setTitle(t) { this.title = t; },
  onEnter(f) { this.enter = f; },
  addClass(c) { this.classes.push(c); },
  owner: null,
  close() {},
});
const draw = (template, data = {}, extra = {}) => {
  const ctx = fakeContext();
  const v = vue.reactive(data);
  const target = document.body.appendChild(document.createElement("div"));
  const wrapper = mount({ components: kit, setup: () => ({ v, ...extra }), template },
    { attachTo: target, global: { provide: { [open.WINDOW]: ctx } } });

  // the window's elements sit right in the frame's content (UiWindow has no root of its own)
  return { wrapper, ctx, v, el: target.firstElementChild };
};
const classes = els => [...els].map(e => e.className);
const styled = el => [...el.querySelectorAll("[style]")].map(e => e.getAttribute("style"));

test("UiWindow: the title reaches the frame; the button greyed until ready, then it submits",
  async () => {
    const { wrapper, ctx, v } = draw(`<UiWindow :title="'✦ ' + v.name" submit="Create"
      :ready="!!v.name" @submit="v.sent++" />`, { name: "", sent: 0 });
    const button = () => wrapper.find(".modal-button-container > button");

    assert.equal(ctx.title, "✦ ");
    assert.equal(button().text(), "Create");
    assert.equal(button().classes().join(" "), "mod-cta ui-window__submit");
    assert.equal(button().element.disabled, true);
    ctx.enter();
    assert.equal(v.sent, 0);
    v.name = "Garden";
    await vue.nextTick();
    assert.equal(ctx.title, "✦ Garden");   // a title that changes (the dish viewer's name)
    assert.equal(button().element.disabled, false);
    await button().trigger("click");
    ctx.enter();
    assert.equal(v.sent, 2);
  });

test("UiWindow: busy greys the button and Enter does nothing; no submit: no button row",
  async () => {
    const { wrapper, ctx, v } = draw('<UiWindow title="t" submit="Save" :busy="v.busy" '
      + '@submit="v.sent++" />', { busy: true, sent: 0 });

    assert.equal(wrapper.find("button").element.disabled, true);
    ctx.enter();
    assert.equal(v.sent, 0);
    v.busy = false;
    await vue.nextTick();
    ctx.enter();
    assert.equal(v.sent, 1);

    const viewer = draw(
      '<UiWindow title="🍲" frame-class="ui-dish-window"><p>soup</p></UiWindow>');

    assert.equal(viewer.el.querySelector(".modal-button-container"), null);
    assert.deepEqual(viewer.ctx.classes, ["ui-dish-window"]);
    viewer.ctx.enter();   // nothing to submit
  });

test("UiWindow: tabs on top, one pane shown, a hidden pane keeps what was typed",
  async () => {
    const { el, v } = draw(`<UiWindow title="✦ Settings" submit="Save" :tabs="['Start', 'Final']">
      <template #tab:Start><UiField name="Start"><UiFieldText v-model="v.start" /></UiField>
      </template>
      <template #tab:Final><UiField name="Final"><UiFieldText v-model="v.final" /></UiField>
      </template>
      <UiField name="Shared"><UiFieldText v-model="v.shared" /></UiField>
    </UiWindow>`, { start: "", final: "", shared: "" });
    const panes = () => [...el.querySelectorAll(".ui-window__pane")];

    assert.ok(el.querySelector(".ui-window__tabs > .ui-tabs"));
    assert.deepEqual(panes().map(p => p.hidden), [false, true]);
    assert.equal(el.querySelector(".ui-tabs__tab--on").textContent, "Start");
    el.querySelector("input").value = "plan";
    el.querySelector("input").dispatchEvent(new Event("input"));
    el.querySelector("[data-tab=Final]").click();
    await vue.nextTick();
    assert.deepEqual(panes().map(p => p.hidden), [true, false]);
    assert.equal(el.querySelector("input").value, "plan");
    assert.equal(v.start, "plan");
    // the fields without a tab sit under the panes, the button last
    assert.deepEqual([...el.children].map(c => c.className), [
      "ui-window__tabs", "ui-window__pane", "ui-window__pane", "setting-item ui-field",
      "modal-button-container ui-window__buttons"]);
  });

test("UiWindow: the first shown text box has the focus; a textarea, a colour, a hidden pane never",
  () => {
    const { el } = draw(`<UiWindow title="t" submit="OK" :tabs="['A', 'B']">
      <template #tab:A>
        <UiField name="On" toggle><input type="checkbox"></UiField>
        <UiField name="Notes"><UiFieldText type="lines" /></UiField>
        <UiField name="Colour"><UiFieldText type="color" /></UiField>
      </template>
      <template #tab:B><UiField name="Hidden"><UiFieldText /></UiField></template>
      <UiField name="Title"><UiFieldText /></UiField>
      <UiField name="Other"><UiFieldText /></UiField>
    </UiWindow>`);
    const texts = el.querySelectorAll("input.ui-field-text__input");

    assert.equal(document.activeElement, texts[1]);   // [0] is the hidden pane's
    assert.equal(texts[1].closest(".ui-field").textContent.trim(), "Title");
  });

test("UiField: Obsidian's setting row; a checkbox's row is a toggle with its description",
  () => {
    const { el } = draw(`<UiWindow title="t">
      <UiField name="Title"><span class="x" /></UiField>
      <UiField name="Show" description="in the calendar" toggle><input type="checkbox"></UiField>
    </UiWindow>`);
    const [row, check] = el.querySelectorAll(".setting-item");

    assert.equal(row.className, "setting-item ui-field");
    assert.deepEqual(classes(row.children), ["setting-item-info ui-field__info",
      "setting-item-control ui-field__control"]);
    assert.equal(row.querySelector(".setting-item-name").textContent, "Title");
    assert.ok(row.querySelector(".ui-field__control > span.x"));
    assert.equal(row.querySelector(".setting-item-description"), null);
    assert.equal(check.className, "setting-item ui-field mod-toggle");
    assert.equal(check.querySelector(".setting-item-description").textContent, "in the calendar");
    assert.equal(check.children[1].className,
      "setting-item-control ui-field__control ui-field__control--check");
  });

test("UiField: a toggle with an empty description keeps its (empty) description line", () => {
  const { el } = draw(`<UiWindow title="t">
    <UiField name="🍫 cocoa" description="" toggle><input type="checkbox"></UiField>
  </UiWindow>`);

  assert.equal(el.querySelector(".setting-item-description").textContent, "");
});

test("UiField: a label row shows its text selectable, its line breaks kept", () => {
  const { el } = draw('<UiWindow title="t"><UiField name="Kept" :text="v.kept" /></UiWindow>',
    { kept: "the cover\nthe tasks" });
  const label = el.querySelector(".ui-field__control > .ui-field__label");

  assert.equal(label.tagName, "SPAN");
  assert.equal(label.textContent, "the cover\nthe tasks");
});

test("UiFieldText: text trimmed, a number a Number (empty: null), lines as typed, read-only",
  async () => {
    const { el, v } = draw(`<UiWindow title="t">
      <UiFieldText v-model="v.name" placeholder="a title" />
      <UiFieldText v-model="v.cost" type="number" placeholder="gold" />
      <UiFieldText v-model="v.notes" type="lines" placeholder="notes" />
      <UiFieldText v-model="v.xp" type="number" readonly />
      <UiFieldText v-model="v.color" type="color" />
    </UiWindow>`, { name: "", cost: 5, notes: "", xp: 0, color: "#e8609a" });
    const [name, cost, xp, color] = el.querySelectorAll("input");
    const notes = el.querySelector("textarea");
    const type = async (field, text) => {
      field.value = text;
      field.dispatchEvent(new Event("input"));
      await vue.nextTick();
    };

    assert.deepEqual([name.type, cost.type, xp.type, color.type],
      ["text", "number", "number", "color"]);
    assert.deepEqual(classes([name, cost, xp]), Array(3).fill("ui-field-text__input"));
    assert.equal(color.className, "");   // a colour keeps its own size
    assert.equal(name.placeholder, "a title");
    assert.equal(cost.value, "5");
    assert.deepEqual([xp.readOnly, name.readOnly], [true, false]);
    assert.equal(notes.className, "ui-field-text__textarea");
    assert.equal(notes.getAttribute("rows"), "4");
    await type(name, "  Garden  ");
    await type(cost, "12");
    await type(notes, " dig\nrake ");
    assert.deepEqual([v.name, v.cost, v.notes], ["Garden", 12, " dig\nrake "]);
    await type(cost, "");
    assert.equal(v.cost, null);
    assert.deepEqual(styled(el), []);
  });

test("UiFieldChoice: a button a choice, the chosen lit, a picture instead of the label",
  async () => {
  const { el, v } = draw(`<UiWindow title="t"><UiField name="Status"><UiFieldChoice
    v-model="v.status" :choices="choices" /></UiField></UiWindow>`, { status: "idea" }, {
    choices: [{ label: "idea", value: "idea" }, { label: "active", value: "active" },
      { label: "sun", value: "sun", img: "app://sun.webp" }],
  });
  const buttons = () => [...el.querySelectorAll(".ui-field__control > button")];

  assert.deepEqual(buttons().map(b => b.textContent), ["idea", "active", ""]);
  assert.deepEqual(buttons().map(b => b.title), ["idea", "active", "sun"]);
  assert.deepEqual(classes(buttons()),
    ["ui-field-choice mod-cta", "ui-field-choice", "ui-field-choice"]);
  assert.equal(el.querySelector("img.ui-field-choice__img").getAttribute("src"),
    "app://sun.webp");
  buttons()[1].click();
  await vue.nextTick();
  assert.equal(v.status, "active");
  assert.equal(el.querySelector(".mod-cta").textContent, "active");
});

test("UiFieldChoice: dependent choices follow edited variant names and keep the chosen one",
  async () => {
    const { el, v } = draw(`<UiWindow title="t">
      <UiField name="Variants"><UiFieldText v-model="v.variants" type="lines" /></UiField>
      <UiField name="Next variant"><UiFieldChoice v-model="v.next" :choices="v.variants
        .split('\\n').filter(Boolean).map(value => ({ label: value, value }))" /></UiField>
    </UiWindow>`, { variants: "Core\nArms", next: "Arms" });
    const row = el.querySelectorAll(".setting-item")[1];
    const field = el.querySelector("textarea");

    assert.equal(row.querySelector(".mod-cta").textContent, "Arms");
    field.value = "Core\nArms\nLegs";
    field.dispatchEvent(new Event("input"));
    await vue.nextTick();
    assert.deepEqual([...row.querySelectorAll("button")].map(b => b.textContent),
      ["Core", "Arms", "Legs"]);
    assert.equal(row.querySelector(".mod-cta").textContent, "Arms");
    row.querySelector("button:last-child").click();
    await vue.nextTick();
    assert.equal(v.next, "Legs");
  });

test("UiFieldPick: «Choose…» when empty, sets what the picker gives, null keeps, × clears",
  async () => {
    let answer = "Notes/a.md";
    const { el, v } = draw(`<UiWindow title="t"><UiField name="Note"><UiFieldPick
      v-model="v.link" :pick="pick" /></UiField></UiWindow>`, { link: "" },
    { pick: async () => answer });
    const button = () => el.querySelector(".ui-field-pick__button");

    assert.equal(button().textContent.trim(), "Choose…");
    assert.equal(el.querySelector(".ui-field-pick__clear"), null);
    button().click();
    await tick();
    assert.equal(v.link, "Notes/a.md");
    assert.equal(button().textContent.trim(), "Notes/a.md");
    answer = null;   // the picker closed: the value stays
    button().click();
    await tick();
    assert.equal(v.link, "Notes/a.md");
    el.querySelector(".ui-field-pick__clear").click();
    await vue.nextTick();
    assert.equal(v.link, "");
    assert.equal(button().textContent.trim(), "Choose…");
  });

test("UiFieldPick: \"\" clears; its text drawn again after the picker (a product renamed)",
  async () => {
    const names = { m1: "rice", m2: "beans" };
    let answer = "m1";
    const { el, v } = draw(`<UiWindow title="t"><UiFieldPick v-model="v.item" :pick="pick"
      :show="id => names[id]" :clear="false" /></UiWindow>`, { item: "m1" }, {
      names, pick: async () => { names.m1 = "brown rice"; return answer; },
    });
    const button = () => el.querySelector(".ui-field-pick__button");

    assert.equal(button().textContent.trim(), "rice");
    assert.equal(el.querySelector(".ui-field-pick__clear"), null);   // clear: false
    button().click();
    await tick();
    assert.equal(button().textContent.trim(), "brown rice");
    answer = "";
    button().click();
    await tick();
    assert.equal(v.item, "");
  });

test("UiFieldPick: a pick holding a list shows «Choose…» while it's empty", async () => {
  let answer = [];
  const { el } = draw(`<UiWindow title="t"><UiFieldPick v-model="v.alt" :pick="pick"
    :show="list => list.map(p => p.name).join(' + ')" /></UiWindow>`,
  { alt: [{ name: "curry powder" }, { name: "dried garlic" }] }, { pick: async () => answer });
  const button = () => el.querySelector(".ui-field-pick__button");

  assert.equal(button().textContent.trim(), "curry powder + dried garlic");
  button().click();
  await tick();
  assert.equal(button().textContent.trim(), "Choose…");
  answer = [{ name: "turmeric" }];
  button().click();
  await tick();
  assert.equal(button().textContent.trim(), "turmeric");
});

const AREAS = `<UiWindow title="t"><UiFieldList v-model="v.areas" name="Areas" :columns="[
  { key: 'name', name: 'Name', wide: true },
  { key: 'color', name: 'Colour', narrow: true },
  { key: 'apply', name: 'Apply', title: 'move its tasks', narrow: true },
]">
  <template #name="{ group }"><UiFieldText v-model="group.name" placeholder="Body" /></template>
  <template #color="{ group }"><UiFieldText v-model="group.color" type="color" /></template>
  <template #apply="{ group }"><input v-model="group.apply" type="checkbox"></template>
</UiFieldList></UiWindow>`;

test("UiFieldList: a table is a line of names, then a line a group; + adds one, × takes it off",
  async () => {
    const { el, v } = draw(AREAS, { areas: [{ name: "Body", color: "#e8609a", apply: false }] });
    const lines = () => el.querySelectorAll(".ui-field-list--lines > .ui-field-list__line");
    const [head, group] = lines();
    const narrow = "ui-field-list__cell ui-field-list__cell--narrow";
    const cell = "ui-field-list__cell";

    assert.equal(el.querySelector(".setting-item-name").textContent, "Areas");
    assert.equal(el.querySelector(".setting-item-info").className, "setting-item-info");
    assert.equal(el.querySelector(".ui-field-list").className,
      "ui-field-list ui-field-list--lines");
    assert.equal(head.className, "ui-field-list__line ui-field-list__line--head");
    assert.deepEqual(classes(head.children), [cell, narrow, narrow, narrow]);
    assert.deepEqual([...head.children].map(c => c.textContent), ["Name", "Colour", "Apply", ""]);
    assert.equal(head.children[2].title, "move its tasks");
    assert.deepEqual(classes(group.children), [cell, narrow, narrow, narrow]);
    assert.equal(group.querySelector("input[type=text]").value, "Body");
    assert.equal(lines().length, 2);
    el.querySelector(".ui-field-list__more button").click();   // + adds a group's line
    await vue.nextTick();
    assert.equal(lines().length, 3);
    assert.deepEqual(v.areas.at(-1), {});
    lines()[1].querySelector("button[title=Remove]").click();   // × takes it off
    await vue.nextTick();
    assert.deepEqual(v.areas, [{}]);
    // one grid: a text box's column shares the width, a colour's, a checkbox's and the ×'s fit
    assert.deepEqual(styled(el), ["--ui-field-list-cols: minmax(0, 1fr) auto auto auto;"]);
  });

test("UiFieldList: an empty list starts with one fresh group; a fixed one has no + or ×",
  async () => {
    const empty = draw(AREAS, { areas: [] });

    await vue.nextTick();
    assert.deepEqual(empty.v.areas, [{}]);
    assert.equal(empty.el.querySelectorAll(".ui-field-list__line").length, 2);

    const template = AREAS.replace("<UiFieldList ", "<UiFieldList start-empty ");
    const optional = draw(template, { areas: [] });

    assert.deepEqual(optional.v.areas, []);
    optional.el.querySelector("button[title='One more']").click();
    await vue.nextTick();
    assert.deepEqual(optional.v.areas, [{}]);

    const fixed = `<UiWindow title="t"><UiFieldList v-model="v.d" fixed :columns="[
      { key: 'label', name: 'Difficulty' }, { key: 'xp', name: 'XP', wide: true }]">
      <template #label="{ group }"><span class="ui-field__label">{{ group.label }}</span></template>
      <template #xp="{ group }"><UiFieldText v-model="group.xp" type="number" /></template>
    </UiFieldList></UiWindow>`;
    const none = draw(fixed, { d: [] });

    await vue.nextTick();
    assert.equal(none.el.querySelectorAll(".ui-field-list__line").length, 0);
    assert.equal(none.el.querySelector(".setting-item"), null);   // no name: no heading (a tab's)

    const some = draw(fixed, { d: [{ label: "⭐ Easy", xp: 5 }] });
    const [, line] = some.el.querySelectorAll(".ui-field-list__line");

    assert.equal(line.querySelector(".ui-field__label").textContent, "⭐ Easy");
    assert.equal(line.querySelector("input").value, "5");
    assert.equal(some.el.querySelectorAll("button").length, 0);
    assert.deepEqual(styled(some.el), ["--ui-field-list-cols: auto minmax(0, 1fr);"]);
  });

test("UiFieldList: fresh() makes a new group; a line's pick has no Clear, its × removes the line",
  async () => {
    const { el, v } = draw(`<UiWindow title="t"><UiFieldList v-model="v.ingredients"
      :fresh="() => ({ item: '', amount: '' })" :columns="[
      { key: 'item', name: 'Product', wide: true }, { key: 'amount', name: 'Amount', wide: true }]">
      <template #item="{ group }"><UiFieldPick v-model="group.item" :pick="pick" /></template>
      <template #amount="{ group }"><UiFieldText v-model="group.amount" /></template>
    </UiFieldList></UiWindow>`, { ingredients: [{ item: "m1", amount: "1 cup" },
      { item: "m2", amount: "" }] }, { pick: async () => null });
    const lines = () =>
      [...el.querySelectorAll(".ui-field-list__line:not(.ui-field-list__line--head)")];

    assert.deepEqual(lines().map(l => l.querySelectorAll("button").length), [2, 2]);
    lines()[0].querySelector("button[title=Remove]").click();
    await vue.nextTick();
    assert.deepEqual(v.ingredients, [{ item: "m2", amount: "" }]);
    el.querySelector(".ui-field-list__more button").click();
    await vue.nextTick();
    assert.deepEqual(v.ingredients.at(-1), { item: "", amount: "" });
    assert.deepEqual(styled(el), ["--ui-field-list-cols: minmax(0, 1fr) minmax(0, 1fr) auto;"]);
  });

test("UiFieldList: without columns the groups are stacked, their rows inside, × each",
  async () => {
  const { el, v } = draw(`<UiWindow title="t"><UiFieldList v-model="v.meds" name="Medicines">
    <template #default="{ group }">
      <UiField name="Name"><UiFieldText v-model="group.name" /></UiField>
      <UiField name="Link"><UiFieldPick v-model="group.link" :pick="pick" /></UiField>
    </template>
  </UiFieldList></UiWindow>`, { meds: [{ name: "zinc", link: "a.md" }, { name: "iron" }] },
  { pick: async () => null });
  const groups = () => el.querySelectorAll(".ui-field-list > .ui-field-list__group");

  assert.equal(el.querySelector(".ui-field-list").className, "ui-field-list");
  assert.equal(groups().length, 2);
  assert.equal(groups()[0].querySelectorAll(".setting-item").length, 2);
  assert.ok(groups()[0].querySelector(".ui-field-pick__clear"));   // a row's pick keeps its Clear
  assert.equal(el.querySelector(".ui-field-list__line"), null);
  assert.deepEqual(styled(el), []);
  assert.equal(groups()[0].lastElementChild.title, "Remove");
  groups()[0].lastElementChild.click();
  await vue.nextTick();
  assert.deepEqual(v.meds, [{ name: "iron" }]);
});

test("ready: filled is not null, undefined or \"\"; groupsFilled needs a group, each filled",
  () => {
  assert.deepEqual([0, false, "a", null, undefined, ""].map(filled),
    [true, true, true, false, false, false]);
  assert.equal(groupsFilled([], ["name"]), false);
  assert.equal(groupsFilled(null, ["name"]), false);
  assert.equal(groupsFilled([{ name: "zinc" }, { name: "" }], ["name"]), false);
  assert.equal(groupsFilled([{ name: "zinc" }, { name: "iron", dose: "" }], ["name"]), true);
  assert.equal(groupsFilled([{}]), true);
});

test("confirm: its lines as label rows; the button resolves true, a close false", async () => {
  const windows = testWindows();
  const yes = confirm("Delete project?", [{ name: "Project", text: "Garden" },
    { name: "Kept", text: "the cover\nthe tasks" }]);
  const w = await windows.next();

  assert.equal(w.title, "Delete project?");
  assert.deepEqual(w.wrapper.findAll(".setting-item-name").map(n => n.text()), ["Project", "Kept"]);
  assert.equal(w.wrapper.findAll(".ui-field__label")[1].text(), "the cover\nthe tasks");
  assert.equal(w.wrapper.find(".ui-window__submit").text(), "Delete");
  await w.submit();
  assert.equal(await yes, true);

  const no = confirm("✦ Delete the journal «Skin»?", [], "Remove");
  const v = await windows.next();

  assert.equal(v.wrapper.find(".ui-window__submit").text(), "Remove");
  assert.equal(v.wrapper.findAll(".setting-item").length, 0);
  await v.close();
  assert.equal(await no, false);
  windows.restore();
});

test("askValue: a text trimmed, Enter submits it; required greys the button", async () => {
  const windows = testWindows();
  const got = askValue({ title: "✦ Rename stage", name: "Name", value: "Beds", required: true,
    submit: "Save" });
  const w = await windows.next();
  const input = w.wrapper.find("input");

  assert.equal(w.title, "✦ Rename stage");
  assert.equal(w.wrapper.find(".setting-item-name").text(), "Name");
  assert.equal(input.element.value, "Beds");
  await input.setValue("  ");
  assert.equal(w.wrapper.find(".ui-window__submit").element.disabled, true);
  await w.enter(input.element);
  assert.equal(windows.all.length, 1);   // not ready: still open
  await input.setValue("  Raised beds ");
  await w.enter(input.element);
  assert.equal(await got, "Raised beds");
  windows.restore();
});

test("askValue: a number a Number, lines keep Enter for a new line, choices lit", async () => {
  const windows = testWindows();
  const sum = askValue({ title: "Deposit", name: "Sum", type: "number", required: true });
  const s = await windows.next();

  assert.equal(s.wrapper.find(".ui-window__submit").element.disabled, true);
  await s.wrapper.find("input").setValue("700");
  await s.submit();
  assert.equal(await sum, 700);

  const notes = askValue({ title: "✦ Notes", name: "Notes", type: "lines", value: "a\n" });
  const n = await windows.next();
  const area = n.wrapper.find("textarea");

  await n.enter(area.element);
  assert.equal(windows.all.length, 1);   // Enter in a textarea: a new line, not the button
  await area.setValue("a\nb ");
  await n.submit();
  assert.equal(await notes, "a\nb ");

  const cat = askValue({ title: "Category", name: "Category", required: true,
    choices: [{ label: "🥦 Food", value: "food" }, { label: "🧴 Care", value: "care" }] });
  const c = await windows.next();

  assert.equal(c.wrapper.find(".ui-window__submit").element.disabled, true);
  await c.wrapper.findAll(".ui-field-choice")[1].trigger("click");
  assert.equal(c.wrapper.find(".mod-cta.ui-field-choice").text(), "🧴 Care");
  await c.submit();
  assert.equal(await cat, "care");

  const task = askValue({ title: "Start", name: "Task for this session", submit: "Copy" });
  const t = await windows.next();

  assert.equal(t.wrapper.find(".ui-window__submit").text(), "Copy");
  await t.submit();   // nothing typed, not required: ""
  assert.equal(await task, "");
  windows.restore();
});
