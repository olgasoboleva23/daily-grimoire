// Valid keys, dish types and progression values for the saved settings.
export const dishType = ({ key, name }) => ({
  key: typeof key === "string" ? key.trim().replace(/^#/, "").trim().toLowerCase() : "",
  name: name?.trim() ?? "",
});

const KEY = /^[a-z0-9-]+$/;

export function areaKeyProblem(v) {
  const keys = v.areas.map(a => (a.key ?? "").trim());
  const bad = keys.find(k => !KEY.test(k));
  const twice = keys.find((k, i) => keys.indexOf(k) !== i);

  if (bad !== undefined) return `the key «${bad}»: lowercase letters, digits and "-" only`;
  if (twice) return `the key «${twice}» is there twice`;
  return null;
}

export function configProblem(v, config) {
  const seen = new Set();

  for (const row of v.dishTypes) {
    const { key, name } = dishType(row);

    if (!key || !name) return "each dish type needs a key and a name";
    if (key === "all" || key === "other") return `the dish type key «${key}» is reserved`;
    if (seen.has(key)) return `the dish type key «${key}» is there twice`;
    seen.add(key);
  }

  if (!(v.spark < v.glow && v.glow < v.aura))
    return `XP Today: ${config.levels.slice(1, 4).map(l => l.name).join(" < ")}`;
  if (!Number.isFinite(v.base) || v.base <= 0)
    return "the first level must cost a finite number greater than zero";
  if (!Number.isFinite(v.step) || v.step < 0)
    return "the level increase must be a finite number, zero or more";
  return null;
}
