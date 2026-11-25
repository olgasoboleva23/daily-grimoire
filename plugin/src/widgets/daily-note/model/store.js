// The daily-note button follows the dashboard date. Its shorter label fits on a phone.
import { Platform } from "obsidian";
import { ymd } from "#/shared/lib/dates.js";

export const loadDailyNote = async ({ dv }) =>
  ({ date: ymd(dv.current()?.date), text: Platform.isMobile ? "✦" : "✦ Open" });
