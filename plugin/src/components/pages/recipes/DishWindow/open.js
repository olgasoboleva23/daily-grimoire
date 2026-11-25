// Opens the recipe viewer from Recipes or a Food log row.
import { openWindow } from "#/components/uikit/Window/open.ts";
import DishWindow from "./index.vue";

export const openDish = dish => openWindow(DishWindow, { dish });
