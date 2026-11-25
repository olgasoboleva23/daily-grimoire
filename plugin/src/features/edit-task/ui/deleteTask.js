// Show Undo after deleting a task line or removing a pool item.
import { T } from "#/entities/task/index.js";
import { undoNotice } from "#/shared/ui/undoNotice.js";
import { deleteTaskLine } from "../operation/deleteTask.js";

export async function deleteTask(t) {
  const undo = await deleteTaskLine(t);
  undoNotice("🗑", T(t).text, undo);
}
