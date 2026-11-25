// Open the task fields window with stickers from the vault for either creation or editing.
import { app } from "#/shared/host/index.js";
import { STICKERS } from "#/shared/config/index.js";
import { openWindow } from "#/shared/ui/Window/index.ts";
import TaskWindow from "./index.vue";

export function openTaskWindow(props) {
  const stickers = (app.vault.getFolderByPath(STICKERS)?.children ?? [])
    .filter(file => file.extension)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(file => ({ name: file.name, url: app.vault.getResourcePath(file) }));

  return openWindow(TaskWindow, { ...props, stickers });
}
