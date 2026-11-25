import { Platform } from "obsidian";
import { dataview } from "#/shared/host/index.js";
import { useDataviewChanges, useNewDay, useWhenIndexed } from "#/shared/lib/use.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { readGoals, reminders, dayCounts } from "#/entities/goal/index.js";
import { GOALS, TASKS } from "#/shared/config/index.js";
import { T } from "#/models/calendarData.js";
import { taskStore } from "#/store/tasks.js";

// by name at run time, desktop only: a require("electron") in main.js would stop the phone loading
// it
const ELECTRON = "electron";

// Desktop notifications: today's reminders (goals.js reminders(): a goal task at its remind time, a
// task with "HH:MM" 30 minutes before) and a morning summary once a day. Rescheduled when tasks or
// goals change and on a new day. A click brings the window up and runs open() (the calendar).
export function useNotify(plugin, open) {
  if (Platform.isMobile || typeof Notification === "undefined") return;
  const { app } = plugin;
  let timers = [];
  const shown = [];   // a reference to each notification, or Electron may drop its click
  const clear = () => { timers.forEach(t => window.clearTimeout(t)); timers = []; };

  plugin.register(clear);

  const notify = (title, body) => {
    const n = new Notification(title, { body, silent: false });
    shown.push(n); shown.splice(0, shown.length - 10);
    n.onclick = () => {
      const w = window.require(ELECTRON).remote.getCurrentWindow();

      if (w.isMinimized()) w.restore();
      w.show(); w.focus(); open();
    };
  };

  const dueTasks = () => taskStore.tasks.map(T).filter(t => t.isOpen && t.date);

  const schedule = () => {
    clear();
    const d = todayYmd();
    const tasks = dueTasks().filter(t => t.date === d).map(t => ({ text: t.text, goal: t.goal }));
    const goals = readGoals(dataview());

    for (const r of reminders(tasks, goals)) {
      const ms = window.moment(`${d} ${r.at}`, "YYYY-MM-DD HH:mm").diff(window.moment());

      if (ms > 0) timers.push(window.setTimeout(() => notify(r.title, r.body), ms));
    }
  };

  // once a day per device
  const summary = () => {
    const d = todayYmd();

    if (app.loadLocalStorage("ui-notify-summary") === d) return;
    app.saveLocalStorage("ui-notify-summary", d);
    const { due, overdue } = dayCounts(taskStore.tasks.map(T), d);

    notify(
      `✦ ${due} task${due === 1 ? "" : "s"} today`,
      overdue ? `Overdue: ${overdue}` : "Nothing overdue",
    );
  };

  // once Dataview's index is there: the summary and today's reminders, again when tasks or goals
  // change and each new day
  useWhenIndexed(plugin, () => {
    if (!dataview()) return;
    summary(); schedule();
    useDataviewChanges(plugin, schedule, {
      watched: p => p.startsWith(TASKS) || p.startsWith(GOALS), delay: 2000,
    });
    useNewDay(plugin, () => { summary(); schedule(); });
  });
}
