// The editable fields of an item in the market catalog. Only food products carry marks.
export function productRecord({ name, type, marks }, current = {}) {
  const result = { ...current, name: name.trim(), type };

  if (type === "food" && marks !== undefined) result.marks = marks;
  else delete result.marks;
  return result;
}
