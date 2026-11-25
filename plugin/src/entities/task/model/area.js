// Rename area keys in task records and track the changes for a possible settings rollback.
import { records } from "./repository/tasks.js";

export async function moveAreas(moves) {
  const moved = new Map();

  if (!moves.size) return moved;
  await records.edit(tasks => {
    for (const [id, task] of Object.entries(tasks)) {
      const from = task?.area, to = moves.get(from);

      if (!to) continue;
      moved.set(id, { from, to });
      task.area = to;
    }

    return moved.size ? tasks : null;
  });
  return moved;
}

// Revert only the area changes this save made, keeping other edits to the tasks.
export function restoreAreas(moved) {
  return records.edit(tasks => {
    let restored = false;

    for (const [id, { from, to }] of moved) {
      if (tasks[id]?.area !== to) continue;
      tasks[id].area = from;
      restored = true;
    }

    return restored ? tasks : null;
  });
}
