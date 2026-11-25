// "New task", first step: search every task done or planned before (by area, the most done first)
// or type a new one.
import { Search } from "#/shared/ui/Search/index.ts";
import config from "#/shared/config/index.js";
import { dm } from "#/shared/lib/dates.js";
import { findChoices } from "#/shared/lib/find.js";
import { Task, taskChoices } from "#/entities/task/index.js";
import { taskStore } from "#/store/tasks.js";
import { app } from "#/shared/host/index.js";

export function pickTask() {
  const choices = taskChoices(
    taskStore.tasks.map(t => Task.of(t)), taskStore.records, config.areas.map(a => a.key),
  );

  return Search.pickGrouped(app, "Find a past task or type a new one…",
    q => findChoices(choices, q), {
      groupOf: c => c.area,
      label: area => area
        ? `${config.areaIcons[area] ?? "✦"} ${config.areaMap[area] ?? area}`
        : "✦ other",
      note: c => c.done ? `×${c.done} · ${dm(c.last)}` : "not done yet",
    });
}
