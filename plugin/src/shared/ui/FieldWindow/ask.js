// Ask for one value: the kit's FieldWindow ({ title, name, value, placeholder, type, choices,
// required, submit }). Resolves the value (a text trimmed, a number a Number), null when the
// window is closed.
import { openWindow } from "#/shared/ui/Window/index.ts";
import FieldWindow from "./index.vue";

export const askValue = options => openWindow(FieldWindow, options);
