// Manage one project, its stages and links, and match its stages to task models supplied by a page.
import { Notice } from "obsidian";
import { app as vaultApp } from "#/shared/host/index.js";
import { nextId } from "#/shared/lib/ids.js";
import { importCover } from "#/shared/vault/index.js";
import { projects, readProject } from "./repository/projects.js";
import { isWebUrl } from "../contract/project.js";

export const STATUSES = ["idea", "active", "paused", "done"]
  .map(s => ({ label: `${s[0].toUpperCase()}${s.slice(1)}`, value: s }));

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

// Build one index for all stages. An open line takes precedence over a done line.
export function stageIndex(tasks) {
  const lines = new Map();

  for (const task of tasks) {
    const id = task.id;

    if (!id || !(task.isOpen || task.isDone)) continue;
    if (!lines.has(id) || (task.isOpen && lines.get(id).done)) {
      lines.set(id, { id, t: task.src, done: task.isDone });
    }
  }

  return lines;
}

// A stage's tasks, each once, in the stage's order.
export function stageTasks(stage, lines) {
  return [...new Set(stage.tasks ?? [])].map(id => lines.get(id)).filter(Boolean);
}

// the projects with open tasks (a Done one too: its undated tasks show nowhere else), each with
// its stages' open tasks (a stage with none is left out), and how many that is, in file order:
// [{ key, title, stages: [{ name, entries }], open }]
export function openProjects(projects, tasks) {
  const index = stageIndex(tasks);

  return [...projects].filter(([, p]) => p.showInCalendar !== false).map(([key, p]) => {
    const stages = (p.stages ?? [])
      .map(s => ({ name: s.name, entries: stageTasks(s, index).filter(e => !e.done) }))
      .filter(s => s.entries.length);

    return { key, title: p.name, stages, open: stages.reduce((n, s) => n + s.entries.length, 0) };
  }).filter(p => p.stages.length);
}


// Removing a project also determines whether another project still needs its cover.
export async function removeProjectRecord(key, before) {
  if (!before) return null;
  let shared = false;
  const saved = await projects.edit(all => {
    if (JSON.stringify(all[key]) !== JSON.stringify(before)) return null;
    delete all[key];
    shared = Object.values(all).some(p => p?.cover === before.cover);
    return all;
  });

  if (!saved) {
    changedProject();
    return null;
  }

  return { unusedCover: shared ? null : before.cover };
}

// Check the confirmed stage and find tasks that no remaining stage uses in the same write.
export async function removeStageRecord(key, index, before, deleteTasks) {
  if (!before) return null;
  const exclusive = new Set(deleteTasks ? before.tasks : []);
  const saved = await projects.edit(all => {
    const stages = all[key]?.stages;
    const stage = stages?.[index];

    if (!stage || stage.id !== before.id || stage.name !== before.name
      || JSON.stringify(stage.tasks) !== JSON.stringify(before.tasks)) {
      changedProject();
      return null;
    }

    stages.splice(index, 1);
    if (exclusive.size) for (const p of Object.values(all))
      for (const other of p.stages ?? []) for (const id of other.tasks) exclusive.delete(id);
    return all;
  });

  return saved ? exclusive : null;
}
