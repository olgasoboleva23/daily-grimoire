// The writes of projects.json (a project by key p1, p2…): one write each (the projects collection),
// so two writes never lose each other. A stage found changed meanwhile (another device) writes
// nothing.
import { Notice } from "obsidian";
import { nextId } from "#/helpers/ids.js";
import { MASTER, PROJECTS } from "#/helpers/paths.js";
import { edit, readJson } from "#/helpers/files.js";
import { importCover } from "#/helpers/images.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { openUi } from "#/components/app/open.ts";
import { notes, projects } from "#/store/tasks.js";
import { parseNote } from "#/models/taskFile.js";
import { Task } from "#/models/task.js";
import { editTaskLine, newTask } from "#/controllers/tasks.js";

export const createProject = ({ name, description = "", status = "active", cover = null }) =>
  projects.add({ name, status, description, result: "", notes: "", cover, stages: [] }, "p");

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
      kept: "Journal entries are deleted. Tasks, calendar and history stay."
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

  await notes.edit(all => {
    const owned = Object.entries(all)
      .filter(([, n]) => n.owner?.kind === "project" && n.owner.id === key);

    if (!owned.length) return null;
    for (const [id] of owned) delete all[id];
    return all;
  });
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

export async function askDeleteStage(app, key, index, name, ask = (...a) => Form.ask(...a)) {
  const before = (await readJson(PROJECTS, {}))[key]?.stages?.[index];

  if (!before || before.name !== name) return false;
  const yes = await ask(app, "Delete stage?", [
    { name: "Stage", key: "name", label: true },
    { name: "Также удалить задачи этапа", key: "deleteTasks",
      check: "Только открытые копии без даты. Задачи других этапов сохранятся." },
  ], { values: { name, deleteTasks: false }, submit: "Delete" });

  if (!yes) return false;
  const stageId = before.id;
  const exclusive = new Set(yes.deleteTasks ? before.tasks : []);
  const saved = await projects.edit(all => {
    const stages = all[key]?.stages;
    const stage = stages?.[index];

    if (stage?.id !== stageId || stage?.name !== name
      || (yes.deleteTasks && JSON.stringify(stage.tasks) !== JSON.stringify(before.tasks))) {
      changedProject();
      return null;
    }

    stages.splice(index, 1);
    if (exclusive.size) for (const p of Object.values(all))
      for (const other of p.stages ?? []) for (const id of other.tasks) exclusive.delete(id);
    return all;
  });

  if (saved) await notes.edit(all => {
    const related = Object.values(all)
      .filter(n => n.target.kind === "stage" && n.target.id === stageId);

    if (!related.length) return null;
    for (const n of related) n.target = { kind: "project", id: key };
    return all;
  });
  if (saved && exclusive.size) {
    try {
      await edit(MASTER, text => {
        const remove = new Set();

        for (const item of parseNote(MASTER, text)) {
          const t = Task.of(item);

          if (t.isOpen && exclusive.has(t.id) && !t.date && !t.fields.start) remove.add(item.line);
        }

        return text.split("\n").filter((_, i) => !remove.has(i)).join("\n");
      });
    } catch (error) {
      new Notice("Этап удалён, но удалить открытые задачи без даты не удалось.");
      throw error;
    }
  }

  return saved;
}

// web links of a project: [{ title, url }], none in the older projects
const isWebUrl = u => /^https?:\/\/\S+$/i.test(u);

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

export const addStage = (key, name) => projects.edit(all => {
  const p = all[key];

  if (!p) return null;
  const ids = Object.values(all).flatMap(project => (project.stages ?? []).map(s => s.id));
  const id = nextId("st", ids);

  p.stages = [...p.stages ?? [], { id, name, tasks: [] }];
  return all;
});

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
