// The writes of projects.json (a project by key p1, p2…): one write each (the projects collection),
// so two writes never lose each other. A stage found changed meanwhile (another device) writes
// nothing.
import { Notice } from "obsidian";
import config from "#/helpers/config.js";
import { CONFIG, PROJECTS } from "#/helpers/paths.js";
import { editJson, readJson } from "#/helpers/files.js";
import { importCover } from "#/helpers/images.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { openUi } from "#/components/app/open.ts";
import { projects } from "#/store/tasks.js";
import { Task } from "#/models/task.js";
import { editTaskLine, newTask } from "#/controllers/tasks.js";

export const createProject = ({ name, description = "", status = "active", cover = null }) =>
  projects.add({ name, status, description, result: "", notes: "", cover, stages: [] }, "p");

const defaultPrompt = [
  "Подведи итог нашей работы над проектом «{{project}}» по этому диалогу.",
  "Что удалось сделать или выяснить? Какие решения я приняла, на чём они основаны",
  "и что пока остаётся открытым?",
  "\n\nРазличай то, что я рассматривала, выбрала и уже сделала. Учитывай мои последние уточнения.",
  "Сохрани конкретные детали, которые пригодятся дальше. Если из разговора чего-то нельзя",
  "установить, скажи об этом. Напиши компактно, чтобы я могла вставить ответ в Result.",
].join(" ").replace(" \n", "\n");

export async function editProjectPrompt(app) {
  const prompt = config.projectPrompt || defaultPrompt;
  const v = await Form.ask(app, "Промпт для подведения итогов", [
    { name: "Название проекта — {{project}}", key: "prompt", text: "", lines: true },
  ], { values: { prompt }, required: ["prompt"], submit: "Сохранить" });

  if (!v?.prompt?.trim()) return;
  const projectPrompt = v.prompt.trim();

  await editJson(CONFIG, current => ({ ...current, projectPrompt }));
  config.projectPrompt = projectPrompt;
}

export async function copyProjectPrompt(name) {
  const prompt = config.projectPrompt || defaultPrompt;
  const text = prompt.includes("{{project}}")
    ? prompt.replaceAll("{{project}}", () => name) : `Проект: ${name}\n\n${prompt}`;

  try {
    await navigator.clipboard.writeText(text);
    new Notice("Промпт скопирован");
  } catch {
    new Notice("Не удалось скопировать промпт в буфер обмена");
  }
}

const STATUSES = ["idea", "active", "paused", "done"];
const projectFields = [
  { name: "Name", key: "name", text: "what it is" },
  { name: "Description", key: "description", text: "a line about it", lines: true },
  { name: "Cover", key: "cover", file: "image/*,.heic,.heif,.tif,.tiff" },
];

// A local cover is imported only after submission, then the new project's page is opened.
export async function askNewProject(
  app, ask = (...a) => Form.ask(...a), upload = importCover, open = openUi,
) {
  const v = await ask(app, "✦ New project", [
    ...projectFields,
    {
      name: "Status", key: "status",
      options: STATUSES.map(s => ({ label: `${s[0].toUpperCase()}${s.slice(1)}`, value: s })),
    },
  ], { values: { status: "active" }, required: ["name"], submit: "Create" });

  if (!v?.name?.trim()) return null;
  const cover = v.cover ? await upload(app, v.cover) : null;

  if (v.cover && !cover) return null;
  const key = await createProject({
    name: v.name.trim(), description: v.description ?? "", status: v.status,
    cover,
  });
  await open("projects", { open: key });
  return key;
}

// merge fields (name, status, description, result, notes, cover) into a project
export const saveProject = (key, patch) => projects.update(key, p => ({ ...p, ...patch }));

// Only these fields belong to this form: changes to stages/status/notes may happen meanwhile.
const editable = p => [p.name, p.description ?? "", p.cover ?? null, p.showInCalendar !== false];
const changedProject = () => new Notice("✦ project changed or was deleted; open it again");

export async function askEditProject(
  app, key, ask = (...a) => Form.ask(...a), upload = importCover,
) {
  const before = (await readJson(PROJECTS, {}))[key];

  if (!before) return void changedProject();
  const v = await ask(app, "✦ Edit project", [
    ...projectFields,
    { name: "Показывать во вкладке Projects календаря", key: "showInCalendar",
      check: "Запланированные задачи остаются в своих днях" },
  ], {
    values: { name: before.name, description: before.description ?? "",
      showInCalendar: before.showInCalendar !== false },
    required: ["name"], submit: "Save",
  });

  if (!v?.name?.trim()) return;
  const cover = v.cover ? await upload(app, v.cover) : before.cover ?? null;

  if (v.cover && !cover) return;
  const saved = await projects.update(key, p => {
    if (JSON.stringify(editable(p)) !== JSON.stringify(editable(before))) return null;
    return { ...p, name: v.name.trim(), description: v.description ?? "", cover,
      showInCalendar: v.showInCalendar !== false };
  });

  if (!saved) changedProject();
}

