// The stored shape of a dish, with product IDs and an optional recipe note.
import { validNoteLink } from "#/shared/vault/index.js";

export function record({ name, type = "", ingredients, link = "" }) {
  if (!name?.trim() || !ingredients?.length || ingredients.some(i => !i.item)) return null;
  if (!validNoteLink(link)) return null;
  return { name: name.trim(), type: type.trim(), link,
    ingredients: ingredients.map(({ item, amount, alt }) => {
      const line = { item, amount: amount?.trim() ?? "" };

      const alternatives = Array.isArray(alt) ? alt.filter(a => a?.item)
        .map(({ item, amount }) => ({ item, amount: amount?.trim() ?? "" })) : [];

      if (alternatives.length) line.alt = alternatives;
      return line;
    }),
  };
}
