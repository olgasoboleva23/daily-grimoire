// Read settings, presentation and statistics, restoring only a session from today.
import { todayYmd } from "#/shared/lib/dates.js";
import { readPomodoro } from "./repository/pomodoro.js";

// the saved settings, mini and stats, and today's session (another day's starts over)
export async function loadPomodoro() {
  const saved = await readPomodoro();

  return { saved, current: saved.current?.date === todayYmd() ? saved.current : null };
}
