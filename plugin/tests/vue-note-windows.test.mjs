import "./stubs/dom.mjs";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { PURCHASES } from "#/shared/config/index.js";

// The Cmd+P windows of new notes, journals, the shop and the pomodoro's lengths
// opened through the test frame as their openers do, and the commands that open them.
const MASTER = "00 System/Data/Tasks/Master.md";
let openWindow, testWindows, KINDS, taskStore, registerCommands, windows, win;
before(async () => {
  window.moment = () => ({ format: () => "2026-11-20" });
  ({ openWindow } = await import("#/shared/ui/Window/index.ts"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
  const docs = await import("#/entities/doc/index.js");
  KINDS = docs.KINDS;
  ({ taskStore } = await import("#/entities/task/index.js"));
  ({ registerCommands } = await import("#/commands/commands.ts"));
  win = {
    item: docs.CollectionItemWindow,
    journal: docs.NewJournalWindow,
    buy: (await import("#/features/buy-reward/index.js")).BuyRewardWindow,
    pomodoro: (await import("#/components/windows/pomodoro/PomodoroWindow/index.vue")).default,
  };
  windows = testWindows();
});
after(() => windows.restore());

const names = w => w.wrapper.findAll(".setting-item-name").map(n => n.text());
const button = w => w.wrapper.find(".ui-window__submit");
const greyed = w => button(w).element.disabled;
const choices = (w, n) => w.wrapper.findAll(".ui-field")[n].findAll(".ui-field-choice");
const lit = (w, n) => choices(w, n).filter(c => c.classes("mod-cta")).map(c => c.text());
const inputs = w => w.wrapper.findAll("input");

test("New watch item: Title, Type, Status (to watch lit), Rating 1–10; needs a type", async () => {
  const { files } = vault();
  const running = openWindow(win.item, { kind: "watch", dir: KINDS.watch.folder });
  const w = await windows.next();

  assert.equal(w.title, "✦ New watch item");
  assert.deepEqual(names(w), ["Title", "Type", "Status", "Rating"]);
  assert.equal(inputs(w)[0].attributes("placeholder"), "title");
  assert.deepEqual(choices(w, 1).map(c => c.text()), KINDS.watch.types.map(t => t.label));
  assert.deepEqual(lit(w, 1), []);
  assert.deepEqual(lit(w, 2), ["to watch"]);
  assert.deepEqual(choices(w, 3).map(c => c.text()),
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  assert.deepEqual(lit(w, 3), []);
  assert.equal(button(w).text(), "Create");

  await inputs(w)[0].setValue(" Moon Tales ");
  assert.equal(greyed(w), true);   // no type yet
  await choices(w, 1)[5].trigger("click");
  assert.equal(greyed(w), false);   // the rating is optional
  await choices(w, 3)[6].trigger("click");
  await w.submit();

  const path = `${KINDS.watch.folder}/Moon Tales.md`;
  assert.deepEqual(await running, { path });
  assert.match(files[path], /^---\ntype: watch\nmedia_type: anime\nstatus: to_watch\nrating: 7\n/);
});

test("New game: a Genre text instead of the Type; Create needs only the title", async () => {
  const { files } = vault();
  const running = openWindow(win.item, { kind: "game", dir: KINDS.game.folder });
  const w = await windows.next();

  assert.equal(w.title, "✦ New game");
  assert.deepEqual(names(w), ["Title", "Genre", "Status", "Rating"]);
  assert.deepEqual(inputs(w).map(i => i.attributes("placeholder")), ["title", "optional"]);
  assert.deepEqual(lit(w, 2), ["to play"]);
  assert.equal(greyed(w), true);
  await inputs(w)[0].setValue("Star Garden");
  await inputs(w)[1].setValue("cozy");
  assert.equal(greyed(w), false);
  await w.submit();

  const path = `${KINDS.game.folder}/Star Garden.md`;
  assert.deepEqual(await running, { path });
  assert.match(files[path], /\nstatus: to_play\ngenre: cozy\nrating:\nhours:\n/);
});

test("New journal: Title, a list of reasons, Days after a meal 0; Create greyed without a title",
  async () => {
    const { files } = vault();
    const running = openWindow(win.journal);
    const w = await windows.next();

    assert.equal(w.title, "✦ New journal");
    assert.deepEqual(names(w), ["Title", "Reasons", "Days after a meal"]);
    assert.deepEqual(w.wrapper.findAll(".ui-field-list__line--head .ui-field-list__cell")
      .map(c => c.text()), ["Reason", ""]);
    assert.deepEqual(inputs(w).map(i => i.attributes("placeholder")),
      ["Высыпания", "🍰 сладкое", "0"]);
    assert.equal(inputs(w)[2].element.value, "0");
    assert.equal(button(w).text(), "Create");
    assert.equal(greyed(w), true);

    await inputs(w)[0].setValue("Skin");
    await inputs(w)[1].setValue("🍰 sweets");
    await w.wrapper.find(".ui-field-list__more button").trigger("click");
    await w.wrapper.find(".ui-field-list__more button").trigger("click");
    await inputs(w)[2].setValue("😴 sleep");
    await inputs(w)[4].setValue("1");
    assert.equal(greyed(w), false);
    await w.submit();

    const path = `${KINDS.journal.folder}/Skin.md`;
    assert.deepEqual(await running, { path });
    assert.ok(files[path].startsWith(
      '---\ntype: journal\nlag: 1\nreasons:\n  - "🍰 sweets"\n  - "😴 sleep"\n---\n'));
  });

test("Buy reward: Name and a number Cost required; not enough gold: a notice, false", async () => {
  const { files } = vault();
  taskStore.put(MASTER, "- [x] t1");
  taskStore.putRecords({ t1: { difficulty: "epic" } });
  const poor = openWindow(win.buy);
  const w = await windows.next();

  assert.equal(w.title, "✦ Buy reward");
  assert.deepEqual(names(w), ["Name", "Cost"]);
  assert.deepEqual(inputs(w).map(i => i.attributes("placeholder")), ["what you bought", "coins"]);
  assert.equal(inputs(w)[1].attributes("type"), "number");
  assert.equal(button(w).text(), "Buy");
  assert.equal(greyed(w), true);
  await inputs(w)[0].setValue("Kite");
  assert.equal(greyed(w), true);
  await inputs(w)[1].setValue("100000");
  await w.submit();
  assert.equal(await poor, false);
  assert.equal(Notice.last, "✦ Not enough gold for Kite");
  assert.equal(`${PURCHASES}.md` in files, false);

  const rich = openWindow(win.buy);
  const again = await windows.next();

  await inputs(again)[0].setValue("Tea");
  await inputs(again)[1].setValue("1");
  await again.submit();
  assert.equal(await rich, true);
  assert.match(files[`${PURCHASES}.md`], /- 2026-11-20 \| Tea \| 1\n$/);
  taskStore.put(MASTER, "");
  taskStore.putRecords({});
});

test("Pomodoro & Meditation: lengths from the settings, Save greyed while one is empty or 0",
  async () => {
    const settings = { focusMin: 25, breakMin: 5, meditationMin: 10, music: "bells", extra: 1 };
    const running = openWindow(win.pomodoro, { settings });
    const w = await windows.next();

    assert.equal(w.title, "✦ Pomodoro & Meditation");
    assert.deepEqual(names(w), ["Focus", "Break", "Meditation", "Music"]);
    assert.deepEqual(inputs(w).map(i => [i.attributes("placeholder"), i.element.value]),
      [["minutes", "25"], ["minutes", "5"], ["minutes", "10"]]);
    // the divider sits between Break and Meditation
    assert.equal(w.wrapper.find("hr").element.nextElementSibling.textContent.trim()
      .startsWith("Meditation"), true);
    assert.deepEqual(choices(w, 3).map(c => c.text()), ["—", "Pad", "Bells", "Harp"]);
    assert.deepEqual(lit(w, 3), ["Bells"]);
    assert.equal(button(w).text(), "Save");

    await inputs(w)[1].setValue("");
    assert.equal(greyed(w), true);
    await inputs(w)[1].setValue("0");
    assert.equal(greyed(w), true);
    await inputs(w)[1].setValue("7");
    assert.equal(greyed(w), false);
    await choices(w, 3)[0].trigger("click");
    await w.submit();
    assert.deepEqual(await running,
      { focusMin: 25, breakMin: 7, meditationMin: 10, music: null, extra: 1 });
    assert.equal(settings.breakMin, 5);   // the settings given are not changed
  });

// the commands as Cmd+P runs them: a fake plugin collects them
const commands = async () => {
  const list = {}, opened = [];
  const { app } = vault();

  app.workspace.getLeaf = () => ({ openFile: async f => opened.push(f.path) });
  registerCommands({
    app, loadData: async () => ({}),
    addCommand: c => { list[c.id] = c.callback; },
  });
  return { list, opened };
};

test("the New … commands: their windows, then the new note opened in a tab", async () => {
  const { list, opened } = await commands();

  const read = list["new-read-item"]();
  const item = await windows.next();

  assert.equal(item.component, win.item);
  assert.deepEqual(item.props, { kind: "read", dir: KINDS.read.folder });
  await item.close();
  await read;

  const recipe = list["new-recipe"]();
  const title = await windows.next();

  assert.deepEqual(title.props, {
    title: "✦ New recipe", name: "Title", placeholder: "title", required: true, submit: "Create",
  });
  await title.wrapper.find("input").setValue("Plum pie");
  await title.submit();
  await recipe;

  const journal = list["new-journal"]();
  const pick = await windows.next();

  assert.equal(pick.component, win.journal);
  await pick.close();
  await journal;
  assert.deepEqual(opened, [`${KINDS.recipe.folder}/Plum pie.md`]);
});

test("Buy reward command: opens its window", async () => {
  const { list } = await commands();
  const running = list["buy-reward"]();
  const w = await windows.next();

  assert.equal(w.component, win.buy);
  await w.close();
  await running;
});
