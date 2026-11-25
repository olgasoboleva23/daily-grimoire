// Ask before deleting: the kit's ConfirmWindow, its lines ({ name, text }) as label rows.
// Resolves true on the button (or Enter), false when the window is closed.
import { openWindow } from "#/components/uikit/Window/open.ts";
import ConfirmWindow from "./index.vue";

export const confirm = async (title, lines = [], submit = "Delete") =>
  await openWindow(ConfirmWindow, { title, lines, submit }) === true;
