import { test } from "node:test";
import assert from "node:assert/strict";

test("every widget that follows the vault declares the files or stores that reload it", async () => {
  const { cards } = await import("#/pages/dashboard/model/cards.js");
  const { pageMap } = await import("#/app/pageMap.js");
  const { pages } = await import("#/shared/config/index.js");
  const wrapped = Object.entries(pageMap).filter(([name]) => pages[name].widget);

  for (const [name, def] of [...Object.entries(cards), ...wrapped])
    if (def.follows !== false)
      assert.ok(Array.isArray(def.watches) || def.stores?.length, `${name} names its sources`);
});
