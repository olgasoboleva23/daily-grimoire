// The window of an entry (Form): + Entry asks what it is about (the project, a stage, a task of
// a stage), a title, a text and a note to link; ✏️ the same without "about" (an entry keeps it).
// The entry belongs to the project it is added in (its owner). Writes: controllers/journal.js.
import { Notice } from "obsidian";
import { Form } from "#/components/uikit/Form/index.ts";
import { addNote, editNote, pickNotePath } from "#/controllers/journal.js";
import { taskStore } from "#/store/tasks.js";

// the project, its stages, their tasks: { label, value: "kind:id" }
function about(key) {
  const p = taskStore.projects.get(key);
  const stages = p?.stages ?? [];
  const name = id => taskStore.records.get(id)?.name ?? id;

  return [
    { label: `Project · ${p?.name ?? key}`, value: `project:${key}` },
    ...stages.map((s, i) =>
      ({ label: `Stage ${String(i + 1).padStart(2, "0")} · ${s.name}`, value: `stage:${s.id}` })),
    ...[...new Set(stages.flatMap(s => s.tasks ?? []))]
      .map(id => ({ label: `Task · ${name(id)}`, value: `task:${id}` })),
  ];
}

const fields = app => [
  { name: "Title", key: "title", text: "empty: the name of what it is about" },
  { name: "Text", key: "text", text: "what came out of it", lines: true },
  { name: "Note", key: "link", pick: () => pickNotePath(app) },
];

const empty = v => !v.title?.trim() && !v.text?.trim() && !v.link;

export async function askEntry(app, key, entry = null) {
  const v = entry
    ? await Form.ask(app, "✦ Edit entry", [
      ...fields(app), { name: "When", key: "at", text: "YYYY-MM-DDTHH:mm" },
    ], { values: { title: entry.title, text: entry.text, link: entry.link, at: entry.at },
      required: ["at"], submit: "Save" })
    : await Form.ask(app, "✦ New entry", [
      { name: "About", key: "about", select: about(key) }, ...fields(app),
    ], { values: { about: `project:${key}`, title: "", text: "", link: "" }, submit: "Add" });

  if (!v) return;
  if (empty(v)) return void new Notice("✦ write a title, a text or a note");
  const note = { title: v.title.trim(), text: v.text ?? "", link: v.link ?? "" };

  if (entry) return void await editNote(entry.id, { ...note, at: v.at });
  const [kind, id] = v.about.split(":");

  await addNote({ owner: { kind: "project", id: key }, target: { kind, id }, ...note });
}
