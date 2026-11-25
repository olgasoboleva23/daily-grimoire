// Validate variants and turn the task window selections into record fields.
export function variantsProblem(variants, next) {
  if (!Array.isArray(variants) || variants.some(v => typeof v !== "string" || !v.trim()))
    return "Variant names must be non-empty text";
  if (new Set(variants.map(v => v.toLowerCase())).size !== variants.length)
    return "Each variant needs a different name";
  if (variants.length && !variants.includes(next)) return "Choose the next variant";
  return null;
}

// The task window's picks as record fields.
export const recordOf = p => ({
  difficulty: p.difficulty ?? null, area: p.area ?? null, daytime: p.daytime ?? null,
  sticker: p.sticker ?? null,
  ..."variants" in p ? { variants: p.variants, currVariant: p.currVariant } : {},
});
