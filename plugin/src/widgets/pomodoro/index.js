// The dashboard timer restores its state once and shares a running clock across views.
import PomodoroTimer from "#/components/pages/dashboard/widgets/pomodoro/index.vue";
import { loadPomodoro } from "./model/store.js";

export { PomodoroTimer };

export const pomodoro = {
  // TODO: use the view directly once its model imports move inside this slice.
  get view() { return PomodoroTimer; },
  load: loadPomodoro, follows: false,
};

// TODO: remove these exports when the timer UI moves here and imports its model directly.
export { Timer } from "./model/timer.js";

export { save } from "./model/repository/pomodoro.js";
