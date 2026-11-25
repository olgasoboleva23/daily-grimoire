// A window's required fields, the rule in one place: a window's `ready` (UiWindow greys its
// button until it) is a computed of these, e.g. filled(v.name) && groupsFilled(v.meds, ["name"])

// a value is filled when it is not null, undefined or "" (0 and false are)
export const filled = v => v !== null && v !== undefined && v !== "";

// a list (UiFieldList) is filled with one group at least, each with its `keys` filled
export const groupsFilled = (list, keys = []) =>
  Array.isArray(list) && list.length > 0 && list.every(g => keys.every(k => filled(g[k])));
