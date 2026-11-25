// Copy and save the project session prompts.
import { fillStart, journalOf, noteStore } from "#/pages/projects/index.js";
import { projectStore } from "#/entities/project/index.js";
import { Notice } from "obsidian";
import config, { CONFIG } from "#/shared/config/index.js";
import { editJson } from "#/shared/vault/index.js";
import { taskStore } from "#/entities/task/index.js";

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    new Notice("Промпт скопирован");
  } catch {
    new Notice("Не удалось скопировать промпт");
  }
}

export async function copyStartPrompt(projectKey, task) {
  const project = projectStore.projects.get(projectKey);

  if (!project) return;
  const entries = journalOf(projectKey, { projects: projectStore.projects, tasks: taskStore.records,
    notes: noteStore.notes });

  await copy(fillStart(config.promptStart, project, entries, task ?? ""));
}

export const copyFinalPrompt = () => copy(config.promptFinal);

export async function savePrompts({ promptStart, promptFinal }) {
  const patch = { promptStart: promptStart.trim(), promptFinal: promptFinal.trim() };

  await editJson(CONFIG, current => ({ ...current, ...patch }));
  Object.assign(config, patch);
}
