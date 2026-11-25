// Saves validated settings to config.json, applies them and moves tasks for checked area changes.
import { Notice } from "obsidian";
import { applyConfig } from "#/helpers/config.js";
import { editJson } from "#/helpers/files.js";
import { CONFIG } from "#/helpers/paths.js";
import { taskStore } from "#/store/tasks.js";
import { saveRecords } from "#/controllers/tasks.js";
import { areaMoves, toConfig } from "#/models/settings.js";

export async function saveSettings(values) {
  const json = toConfig(values);
  const moves = areaMoves(values, taskStore.records);
  const moved = Object.keys(moves).length;

  let merged;

  await editJson(CONFIG, current => (merged = { ...current, ...json }));
  applyConfig(merged);
  if (moved) await saveRecords(moves);
  new Notice(`✦ Settings saved${moved ? ` · ${moved} tasks moved` : ""}`);
  return { moved };
}
