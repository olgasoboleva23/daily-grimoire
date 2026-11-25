// Convert and validate settings form values, save them and move tasks for checked area changes.
import { Notice } from "obsidian";
import { records } from "#/entities/task/index.js";
import {
  applyConfig, areaKeyProblem, configProblem, dishType, saveConfig,
} from "#/shared/config/index.js";
import { serial } from "#/shared/vault/index.js";

const AREA = ["key", "icon", "title", "name", "color"];
const pick = a => Object.fromEntries(AREA.map(k => [k, a[k] ?? null]));

// the window's starting values from `config` (shared/config): the difficulties (a table: key,
// label, xp, gold), the areas (each with `was`, its key now, and ☑ apply on), XP Today's
// thresholds, the level cost
export function settingsValues(config) {
  const [, spark, glow, aura] = config.levels.map(l => l.max);

  return {
    theme: config.theme,
    dishTypes: config.dishTypes.map(t => ({ ...t })),
    difficulties: config.difficulties.map(({ key, label, xp, gold }) => ({ key, label, xp, gold })),
    areas: config.areas.map(a => ({ ...pick(a), was: a.key, apply: true })),
    spark, glow, aura, base: config.levelCost.base, step: config.levelCost.step,
  };
}

// the values as config.json
export const toConfig = v => ({
  theme: v.theme,
  dishTypes: v.dishTypes.map(dishType),
  difficulties: Object.fromEntries(v.difficulties.map(d =>
    [d.key, { xp: d.key === "none" ? 0 : d.xp, gold: d.gold }])),
  areas: v.areas.map(a => ({ ...pick(a), key: a.key.trim() })),
  levels: { spark: v.spark, glow: v.glow, aura: v.aura },
  levelCost: { base: v.base, step: v.step },
});

// why the values can't be saved, null when they can: an area taken off that still has tasks, a key
// that isn't lowercase letters, digits and "-", one key twice, XP Today's thresholds out of order
export function settingsProblem(v, records, config) {
  const problem = areaKeyProblem(v);

  if (problem) return problem;
  const kept = new Set(v.areas.map(a => a.was));
  const recs = [...records.values()];

  for (const a of config.areas.filter(a => !kept.has(a.key))) {
    const n = recs.filter(r => r.area === a.key).length;

    if (n) return `«${a.title}» has ${n} tasks: move them to another area first`;
  }

  return configProblem(v, config);
}

// Area keys that changed with ☑ Apply, from their old keys to the new ones.
export const areaMoves = v =>
  new Map(v.areas.filter(a => a.apply && a.was && a.was !== a.key.trim())
    .map(a => [a.was, a.key.trim()]));

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
  const areas = areaMoves(values);

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
