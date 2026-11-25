// Select an existing Markdown note for a project journal entry.
import { FuzzySuggestModal } from "obsidian";
import { app } from "#/shared/host/index.js";

export function pickNotePath() {
  return new Promise(resolve => {
    class Picker extends FuzzySuggestModal {
      getItems() { return app.vault.getMarkdownFiles(); }
      getItemText(file) { return file.path; }
      onChooseItem(file) { resolve(file.path); }
      onClose() { super.onClose(); queueMicrotask(() => resolve(null)); }
    }

    new Picker(app).open();
  });
}
