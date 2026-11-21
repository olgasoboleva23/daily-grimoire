// 🛒 a dish's products onto the shopping list (the recipes page's and a dish's window's button):
// asked first (the dish and its products), then put; a notice says how many went on (those on
// the list already stay as they are)
import { Notice } from "obsidian";
import { Form } from "#/components/uikit/Form/index.ts";
import { app } from "#/helpers/app.js";
import { dishToList } from "#/controllers/dishes.js";

// dish: loadRecipes's ({ id, name, ingredients: [{ name }] })
export async function toList(dish) {
  const products = [...new Set(dish.ingredients.map(i => i.name))].join(", ");
  const yes = await Form.ask(app, "To the shopping list?", [
    { name: "Dish", key: "dish", label: true },
    { name: "Products", key: "products", label: true },
  ], { values: { dish: dish.name, products }, submit: "Add" });

  if (!yes) return;
  const n = await dishToList(dish.id);

  new Notice(n ? `✦ ${n} → Celestial Market` : "✦ all of it is on the list already");
}
