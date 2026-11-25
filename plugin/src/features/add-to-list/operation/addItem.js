// Put an existing or newly named catalog item on the shopping list.
import {
  addCatalogItem, adding, readMarket, readMarketItem, writeShoppingList,
} from "#/entities/product/index.js";

export const addToMarket = (name, type, id = null) => adding(async () => {
  if (id) {
    if (!await readMarketItem(id)) throw new Error(`Market record ${id} is missing`);
  } else {
    const { items } = await readMarket();
    id = await addCatalogItem({ name, type }, items, true);
  }

  return (await writeShoppingList([{ item: id }])).added > 0;
});
