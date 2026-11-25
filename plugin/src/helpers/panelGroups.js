// The panel's cards grouped by area, shared by its tabs
import { T } from "#/models/calendarData.js";
import { computed } from "vue";
import { taskStore } from "#/store/tasks.js";
import { openProjects, projectStore } from "#/entities/project/index.js";

export const calendarProjects = computed(() => {
  void projectStore.version.value;
  void taskStore.version.value;
  return openProjects(projectStore.projects, taskStore.tasks.map(T));
});

export const SHOWN = 8;   // No date: the first 8 until "show all"

// a group card's title, as on the Life Areas chart
export function areaTitle({ areaIcons, areaMap }, g) {
  const name = areaMap[g] ?? g ?? "other";

  return `${areaIcons[g] ?? "✦"} ${name[0].toUpperCase()}${name.slice(1)}`;
}

// `items` as group cards, one per run of the same area: { key, title, cards }
export function byArea(items, card, config) {
  const runs = [];

  for (const t of items) {
    const a = T(t).area;

    if (!runs.length || runs.at(-1).a !== a) runs.push({ a, items: [] });
    runs.at(-1).items.push(t);
  }

  return runs.map((r, i) =>
    ({ key: `${i}|${r.a}`, title: areaTitle(config, r.a), cards: r.items.map(card) }));
}
