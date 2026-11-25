// Save both project prompts together and immediately reflect the new text in the open view.
import config, { saveConfig } from "#/shared/config/index.js";

export async function savePrompts({ promptStart, promptFinal }) {
  const patch = { promptStart: promptStart.trim(), promptFinal: promptFinal.trim() };

  await saveConfig(patch);
  Object.assign(config, patch);
}
