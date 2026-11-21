import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// the Form window draws its rows with classes only (its look: uikit/Form/index.scss); the only
// inline style is a lines list's columns. The DOM helpers Obsidian adds, the two the Form uses
let Form, nextTick;
before(async () => {
  GlobalRegistrator.register();
  HTMLElement.prototype.setText = function (t) { this.textContent = t; };
  HTMLElement.prototype.addClass = function (c) { this.classList.add(c); };
  ({ nextTick } = await import("vue"));
  ({ Form } = await import("#/components/uikit/Form/index.ts"));
});

const createForm = (rows, values) => {
  const app = { vault: { getResourcePath: () => "app://icon.webp" } };
  const form = new Form(app, "✦ Test", rows, { values });

  Object.assign(form, {
    titleEl: document.createElement("div"), contentEl: document.createElement("div"),
    scope: { register() {} },
  });
  form.onOpen();

  return form;
};
const open = (rows, values) => createForm(rows, values).contentEl;
const classes = els => [...els].map(e => e.className);
const cols = win => win.querySelector(".ui-form__list--lines").style
  .getPropertyValue("--ui-form-cols");
// no inline style but a lines list's columns
const styled = win => [...win.querySelectorAll("[style]")].map(e => e.getAttribute("style"));

test("Form file row keeps the selected File in its values until submission", async () => {
  const form = createForm([{ name: "Cover", key: "cover", file: "image/*" }]);
  const win = form.contentEl;
  const input = win.querySelector("input[type=file]");
  const file = new File(["picture"], "garden.png", { type: "image/png" });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change"));
  await nextTick();
  assert.equal(input.accept, "image/*");
  assert.equal(input.getAttribute("aria-label"), "Cover");
  assert.equal(form.values.cover, file);
  let submitted;
  form.resolve = value => { submitted = value; };
  form.close = () => form.onClose();
  win.querySelector(".modal-button-container button").click();
  assert.equal(submitted.cover, file);
});

test("Form: a list of text boxes and checkboxes is a line of names, then one line a group", async () => {
  const win = open([
    { name: "Title", key: "title", text: "a title" },
    { name: "Areas", key: "areas", list: [
      { name: "Name", key: "name", text: "Body" },
      { name: "Colour", key: "color", text: "#e8609a", color: true },
      { name: "Apply", key: "apply", check: "move its tasks" },
    ] },
  ]);
  const [head, group] = win.querySelectorAll(".ui-form__list--lines > .ui-form__line");
  const narrow = "ui-form__cell ui-form__cell--narrow";

  assert.ok(win.classList.contains("ui-form"));
  assert.ok(win.querySelector(".setting-item-info").classList.contains("ui-form__info"));
  assert.equal(head.className, "ui-form__line ui-form__line--head");
  assert.deepEqual(classes(head.children), ["ui-form__cell", narrow, narrow, narrow]);
  assert.deepEqual([...head.children].map(c => c.textContent), ["Name", "Colour", "Apply", ""]);
  assert.equal(head.children[2].title, "move its tasks");
  assert.deepEqual(classes(group.children), ["ui-form__cell", narrow, narrow, narrow]);
  assert.equal(group.querySelector("input[type=text]").className, "ui-form__input");
  assert.equal(win.querySelectorAll(".ui-form__line").length, 2);

  win.querySelector(".ui-form__more button").click();   // + adds a group's line
  await nextTick();
  assert.equal(win.querySelectorAll(".ui-form__line").length, 3);
  win.querySelector(".ui-form__line:last-child button").click();   // × takes it off
  await nextTick();
  assert.equal(win.querySelectorAll(".ui-form__line").length, 2);
  // one grid: a text box's column shares the width, a colour's, a checkbox's and the ×'s fit them
  assert.equal(cols(win), "minmax(0, 1fr) auto auto auto");
  assert.deepEqual(styled(win), ["--ui-form-cols: minmax(0, 1fr) auto auto auto;"]);
});

