// A dish's ingredient as the recipes page writes it: "paste / powder + garlic" (the 🛒 window:
// components/windows/recipes/CartWindow)
export const ingredientText = i =>
  i.alt.length ? `${i.name} / ${i.alt.map(a => a.name).join(" + ")}` : i.name;
