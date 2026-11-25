// Cycle day, forecast and recent periods shown in the dashboard card.
import { mana, mpLine, mpTable, readCycle } from "#/entities/cycle/index.js";
import { dm, pageDay, ymd } from "#/shared/lib/dates.js";

// a day of a cycle: period, ovulation, fertile (the 5 days before the ovulation) or none
const pill = (c, n) => n <= (c.period ?? 0) ? "period"
  : n === c.ovulation ? "ovulation"
  : c.ovulation && n >= c.ovulation - 5 && n < c.ovulation ? "fertile"
  : "plain";

// columns of `values` against their largest, a line at their average (labelled "avg N d")
function chart(values) {
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return {
    avg: `avg ${avg} d`,
    line: avg / max * 100,
    cols: values.map(v => ({ v, height: v / max * 100 })),
  };
}

export async function loadCycle({ dv }) {
  const day = ymd(pageDay(dv)), log = readCycle(dv);
  const mark = { kind: "start", text: "started today" };

  if (!log) return { day, page: false, info: false, mark, rows: [] };
  const info = log.on(day);
  // the current cycle with no end yet: its days so far are the period while it lasts
  const cycles = log.recent(4, day)
    .map(c => c.current && c.period === null && info?.isPeriod ? { ...c, period: c.days } : c);
  const stats = log.last(10), m = info && mana(info);
  const lengths = stats.map(c => c.length);
  const periods = stats.filter(c => c.period).map(c => c.period);

  return {
    day, page: true, info: !!info,
    mark: info?.isPeriod && !info.ended ? { kind: "end", text: "ended yesterday" } : mark,
    head: info && {
      day: info.day, period: info.isPeriod, phase: m.phase,
      title: `${mpLine(m)}\n\n${mpTable(m)}`,
      next: dm(info.nextStart),
      when: info.daysUntil >= 0 ? `in ${info.daysUntil} d` : `${-info.daysUntil} d late`,
    },
    rows: cycles.map(c => ({
      start: c.start,
      when: `${dm(c.start)} – ${c.current ? "now" : dm(c.end)}`,
      length: `${c.period ? `${c.period} d period · ` : ""}${c.days} d`
        + (c.current ? " so far" : ""),
      pills: Array.from({ length: c.days }, (_, i) => pill(c, i + 1)),
    })),
    charts: [
      lengths.length && { title: "cycle", kind: "len", ...chart(lengths) },
      periods.length && { title: "period", kind: "per", ...chart(periods) },
    ].filter(Boolean),
  };
}
