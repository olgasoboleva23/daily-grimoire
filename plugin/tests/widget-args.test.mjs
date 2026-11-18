import { test } from "node:test";
import assert from "node:assert/strict";

test("every widget that follows the vault names its files (watches): no reload for any other note", async () => {
  const { blocks } = await import("#/controllers/blocks.js");

  for (const [name, def] of Object.entries(blocks))
    if (def.follows !== false) assert.ok(Array.isArray(def.watches), `${name} names its files`);
});
