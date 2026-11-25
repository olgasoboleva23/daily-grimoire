// Project and stage reads and writes, including task links checked against the current stage.
import { Notice } from "obsidian";
import { app as vaultApp } from "#/helpers/app.js";
import { nextId } from "#/helpers/ids.js";
import { MASTER, PROJECTS } from "#/helpers/paths.js";
import { edit, readJson } from "#/helpers/files.js";
import { importCover } from "#/helpers/images.js";
import { notes, projects } from "#/store/tasks.js";
import { parseNote } from "#/models/taskFile.js";
import { Task } from "#/models/task.js";
import { editTaskLine } from "#/controllers/tasks.js";

export const createProject = ({ name, description = "", status = "active", cover = null }) =>
  projects.add({ name, status, description, result: "", notes: "", cover, stages: [] }, "p");

export async function newProject({ name, description, status, cover: file }, upload = importCover) {
  name = name?.trim();
  if (!name) return null;

  const cover = file ? await upload(vaultApp, file) : null;

  if (file && !cover) return null;
  return createProject({ name, description: description ?? "", status, cover });
}

// merge fields (name, status, description, result, notes, cover) into a project
export const saveProject = (key, patch) => projects.update(key, p => ({ ...p, ...patch }));

// Changes outside the edited fields can happen while the project window is open.
const editable = p => [p.name, p.description ?? "", p.cover ?? null, p.showInCalendar !== false];
const sameEdit = (p, before) =>
  p && JSON.stringify(editable(p)) === JSON.stringify(editable(before));

export const changedProject = () => new Notice("✦ project changed or was deleted; open it again");

export const readProject = async key => (await readJson(PROJECTS, {}))[key] ?? null;

export async function editProject(
  key, { name, description, cover: file, showInCalendar }, before, upload = importCover,
) {
  name = name?.trim();
  if (!name) return false;
  if (!before || (file && !sameEdit(await readProject(key), before))) {
    changedProject();
    return false;
  }

  const cover = file ? await upload(vaultApp, file) : before.cover ?? null;

  if (file && !cover) return false;
  const patch = { name, description: description ?? "", cover,
    showInCalendar: showInCalendar !== false };
  const saved = await projects.update(key, p => sameEdit(p, before) ? { ...p, ...patch } : null);

  if (!saved) changedProject();
  return saved;
}

// Check the snapshot from the confirmation and keep covers referenced by another project.
export async function deleteProject(key, before, trash = f => vaultApp.fileManager.trashFile(f)) {
  if (!before) return false;
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
  const file = before.cover && !shared && vaultApp.vault.getFileByPath(before.cover);

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

export async function renameStage(key, index, name, next) {
  next = next?.trim();

  if (!next || next === name) return false;
  return onStage(key, index, name, (st, i) => st.map((s, j) => j === i ? { ...s, name: next } : s));
}

export async function readStage(key, index, name) {
  const stage = (await readProject(key))?.stages?.[index];

  return stage && stage.name === name ? stage : null;
}

export async function deleteStage(key, index, before, { deleteTasks }) {
  if (!before) return false;
  const stageId = before.id;
  const exclusive = new Set(deleteTasks ? before.tasks : []);
  const saved = await projects.edit(all => {
    const stages = all[key]?.stages;
    const stage = stages?.[index];

    if (!stage || stage.id !== stageId || stage.name !== before.name
      || JSON.stringify(stage.tasks) !== JSON.stringify(before.tasks)) {
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

export async function addLink(key, { title, url }) {
  url = url?.trim() ?? "";

  if (!isWebUrl(url)) {
    new Notice("✦ a link must be a web address");
    return false;
  }

  return projects.update(key, p => ({
    ...p, links: [...p.links ?? [], { title: title?.trim() || url, url }],
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

export async function addTaskToStage(key, index, stageName, id) {
  if (!id) return false;
  return projects.update(key, p => {
    const stage = p.stages?.[index];

    if (!stage || stage.name !== stageName) {
      new Notice("✦ project changed, try again");
      return null;
    }

    return {
      ...p,
      stages: p.stages.map((st, i) => i !== index || st.tasks.includes(id) ? st
        : { ...st, tasks: [...st.tasks, id] }),
    };
  });
}

// a task on a calendar day
export const toCalendar = (t, date) => editTaskLine(t, l => new Task(l).setDue(date));
