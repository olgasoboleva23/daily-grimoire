// Copy a project's filled session prompt or the final prompt to the clipboard.
import { Notice } from "obsidian";
import config from "#/shared/config/index.js";
import { projectStore } from "#/entities/project/index.js";
import { taskStore } from "#/entities/task/index.js";
import { noteStore } from "../model/store.js";
import { fillStart } from "../model/prompt.js";
import { journalOf } from "../model/journal.js";

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
