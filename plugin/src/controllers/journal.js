// Validates linked notes and writes project journal entries.
import { Notice } from "obsidian";
import { app } from "#/helpers/app.js";
import { notes } from "#/store/tasks.js";
import { serial } from "#/helpers/files.js";

const write = serial();

export const validNoteLink = link => {
  if (link && (!/\.md$/i.test(link) || !app.vault.getFileByPath(link))) {
    new Notice("Choose an existing Markdown note");
    return false;
  }

  return true;
};

const valid = ({ title, text, link }) =>
  validNoteLink(link) && !!(title.trim() || text.trim() || link);

export async function addNote({ owner = null, target, title = "", text = "", link = "",
  at = window.moment().format("YYYY-MM-DDTHH:mm") }) {
  const note = { owner, target, title, text, link, at };

  return valid(note) ? write(() => notes.add(note, "n")) : null;
}

export function editNote(id, { title, text, link, at }) {
  return write(() => notes.update(id, current => {
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
