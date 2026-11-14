// The writes of projects.json (a project by key p1, p2…): one write each (the projects collection),
// so two writes never lose each other. A stage found changed meanwhile (another device) writes
// nothing.
import { Notice } from "obsidian";
import { PROJECTS } from "#/helpers/paths.js";
import { readJson } from "#/helpers/files.js";
import { importCover } from "#/helpers/images.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { openWinx } from "#/components/app/open.ts";
import { projects } from "#/store/tasks.js";
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
  app, ask = (...a) => Form.ask(...a), upload = importCover, open = openWinx,
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
const editable = p => [p.name, p.description ?? "", p.cover ?? null];
const changedProject = () => new Notice("✦ project changed or was deleted; open it again");

export async function askEditProject(
  app, key, ask = (...a) => Form.ask(...a), upload = importCover,
) {
  const before = (await readJson(PROJECTS, {}))[key];

  if (!before) return void changedProject();
  const v = await ask(app, "✦ Edit project", projectFields, {
    values: { name: before.name, description: before.description ?? "" },
    required: ["name"], submit: "Save",
  });

  if (!v?.name?.trim()) return;
  const cover = v.cover ? await upload(app, v.cover) : before.cover ?? null;

  if (v.cover && !cover) return;
  const saved = await projects.update(key, p => {
    if (JSON.stringify(editable(p)) !== JSON.stringify(editable(before))) return null;
    return { ...p, name: v.name.trim(), description: v.description ?? "", cover };
  });

  if (!saved) changedProject();
}

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
