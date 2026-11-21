// The Recipes page's state: what Obsidian saves with the workspace layout and gives back after a
// restart. `course`: the tab picked, "all" or a dish type key from ⚙ Settings ("other": the
// dishes under none; a type gone from the settings: the page shows all).

// a saved state as a whole one: a tab that isn't a word is all
export function readState(saved) {
  const s = saved && typeof saved === "object" ? saved : {};

  return { course: typeof s.course === "string" && s.course ? s.course : "all" };
}
