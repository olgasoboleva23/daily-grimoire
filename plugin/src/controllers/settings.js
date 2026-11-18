// ⚙ Settings (the app tab's drawer, Daily Grimoire: Settings): the window, then config.json written
// (the task store reads it back into helpers/config.js and everything draws again) and, for an
// area whose key changed with ☑ apply, its tasks' records moved to the new key. Values that can't
// be saved: a notice, nothing written.
import { Notice } from "obsidian";
import config, { applyConfig } from "#/helpers/config.js";
import { editJson } from "#/helpers/files.js";
import { CONFIG } from "#/helpers/paths.js";
import { taskStore } from "#/store/tasks.js";
import { saveRecords } from "#/controllers/tasks.js";
import { settingsWindow } from "#/components/uikit/SettingsWindow/index.js";
import { areaMoves, settingsProblem, settingsValues, toConfig } from "#/models/settings.js";

export async function openSettings() {
  const v = await settingsWindow(config, settingsValues(config));

  if (!v) return;
  const problem = settingsProblem(v, taskStore.records, config);

  if (problem) return void new Notice(`✦ Settings not saved: ${problem}`);
  const json = toConfig(v);
  const moves = areaMoves(v, taskStore.records);
  const moved = Object.keys(moves).length;

  let merged;

  await editJson(CONFIG, current => (merged = { ...current, ...json }));
  applyConfig(merged);
  if (moved) await saveRecords(moves);
  new Notice(`✦ Settings saved${moved ? ` · ${moved} tasks moved` : ""}`);
}
