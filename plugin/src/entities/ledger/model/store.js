// Ledger data shared by the Finance page and dashboard card.
import { readLedger } from "./repository/ledger.js";
import { readRules } from "./repository/rules.js";

// a month's rows by its note's path, with the modification time they were read at: a load reads
// only the notes that changed since (both Finance widgets share it)
const parsed = new Map();

// the ledger, the budgets, its months in order and the one to start on: this month, else the
// latest
export async function loadLedger(app) {
  const [ledger, rules] = await Promise.all([readLedger(app, parsed), readRules()]);
  const months = Object.keys(ledger).sort();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = months.includes(thisMonth) ? thisMonth : months.at(-1);

  return { ledger, budgets: rules.budgets ?? {}, months, start };
}
