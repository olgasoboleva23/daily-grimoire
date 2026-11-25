// Read Weight.md and update its latest text in one vault operation.
import { WEIGHT } from "#/shared/config/index.js";
import { edit } from "#/shared/vault/index.js";

export const readWeight = app => {
  const file = app.vault.getFileByPath(WEIGHT);

  return file ? app.vault.cachedRead(file) : null;
};

export const editWeight = fn => edit(WEIGHT, fn);
