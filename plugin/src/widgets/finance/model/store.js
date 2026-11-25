// Monthly spending and income for the dashboard.
import { money } from "#/shared/lib/format.js";
import { loadLedger, MONTHS, summarize } from "#/entities/ledger/index.js";

export async function loadFinanceLine({ app }) {
  const { ledger, months, start } = await loadLedger(app);

  if (!months.length) return { empty: true };
  const { spent, income } = summarize(ledger[start]);

  return {
    month: MONTHS[Number(start.split("-")[1]) - 1],
    spent: money(spent),
    income: money(income),
  };
}
