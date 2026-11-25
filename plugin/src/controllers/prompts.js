// Fill, copy and save the shared project prompts. Export the Start prompt's variable help.
import { Notice } from "obsidian";
import config from "#/helpers/config.js";
import { CONFIG } from "#/helpers/paths.js";
import { editJson } from "#/helpers/files.js";
import { taskStore } from "#/store/tasks.js";
import { journalOf } from "#/models/journal.js";
import { Form } from "#/components/uikit/Form/index.ts";

export function fillStart(template, project, entries, input) {
  const journal = entries.slice(0, 3).map(e =>
    `${e.at.slice(0, 10)} · ${e.heading} — ${e.text}`.replace(/\s*\n\s*/g, " ")).join("\n");
  const fields = { Project_Name: project.name, Project_Result: project.result ?? "",
    Project_Notes: project.notes ?? "", Last_3_Journal_Entries: journal,
    Current_Task_Or_Input: input };

  return template.split("\n").filter(l => journal || l.trim() !== "{Last_3_Journal_Entries}")
    .join("\n")
    .replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(fields, key) ? fields[key] : match);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    new Notice("Промпт скопирован");
  } catch {
    new Notice("Не удалось скопировать промпт");
  }
}

export async function copyStartPrompt(projectKey, task) {
  const project = taskStore.projects.get(projectKey);

  if (!project) return;
  const entries = journalOf(projectKey, { projects: taskStore.projects, tasks: taskStore.records,
    notes: taskStore.notes });

  await copy(fillStart(config.promptStart, project, entries, task ?? ""));
}

export const copyFinalPrompt = () => copy(config.promptFinal);

// the Start prompt's variables and what each becomes (fillStart fills them; listed when editing)
const VARIABLES = [
  ["Project_Name", "название проекта"],
  ["Project_Result", "Result проекта (к чему идём)"],
  ["Project_Notes", "Notes проекта (начальные условия)"],
  ["Last_3_Journal_Entries", "три последние записи журнала; нет записей — строка убирается"],
  ["Current_Task_Or_Input", "задача на сессию, спрашивается перед копированием"],
];

export const PROMPT_VARIABLES = VARIABLES.map(([name, what]) => `{${name}} — ${what}`).join("\n");

export async function savePrompts({ promptStart, promptFinal }) {
  const patch = { promptStart: promptStart.trim(), promptFinal: promptFinal.trim() };

  await editJson(CONFIG, current => ({ ...current, ...patch }));
  Object.assign(config, patch);
}

// TODO: Remove with the Form import after U2b switches prompt editing to the Vue window.
export async function editPrompts(app) {
  const v = await Form.ask(app, "Промпты проекта", [
    { tab: "Start", name: "Start", key: "promptStart", text: "", lines: true },
    { tab: "Start", name: "Переменные", key: "vars", label: true },
    { tab: "Final", name: "Final", key: "promptFinal", text: "", lines: true },
    { tab: "Final", name: "Переменные", key: "none", label: true },
  ], { values: { promptStart: config.promptStart, promptFinal: config.promptFinal,
    vars: PROMPT_VARIABLES, none: "нет: копируется как есть" },
    required: ["promptStart", "promptFinal"], submit: "Сохранить" });

  if (v) await savePrompts(v);
}
