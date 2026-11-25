// Filling and saving the shared project prompts with made-up data.
import { projectStore } from "#/entities/project/index.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { copyStartPrompt } from "#/pages/projects/ui/prompt.js";
import { savePrompts } from "#/pages/projects/ui/PromptsWindow/save.js";
import { fillStart, PROMPT_VARIABLES } from "#/pages/projects/model/prompt.js";
import config, { CONFIG } from "#/shared/config/index.js";
import { vault } from "./stubs/vault.mjs";

test("literal project text and an empty journal in a Start prompt", () => {
  assert.equal(fillStart("{Project_Name}\n{Last_3_Journal_Entries}\n{Current_Task_Or_Input}",
    { name: "$&", result: "", notes: "" }, [], "$1"), "$&\n$1");
});

test("the Start prompt's label describes each supported variable", () => {
  for (const name of ["Project_Name", "Project_Result", "Project_Notes",
    "Last_3_Journal_Entries", "Current_Task_Or_Input"]) {
    assert.match(PROMPT_VARIABLES, new RegExp(`\\{${name}\\} — \\S`));
    assert.notEqual(fillStart(`{${name}}x`, { name: "N", result: "R", notes: "O" },
      [{ at: "2026-11-20T10:00", heading: "H", text: "T" }], "I"), `{${name}}x`);
  }
});

test("savePrompts trims both templates, updates the config and keeps other keys", async t => {
  const { files } = vault({ [CONFIG]: '{"theme":"gothic"}' });
  const { promptStart, promptFinal } = config;
  t.after(() => Object.assign(config, { promptStart, promptFinal }));

  await savePrompts({ promptStart: "  Start {Project_Name}\n", promptFinal: " Final " });

  assert.deepEqual(JSON.parse(files[CONFIG]), {
    theme: "gothic", promptStart: "Start {Project_Name}", promptFinal: "Final",
  });
  assert.equal(config.promptStart, "Start {Project_Name}");
  assert.equal(config.promptFinal, "Final");
});

test("copyStartPrompt copies the filled template with the supplied task", async t => {
  const own = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const start = config.promptStart;
  const values = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true, value: { writeText: async text => values.push(text) },
  });
  projectStore.putProjects({ p1: { name: "Garden", result: "A plan" } });
  config.promptStart = "{Project_Name}\n{Project_Result}\n{Current_Task_Or_Input}";
  t.after(() => {
    config.promptStart = start;
    projectStore.putProjects({});
    if (own) Object.defineProperty(navigator, "clipboard", own);
    else delete navigator.clipboard;
  });

  await copyStartPrompt("p1", "Choose seeds");
  assert.deepEqual(values, ["Garden\nA plan\nChoose seeds"]);
  assert.equal(Notice.last, "Промпт скопирован");
});
