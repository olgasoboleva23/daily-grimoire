// Delete a native task line or remove the item from the pool while keeping its record and history.
import { editTaskLine, saveRecords } from "#/entities/task/index.js";

export async function deleteTaskLine(t) {
  if (!t.pool) return editTaskLine(t, () => null);
  await saveRecords({ [t.id]: { pool: undefined } });
  return () => saveRecords({ [t.id]: { pool: true } });
}
