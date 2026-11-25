// Opens Settings from the drawer or the command palette with the current configuration.
import { openWindow } from "#/components/uikit/Window/open.ts";
import config from "#/helpers/config.js";
import { settingsValues } from "#/models/settings.js";
import SettingsWindow from "./index.vue";

export async function openSettings() {
  return openWindow(SettingsWindow, { values: settingsValues(config) });
}