test("Form: a fixed list has no + or ×, a label row shows its value as text", () => {
  const win = open([{ tab: "Difficulties", name: "Difficulties", key: "d", fixed: true, list: [
    { name: "Difficulty", key: "label", label: true },
    { name: "XP", key: "xp", text: "XP", number: true },
  ] }]);
  const lines = win.querySelectorAll(".ui-form__line:not(.ui-form__line--head)");

  assert.equal(lines.length, 0);   // no values: no groups, none added
  const win2 = open([{ name: "Difficulties", key: "d", fixed: true, list: [
    { name: "Difficulty", key: "label", label: true },
    { name: "XP", key: "xp", text: "XP", number: true },
  ] }], { d: [{ label: "⭐ Easy", xp: 5 }] });
  const [, line] = win2.querySelectorAll(".ui-form__line");

  assert.equal(line.querySelector(".ui-form__label").textContent, "⭐ Easy");
  assert.equal(line.querySelector("input").value, "5");
  assert.equal(win2.querySelectorAll("button").length, 1);   // the window's own button only
  assert.equal(cols(win2), "auto minmax(0, 1fr)");
  assert.equal(win.querySelector(".setting-item-name"), null);   // named as its tab: no heading
});

test("Form: a list with buttons or long text keeps its groups stacked, rows inside", () => {
  const icon = { path: "icon.webp" };
  const win = open([{ name: "Courses", key: "courses", list: [
    { name: "When", key: "when", options: [{ label: "morning", value: "m", img: icon }] },
    { name: "Note", key: "note", text: "a note", lines: true },
  ] }]);
  const group = win.querySelector(".ui-form__list > .ui-form__group");

  assert.equal(win.querySelector(".ui-form__list").className, "ui-form__list");
  assert.equal(group.querySelectorAll(".setting-item").length, 2);
  assert.ok(group.querySelector("img.ui-form__img"));
  assert.equal(group.querySelector("textarea").className, "ui-form__textarea");
  assert.equal(group.querySelector("textarea").getAttribute("rows"), "4");
  assert.equal(win.querySelector(".ui-form__line"), null);
  assert.deepEqual(styled(win), []);
});


test("Form: a row can keep a fixed numeric value read-only for selected records", () => {
  const rows = [{ name: "XP", key: "xp", text: "XP", number: true,
    readonly: values => values.key === "none" }];
  assert.equal(open(rows, { key: "none", xp: 0 }).querySelector("input").readOnly, true);
  assert.equal(open(rows, { key: "easy", xp: 5 }).querySelector("input").readOnly, false);
});


test("Form: dependent choices follow edited variant names and keep the selected value", async () => {
  const win = open([
    { name: "Variants", key: "variants", text: "one per line", lines: true },
    { name: "Next variant", key: "next", options: values => values.variants.split("\n")
      .filter(Boolean).map(value => ({ label: value, value })) },
  ], { variants: "Core\nArms", next: "Arms" });
  const rows = win.querySelectorAll(".setting-item");
  assert.equal(rows[1].querySelector(".mod-cta").textContent, "Arms");
  const field = win.querySelector("textarea");
  field.value = "Core\nArms\nLegs"; field.dispatchEvent(new Event("input"));
  await nextTick();
  assert.deepEqual([...rows[1].querySelectorAll("button")].map(b => b.textContent), ["Core", "Arms", "Legs"]);
  assert.equal(rows[1].querySelector(".mod-cta").textContent, "Arms");
  rows[1].querySelector("button:last-child").click();
  await nextTick();
  assert.equal(rows[1].querySelector(".mod-cta").textContent, "Legs");
});


test("Form: the first text box has the focus when the window opens", () => {
  const win = document.createElement("div");

  document.body.append(win);
  const form = new Form({ vault: { getResourcePath: () => "" } }, "t", [
    { name: "On", key: "on", check: "x" },
    { name: "Title", key: "title", text: "a title" },
    { name: "Other", key: "other", text: "b" },
  ]);

  Object.assign(form, { titleEl: document.createElement("div"), contentEl: win, scope: { register() {} } });
  form.onOpen();
  assert.equal(document.activeElement, win.querySelectorAll("input[type=text]")[0]);
});

