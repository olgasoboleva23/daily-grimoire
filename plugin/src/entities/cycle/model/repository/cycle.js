// Cycle.md: read the recorded dates and append a single mark.
import { CycleLog } from "../cycleLog.js";
import { CYCLE } from "#/shared/config/index.js";
import { appendLine } from "#/shared/vault/index.js";

// the log of Cycle.md (null without the note): also the period days shaded under the Weight
// widget's log
export function readCycle(dv) {
  const page = dv.page(CYCLE);

  if (!page) return null;
  const pick = key => page.file.lists
    .map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1])
    .where(Boolean).array();

  return new CycleLog(pick("start"), pick("end"), page.period ?? 8);
}

export const markDay = (kind, date) =>
  appendLine(CYCLE, `- ${kind}:: ${date}`, { header: "period:: 8\n\n", unique: true });
