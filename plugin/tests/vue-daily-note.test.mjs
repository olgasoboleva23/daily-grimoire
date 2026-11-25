import "./stubs/dom.mjs";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";

let mount, DailyNoteOpen;
before(async () => {
  ({ mount } = await import("@vue/test-utils"));
  DailyNoteOpen = (await import("#/widgets/daily-note/index.js")).dailyNoteWidget.view;
});

test("Daily note: ✦ Open for the page's date opens its note; no date, no button", async () => {
  const opened = [], { app } = vault({ "2026-11-04.md": "" });
  app.workspace.openLinkText = async p => opened.push(p);
  const w = mount(DailyNoteOpen, { props: { state: { data: { date: "2026-11-04", text: "✦ Open" } } } });
  assert.equal(w.find('[aria-label^="open the day"]').text(), "✦ Open");
  assert.equal(w.find('[aria-label^="open the day"]').attributes("aria-label"), "open the day's note");
  await w.find('[aria-label^="open the day"]').trigger("click");
  await new Promise(r => setTimeout(r));
  assert.deepEqual(opened, ["2026-11-04"]);
  const none = mount(DailyNoteOpen, { props: { state: { data: { date: undefined, text: "✦" } } } });
  assert.equal(none.find('[aria-label^="open the day"]').exists(), false);
});

test("openDaily from a app tab opens the note in a new tab", async () => {
  const { openDaily } = await import("#/widgets/daily-note/index.js");
  const { UiView } = await import("#/app/tab/view.ts");
  const { app } = vault({ "2026-11-04.md": "" });
  const opened = [];

  app.workspace.openLinkText = async (...a) => opened.push(a);
  await openDaily("2026-11-04");
  app.workspace.getActiveViewOfType = () => Object.create(UiView.prototype);
  await openDaily("2026-11-04");
  assert.deepEqual(opened, [["2026-11-04", "", false], ["2026-11-04", "", true]]);
});
