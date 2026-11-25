// Saves validated settings to config.json, applies them and moves tasks for checked area changes.
import { Notice } from "obsidian";
import { applyConfig, saveConfig } from "#/shared/config/index.js";
import { serial } from "#/shared/vault/index.js";
import { records } from "#/entities/task/index.js";
import { areaRenames, toConfig } from "#/models/settings.js";

const save = serial();

// Revert only the area changes this save made, keeping other edits to the tasks.
function restoreAreas(moves) {
  return records.edit(tasks => {
    let restored = false;

    for (const [id, { from, to }] of moves) {
      if (tasks[id]?.area !== to) continue;
      tasks[id].area = from;
      restored = true;
    }

    return restored ? tasks : null;
  });
}

export function saveSettings(values) {
  const json = toConfig(values);
  const areas = areaRenames(values);

  return save(async () => {
    const moves = new Map();

    if (areas.size) await records.edit(tasks => {
      for (const [id, task] of Object.entries(tasks)) {
        const from = task?.area, to = areas.get(from);

        if (!to) continue;
        moves.set(id, { from, to });
        task.area = to;
      }

      return moves.size ? tasks : null;
    });
    let merged;

    try {
      merged = await saveConfig(json);
    } catch (error) {
      try {
        if (moves.size) await restoreAreas(moves);
      } catch (restoreError) {
        throw new AggregateError([error, restoreError], "Could not save settings or restore areas");
      }

      throw error;
    }

    applyConfig(merged);
    const moved = moves.size;

    new Notice(`✦ Settings saved${moved ? ` · ${moved} tasks moved` : ""}`);
    return { moved };
  });
}
