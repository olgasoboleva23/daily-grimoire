// The market catalog and the queue for allocating IDs and adding items to its shopping list.
import { MARKET_RECORDS } from "#/shared/config/index.js";
import { nextId } from "#/shared/lib/ids.js";
import { collection, readJson, serial } from "#/shared/vault/index.js";

export const catalog = collection(MARKET_RECORDS);

export const adding = serial();

export const activeItems = records =>
  Object.fromEntries(Object.entries(records).filter(([, record]) => !record.deleted));

export async function readItems({ includeDeleted = false } = {}) {
  const records = await readJson(MARKET_RECORDS, {});

  return includeDeleted ? records : activeItems(records);
}

export async function readMarketItem(id) {
  const record = (await readItems({ includeDeleted: true }))[id];

  return record && !record.deleted ? record : null;
}

// Old shopping notes can carry an ID without a catalog record. Reserve those IDs too.
export async function addCatalogItem(record, listed, reuseName = false) {
  let id;
  await catalog.edit(records => {
    if (reuseName) {
      const name = record.name.trim().toLowerCase();
      id = Object.keys(records).find(k => !records[k].deleted
        && records[k].name.trim().toLowerCase() === name);
      if (id) return null;
    }

    id = nextId("m", [...Object.keys(records), ...listed.map(i => i.id)]);
    records[id] = record;
    return records;
  });
  return id;
}
