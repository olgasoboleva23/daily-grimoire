// Writes project journal entries.
import { Notice } from "obsidian";
import { notes } from "#/store/tasks.js";
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
