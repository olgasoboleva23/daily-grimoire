// Opens Settings from the drawer or the command palette with the current configuration.
import { openWindow } from "#/shared/ui/Window/index.ts";
import config from "#/shared/config/index.js";
import { settingsValues } from "#/models/settings.js";
import SettingsWindow from "./index.vue";

export async function openSettings() {
  return openWindow(SettingsWindow, { values: settingsValues(config) });
}
