// The records in tasks.json and their stale-checked, merged writes.
import { Notice } from "obsidian";
import { TASK_RECORDS } from "#/shared/config/index.js";
import { app } from "#/shared/host/index.js";
import { collection } from "#/shared/vault/index.js";

export const records = collection(TASK_RECORDS);

// Merge a patch into tasks.json ({ id: fields } merges into the record), one write; an optional
// snapshot rejects stale modal edits. The file is made when missing.
// Between devices, Remotely Save still uses last writer wins.
export const saveRecords = (patch, expected = null) => records.edit(all => {
  if (expected && Object.entries(expected).some(([id, rec]) =>
    JSON.stringify(all[id]) !== JSON.stringify(rec))) {
    new Notice("✦ task record changed, try again");
    return null;
  }

  for (const [id, p] of Object.entries(patch)) all[id] = { ...all[id], ...p };
  return all;
});

// tasks.json parsed ({} when missing); null and a notice when it isn't valid JSON
export async function recordsFromDisk() {
  try {
    const file = app.vault.getFileByPath(TASK_RECORDS);
    const text = file && await app.vault.read(file);

    return JSON.parse(text || "{}");
  } catch {
    new Notice("✦ tasks.json isn't valid JSON — task not saved");
    return null;
  }
}
