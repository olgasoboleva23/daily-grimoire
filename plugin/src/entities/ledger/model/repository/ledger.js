// Monthly transaction notes in the vault.
import { LEDGER } from "#/shared/config/index.js";
import { parseLedger } from "../ledger.js";

// the pipe tables themselves (no Dataview fields): a cash row added by hand counts like an
// imported one
export async function readLedger(app, parsed) {
  const listing = await app.vault.adapter.list(LEDGER).catch(() => null);

  if (!listing) return {};
  const months = {};

  for (const file of listing.files.filter(f => f.endsWith(".md"))) {
    const mtime = (await app.vault.adapter.stat(file))?.mtime ?? null;

    if (!parsed.has(file) || mtime === null || parsed.get(file).mtime !== mtime) {
      parsed.set(file, { mtime, rows: parseLedger(await app.vault.adapter.read(file)) });
    }

    const { rows } = parsed.get(file);

    if (rows.length) months[file.slice(file.lastIndexOf("/") + 1, -3)] = rows;
  }

  return months;
}
