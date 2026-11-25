// The dashboard timer restores its state once and shares a running clock across views.
import PomodoroTimer from "./ui/index.vue";
import { loadPomodoro } from "./model/store.js";

export { PomodoroTimer };

export const pomodoro = { view: PomodoroTimer, load: loadPomodoro, follows: false };
