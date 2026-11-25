// The vault files used by Markdown templates. Create the destination folder when needed.
import { app } from "#/shared/host/index.js";

export const fileNames = folder =>
  app.vault.getFolderByPath(folder)?.children.map(file => file.name) ?? [];

export const docExists = path => !!app.vault.getAbstractFileByPath(path);

export async function writeDoc(folder, path, text) {
  if (folder && !app.vault.getFolderByPath(folder)) await app.vault.createFolder(folder);
  return app.vault.create(path, text);
}
