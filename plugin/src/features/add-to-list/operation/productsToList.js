// Put selected recipe ingredients and their quantities on the shopping list in one write.
import { adding, readItems, writeShoppingList } from "#/entities/product/index.js";

export const productsToList = requests => adding(async () => {
  if (!requests.length) return { added: 0, joined: 0 };
  const records = await readItems();

  return writeShoppingList(requests.filter(({ item }) => records[item]?.type === "food"));
});
