// Read Master.md and change its leading task without replacing concurrent edits.
import { Notice } from "obsidian";
import { MASTER } from "#/shared/config/index.js";
import { app } from "#/shared/host/index.js";
import { edit } from "#/shared/vault/index.js";

// a note's text from disk ("" when it's missing)
export const masterText = async () => {
  const file = app.vault.getFileByPath(MASTER);

  return file ? app.vault.read(file) : "";
};

// a new task: the line on top of Master.md (false and a notice when Master.md is missing: nothing
// written); one place for the New task command and the calendar's pool drop
export async function prependLine(line) {
  if (!app.vault.getFileByPath(MASTER)) {
    new Notice(`✦ ${MASTER} not found — task not saved`);
    return false;
  }

  await edit(MASTER, c => line + "\n" + c);
  return true;
}

// Undo a failed new-task save only if its lines are still on top.
export const removePrependedLine = line => {
  const prefix = `${line}\n`;

  return edit(MASTER, text => text.startsWith(prefix) ? text.slice(prefix.length) : text);
};
