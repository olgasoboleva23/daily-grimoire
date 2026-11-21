// 🛒 a dish's products onto the shopping list (the recipes page's and a dish's window's button):
// asked first (the dish; for a line with an alternative, which one, its main product picked;
// then a checkbox a line, all ticked: untick what's at home), then put; a notice says how many
// went on (those on the list already stay as they are)
import { Notice } from "obsidian";
import { Form } from "#/components/uikit/Form/index.ts";
import { app } from "#/helpers/app.js";
import { productsToList } from "#/controllers/dishes.js";

// dish: loadRecipes's ({ id, name, ingredients: [{ item, name, alt, altName }] })
export async function toList(dish) {
  const lines = dish.ingredients.map((i, n) => ({ ...i, key: `alt${n}` }));
  const choices = lines.filter(i => i.alt);
  const values = await Form.ask(app, "To the shopping list?", [
    { name: "Dish", key: "dish", label: true },
    ...choices.map(i => ({ name: i.name, key: i.key, options: [
      { label: i.name, value: i.item }, { label: i.altName, value: i.alt },
    ] })),
    { name: "Products", key: "lines", fixed: true, list: [
      { name: "Buy", key: "on", check: "" },
      { name: "Product", key: "name", label: true },
    ] },
  ], {
    values: {
      dish: dish.name, ...Object.fromEntries(choices.map(i => [i.key, i.item])),
      lines: lines.map(i => ({ on: true, name: i.alt ? `${i.name} / ${i.altName}` : i.name })),
    },
    submit: "Add",
  });

  if (!values) return;
  // the ticked lines, each its product picked (no choice: its main one)
  const ids = lines.filter((_, k) => values.lines[k].on).map(i => values[i.key] || i.item);

  if (!ids.length) return void new Notice("✦ nothing ticked, nothing added");
  const n = await productsToList(ids);

  new Notice(n ? `✦ ${n} → Celestial Market` : "✦ all of it is on the list already");
}
