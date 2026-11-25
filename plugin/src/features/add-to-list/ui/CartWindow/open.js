// Open the cart with the current product archive state, even when a recipe was loaded earlier.
import { openWindow } from "#/shared/ui/Window/index.ts";
import { readItems } from "#/entities/product/index.js";
import CartWindow from "./index.vue";

export async function openCart(dish) {
  const records = await readItems({ includeDeleted: true });
  const archived = new Set(Object.keys(records).filter(id => records[id].deleted));

  return openWindow(CartWindow, { dish, archived });
}
