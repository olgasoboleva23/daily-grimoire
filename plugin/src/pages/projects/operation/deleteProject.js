// Delete a confirmed project, its own journal entries and its unused cover.
import { app as vaultApp } from "#/shared/host/index.js";
import { removeProjectRecord } from "#/entities/project/index.js";
import { removeOwned } from "../model/note.js";

// Check the snapshot from the confirmation and keep covers referenced by another project.
export async function deleteProject(key, before, trash = f => vaultApp.fileManager.trashFile(f)) {
  const removed = await removeProjectRecord(key, before);

  if (!removed) return false;
  await removeOwned(key);
  const file = removed.unusedCover && vaultApp.vault.getFileByPath(removed.unusedCover);

  if (file) await trash(file);
  return true;
}
