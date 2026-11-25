import { test } from "node:test";
import assert from "node:assert/strict";

test("every widget that follows the vault declares the files or stores that reload it", async () => {
  const { blocks } = await import("#/controllers/blocks.js");

  for (const [name, def] of Object.entries(blocks))
    if (def.follows !== false)
      assert.ok(Array.isArray(def.watches) || def.stores?.length, `${name} names its sources`);
});
