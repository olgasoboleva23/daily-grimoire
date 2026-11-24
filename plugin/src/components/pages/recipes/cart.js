// 🛒 a dish's products onto the shopping list (the recipes page's and a dish's window's button):
// asked first (the dish; a checkbox a product with its amount, the main ones ticked, an
// alternative's products under theirs, unticked: tick what you'll cook with, untick what's at
// home, change an amount), then put, each with the dish and its amount; a notice says how many
// lines went on and how many were on the list already (those got the amount)
import { Notice } from "obsidian";
import { Form } from "#/components/uikit/Form/index.ts";
import { app } from "#/helpers/app.js";
import { productsToList } from "#/controllers/dishes.js";

// a dish's ingredient as the page writes it: "paste / powder + garlic"
export const ingredientText = i =>
  i.alt.length ? `${i.name} / ${i.alt.map(a => a.name).join(" + ")}` : i.name;

// dish: loadRecipes's ({ name, ingredients: [{ item, amount, name, alt: [{ item, amount, name }]
// }] })
export async function toList(dish) {
  const products = dish.ingredients.flatMap(i => [{ ...i, on: true },
    ...i.alt.map(a => ({ ...a, on: false, name: `↳ ${a.name}` }))]);
  const values = await Form.ask(app, "To the shopping list?", [
    { name: "Dish", key: "dish", label: true },
    { name: "Products", key: "lines", fixed: true, list: [
      { name: "Buy", key: "on", check: "" },
      { name: "Product", key: "name", label: true },
      { name: "Amount", key: "amount", text: "500 г" },
    ] },
  ], {
    values: {
      dish: dish.name, lines: products.map(({ on, name, amount }) => ({ on, name, amount })),
    },
    submit: "Add",
  });

  if (!values) return;
  const lines = products.flatMap((p, k) => values.lines[k].on
    ? [{ item: p.item, amount: values.lines[k].amount?.trim() ?? "", dish: dish.name }] : []);

  if (!lines.length) return void new Notice("✦ nothing ticked, nothing added");
  const { added, joined } = await productsToList(lines);
  const said = [added && `${added} → Celestial Market`, joined && `${joined} on the list already`];

  new Notice(`✦ ${said.filter(Boolean).join(", ") || "all of it is on the list already"}`
    + (joined ? " (amount added)" : ""));
}
