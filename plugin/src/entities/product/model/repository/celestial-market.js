// Read, process or edit a line in the Celestial Market shopping note.
import { app } from "#/shared/host/index.js";
import { MARKET_NOTE } from "#/shared/config/index.js";
import { appendLine, editLine } from "#/shared/vault/index.js";

export async function readMarketNote() {
  const file = app.vault.getFileByPath(MARKET_NOTE);

  return file ? app.vault.read(file) : null;
}

export async function processMarketNote(update) {
  const file = app.vault.getFileByPath(MARKET_NOTE);

  if (file) await app.vault.process(file, update);
  else await appendLine(MARKET_NOTE, update("").trimEnd());
}

export const editMarketLine = (line, same, change) => editLine(MARKET_NOTE, line, same, change);
