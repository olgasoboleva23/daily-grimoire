// Monthly totals, categories, budgets, trends and recent activity on the Finance page.
import { dm } from "#/shared/lib/dates.js";
import { money } from "#/shared/lib/format.js";
import { LEDGER } from "#/shared/config/index.js";
import {
  loadLedger, MONTHS, MONTHS_SHORT, monthReport,
} from "#/entities/ledger/index.js";

// palette cycled across categories, in ui token order
const PALETTE = ["--ui-pink", "--ui-gold", "--ui-purple", "--ui-lavender", "--ui-blue",
  "--ui-pink-deep", "--ui-gold-deep", "--ui-purple-light"];

// one month as the page shows it
function shownMonth(ledger, budgets, months, current) {
  const report = monthReport(ledger, months, current);
  const { totals, index, net, categories, trend, peak, latest } = report;
  const [year, month] = current.split("-");

  return {
    title: `${MONTHS[Number(month) - 1]} ${year}`,
    prev: index > 0 ? months[index - 1] : null,
    next: index < months.length - 1 ? months[index + 1] : null,
    totals: [
      { label: "Spent", value: money(totals.spent), sign: "neg" },
      { label: "Received", value: money(totals.income), sign: "pos" },
      { label: "Net", value: money(net), sign: net < 0 ? "neg" : "pos" },
    ],
    transfers: totals.transfers > 0 ? money(totals.transfers) : null,
    categories: categories.map(([name, value], i) =>
      category(name, value, categories[0][1], PALETTE[i % PALETTE.length], budgets[name])),
    // a month's bar: % of the biggest
    trend: trend.length < 2 ? [] : trend.map(({ month: m, spent }) => ({
      month: m, current: m === current, height: Math.max(spent / peak * 100, 3), sum: money(spent),
      label: MONTHS_SHORT[Number(m.split("-")[1]) - 1],
    })),
    latest: latest.map((r, i) => ({
      key: i, date: dm(r.date), text: `${r.category} · ${r.description}`, sum: money(r.amount),
    })),
  };
}

// every month, ready to show: ◀ ▶ switch between them in the view, no reading again
export async function loadFinance({ app }) {
  const { ledger, budgets, months, start } = await loadLedger(app);

  if (!months.length) return { empty: true, path: LEDGER };
  const byMonth = Object.fromEntries(months.map(m => [m, shownMonth(ledger, budgets, months, m)]));

  return { start, byMonth };
}

// a category's bar: against its budget (over it in pink, "spent / budget · %"), else against the
// biggest category
function category(name, value, max, color, budget) {
  const over = !!budget && value > budget;

  return {
    name, over,
    amount: budget
      ? `${money(value)} / ${money(budget)} · ${Math.round(value / budget * 100)}%`
      : money(value),
    width: Math.max((budget ? Math.min(value / budget, 1) : value / (max || 1)) * 100, 1.5),
    fill: over ? "var(--ui-pink-deep)" : `var(${color})`,
  };
}