test("Form: a select row is a dropdown of its choices, the chosen value in the values", async () => {
  const form = createForm([{ name: "About", key: "about", select: [
    { label: "Project", value: "project:p1" }, { label: "Stage 01 · A", value: "stage:st1" },
  ] }], { about: "project:p1" });
  const select = form.contentEl.querySelector("select.dropdown");

  assert.deepEqual([...select.options].map(o => o.textContent), ["Project", "Stage 01 · A"]);
  assert.equal(select.value, "project:p1");
  select.value = "stage:st1";
  select.dispatchEvent(new Event("change"));
  await nextTick();
  assert.equal(form.values.about, "stage:st1");
});

test("Form: a pick row shows its value, sets what the picker gives and × clears it", async () => {
  let answer = "Notes/a.md";
  const form = createForm([{ name: "Note", key: "link", pick: async () => answer }], { link: "" });
  const win = form.contentEl;
  const button = () => win.querySelector(".ui-form__pick");

  assert.equal(button().textContent.trim(), "Choose…");
  assert.equal(win.querySelector(".ui-form__clear"), null);
  button().click();
  await new Promise(r => setTimeout(r));
  await nextTick();
  assert.equal(form.values.link, "Notes/a.md");
  assert.equal(button().textContent.trim(), "Notes/a.md");
  answer = null;   // the picker closed: the value stays
  button().click();
  await new Promise(r => setTimeout(r));
  assert.equal(form.values.link, "Notes/a.md");
  win.querySelector(".ui-form__clear").click();
  await nextTick();
  assert.equal(form.values.link, "");
});

test("Form: a pick row in a list is a line's cell, its value shown through `show`", async () => {
  const names = { m1: "rice", m2: "beans" };
  const form = createForm([{
    name: "Ingredients", key: "ingredients", list: [
      { name: "Product", key: "item", pick: async () => "m2", show: id => names[id] ?? id },
      { name: "Amount", key: "amount", text: "500 g" },
    ],
  }], { ingredients: [{ item: "m1", amount: "1 cup" }] });
  const win = form.contentEl;
  const button = () => win.querySelector(".ui-form__list--lines .ui-form__pick");

  assert.equal(cols(win), "minmax(0, 1fr) minmax(0, 1fr) auto");
  assert.equal(button().textContent.trim(), "rice");
  button().click();
  await new Promise(r => setTimeout(r));
  await nextTick();
  assert.equal(form.values.ingredients[0].item, "m2");
  assert.equal(button().textContent.trim(), "beans");
});

test("Form: a list line's one × takes the ingredient off (its pick has no Clear of its own)",
  async () => {
    const form = createForm([{
      name: "Ingredients", key: "ingredients", list: [
        { name: "Product", key: "item", pick: async () => null },
        { name: "Amount", key: "amount", text: "500 g" },
      ],
    }], { ingredients: [{ item: "m1", amount: "1 cup" }, { item: "m2", amount: "" }] });
    const lines = () =>
      [...form.contentEl.querySelectorAll(".ui-form__line:not(.ui-form__line--head)")];

    assert.deepEqual(lines().map(l => l.querySelectorAll("button").length), [2, 2]);
    lines()[0].querySelector("button[title=Remove]").click();
    await nextTick();
    assert.deepEqual(form.values.ingredients, [{ item: "m2", amount: "" }]);
  });

test("Form: a pick row's picker gets the window's values (a new note named after the dish)",
  async () => {
    const form = createForm([
      { name: "Name", key: "name", text: "" },
      { name: "Note", key: "link", pick: async v => `${v.name}.md` },
    ], { name: "Stew" });

    form.contentEl.querySelector(".ui-form__pick").click();
    await new Promise(r => setTimeout(r));
    assert.equal(form.values.link, "Stew.md");
  });

test("Form: a pick's text is drawn again after its picker, the value the same (a product renamed)",
  async () => {
    const names = { m1: "rice" };
    const form = createForm([{ name: "Product", key: "item", pick: async () => {
      names.m1 = "brown rice";
      return "m1";
    }, show: id => names[id] }], { item: "m1" });
    const button = () => form.contentEl.querySelector(".ui-form__pick");

    button().click();
    await new Promise(r => setTimeout(r));
    await nextTick();
    assert.equal(button().textContent.trim(), "brown rice");
  });