// `trash`: moves a file to Obsidian's trash (injected for the tests)
export async function askDeleteProject(
  app, key, ask = (...a) => Form.ask(...a), trash = f => app.fileManager.trashFile(f),
) {
  const before = (await readJson(PROJECTS, {}))[key];

  if (!before) return false;
  const yes = await ask(app, "Delete project?", [
    { name: "Project", key: "name", label: true },
    { name: "Kept", key: "kept", label: true },
  ], {
    values: {
      name: before.name,
      kept: "Tasks, calendar and history stay."
        + (before.cover ? " The cover goes to the trash." : ""),
    },
    submit: "Delete",
  });

  if (!yes) return false;
  let shared = false;
  const saved = await projects.edit(all => {
    if (JSON.stringify(all[key]) !== JSON.stringify(before)) return null;
    delete all[key];
    shared = Object.values(all).some(p => p?.cover === before.cover);
    return all;
  });

  if (!saved) {
    changedProject();
    return saved;
  }

  const file = before.cover && !shared && app.vault.getFileByPath(before.cover);

  if (file) await trash(file);
  return saved;
}

// a stage is found by index and name, so one that moved or changed meanwhile is not written
function onStage(key, index, name, change) {
  return projects.update(key, p => {
    if (p.stages?.[index]?.name !== name) {
      new Notice("✦ project changed, try again");
      return null;
    }

    return { ...p, stages: change(p.stages, index) };
  });
}

export async function askRenameStage(app, key, index, name, ask = (...a) => Form.ask(...a)) {
  const v = await ask(app, "✦ Rename stage", [{ name: "Name", key: "name", text: "" }],
    { values: { name }, required: ["name"], submit: "Save" });
  const next = v?.name?.trim();

  if (!next || next === name) return false;
  return onStage(key, index, name, (st, i) => st.map((s, j) => j === i ? { ...s, name: next } : s));
}

// the stage's tasks stay tasks: only the stage leaves the project
export async function askDeleteStage(app, key, index, name, ask = (...a) => Form.ask(...a)) {
  const yes = await ask(app, "Delete stage?", [
    { name: "Stage", key: "name", label: true },
    { name: "Kept", key: "kept", label: true },
  ], { values: { name, kept: "Its tasks stay as tasks." }, submit: "Delete" });

  if (!yes) return false;
  return onStage(key, index, name, (st, i) => st.filter((_, j) => j !== i));
}

// web links of a project: [{ title, url }], none in the older projects
export const isWebUrl = u => /^https?:\/\/\S+$/i.test(u);

export async function askAddLink(app, key, ask = (...a) => Form.ask(...a)) {
  const v = await ask(app, "✦ New link", [
    { name: "Title", key: "title", text: "what it is" },
    { name: "URL", key: "url", text: "https://…" },
  ], { required: ["url"], submit: "Add" });
  const url = v?.url?.trim();

  if (!url) return false;
  if (!isWebUrl(url)) {
    new Notice("✦ a link must be a web address");
    return false;
  }

  return projects.update(key, p => ({
    ...p, links: [...p.links ?? [], { title: v.title?.trim() || url, url }],
  }));
}

// by index and url, so a link that moved meanwhile is not removed instead
export const removeLink = (key, index, url) => projects.update(key, p =>
  p.links?.[index]?.url === url ? { ...p, links: p.links.filter((_, i) => i !== index) } : null);

export const addStage = (key, name) => projects.update(key, p =>
  ({ ...p, stages: [...p.stages ?? [], { name, tasks: [] }] }));

// a new task (`ask`: the New task flow) on a stage: found by index and name, so a stage that moved
// meanwhile is not written to. null when cancelled or changed.
export async function addToStage(key, index, stageName, ask = newTask) {
  const id = await ask();

  if (!id) return null;
  const saved = await projects.update(key, p => {
    const stage = p.stages?.[index];

    if (stage?.name !== stageName) {
      new Notice("✦ project changed, try again");
      return null;
    }

    return {
      ...p,
      stages: p.stages.map((st, i) => i !== index || st.tasks.includes(id) ? st
        : { ...st, tasks: [...st.tasks, id] }),
    };
  });

  return saved ? id : null;
}

// a task on a calendar day
export const toCalendar = (t, date) => editTaskLine(t, l => new Task(l).setDue(date));
