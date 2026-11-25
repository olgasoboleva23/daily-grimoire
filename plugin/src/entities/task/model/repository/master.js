// Read Master.md and change its leading task without replacing concurrent edits.
import { MASTER } from "#/shared/config/index.js";
import { app } from "#/shared/host/index.js";
import { edit } from "#/shared/vault/index.js";

// a note's text from disk ("" when it's missing)
export const masterText = async () => {
  const file = app.vault.getFileByPath(MASTER);

  return file ? app.vault.read(file) : "";
};

// False when the task file is missing.
export async function prependLine(line) {
  const file = app.vault.getFileByPath(MASTER);

  if (!file) return false;
  await app.vault.process(file, text => line + "\n" + text);
  return true;
}

export const editMaster = change => edit(MASTER, change);

// Undo a failed new-task save only if its lines are still on top.
export const removePrependedLine = line => {
  const prefix = `${line}\n`;

  return editMaster(text => text.startsWith(prefix) ? text.slice(prefix.length) : text);
};
