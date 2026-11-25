// Opens the recipe viewer from Recipes or a Food log row.
import { openWindow } from "#/shared/ui/Window/index.ts";
import DishWindow from "./index.vue";

export const openDish = dish => openWindow(DishWindow, { dish });
