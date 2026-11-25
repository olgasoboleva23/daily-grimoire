// Dish records and the queue shared by dish writes.
import { DISHES } from "#/shared/config/index.js";
import { collection, readJson, serial } from "#/shared/vault/index.js";

export const dishes = collection(DISHES);

export const write = serial();

export async function readDishes({ includeDeleted = false } = {}) {
  return Object.entries(await readJson(DISHES, {}))
    .filter(([, r]) => includeDeleted || !r.deleted)
    .map(([id, r]) => ({ ...r, id }));
}

export async function readDish(id) {
  const record = (await readJson(DISHES, {}))[id];

  return record && !record.deleted ? record : null;
}
