// Writes project journal entries.
import { Notice } from "obsidian";
import { notes } from "./repository/notes.js";
import { serial, validNoteLink } from "#/shared/vault/index.js";

const write = serial();

const valid = ({ title, text, link }) =>
  validNoteLink(link) && !!(title.trim() || text.trim() || link);

export async function addNote({ owner = null, target, title = "", text = "", link = "",
  at = window.moment().format("YYYY-MM-DDTHH:mm") }) {
  const note = { owner, target, title, text, link, at };

  return valid(note) ? write(() => notes.add(note, "n")) : null;
}

export function editNote(id, { title, text, link, at }, before) {
  return write(() => notes.update(id, current => {
    if (["title", "text", "link", "at"].some(key => (current[key] ?? "") !== before[key])) {
      new Notice("✦ journal entry changed meanwhile: open its window again");
      return null;
    }

    const next = { ...current, title, text, link, at };

    return valid(next) ? next : null;
  }));
}

export function removeNote(id) {
  return write(() => notes.edit(all => {
    if (!all[id]) return null;
    delete all[id];
    return all;
  }));
}

// Project deletion removes only entries owned by that project.
export const removeOwned = key => write(() => notes.edit(all => {
  const owned = Object.entries(all)
    .filter(([, n]) => n.owner?.kind === "project" && n.owner.id === key);

  if (!owned.length) return null;
  for (const [id] of owned) delete all[id];
  return all;
}));

// A deleted stage's entries remain in the journal and point back to its project.
export const retarget = (stageId, key) => write(() => notes.edit(all => {
  const related = Object.values(all)
    .filter(n => n.target.kind === "stage" && n.target.id === stageId);

  if (!related.length) return null;
  for (const n of related) n.target = { kind: "project", id: key };
  return all;
}));
