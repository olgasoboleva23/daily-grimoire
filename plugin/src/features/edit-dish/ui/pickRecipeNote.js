// Picks a Markdown note or creates one from the recipe template for the dish.
import { prepareFuzzySearch } from "obsidian";
import { Search } from "#/shared/ui/Search/index.ts";
import { createDoc, KINDS } from "#/entities/doc/index.js";
import { app } from "#/shared/host/index.js";

export const noteName = path => path.split("/").pop().replace(/\.md$/i, "");

export async function pickRecipeNote(dish = "") {
  const notes = app.vault.getMarkdownFiles();
  const pick = await Search.pick(app, "Choose the recipe note", query => {
    const q = query.trim(), name = q || dish.trim();
    const make = name ? [{ name, isNew: true }] : [];

    if (!q) return [...make, ...notes];
    const match = prepareFuzzySearch(q);

    return [...make, ...notes.filter(f => match(f.path))];
  }, (f, el) => el.createSpan({ text: f.isNew ? `+ new recipe note: ${f.name}` : f.path }));

  if (!pick?.isNew) return pick?.path ?? null;
  return (await createDoc(KINDS.recipe, { title: pick.name })).path;
}
