// Indexed purchase lines for display; the current file is read again before a purchase.
import { PURCHASES } from "#/shared/config/index.js";
import { app } from "#/shared/host/index.js";
import { appendLine } from "#/shared/vault/index.js";

const note = `${PURCHASES}.md`;

export const indexedPurchases = dv => [...dv.pages(`"${PURCHASES}"`).file.lists].map(l => l.text);

export async function readPurchases() {
  const file = app.vault.getFileByPath(note);
  const text = file ? await app.vault.read(file) : "";

  return text.split("\n").filter(line => line.startsWith("- "));
}

export const appendPurchase = (name, price, date) =>
  appendLine(note, `- ${date} | ${name} | ${price}`, { header: "# Purchases\n\n" });
