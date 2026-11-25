// Check imports between FSD layers and flag slices used in only one place.
import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";

export default defineConfig([
  ...fsd.configs.recommended,
  // Sass resolves these partials through its load path.
  { ignores: ["./src/shared/styles/**"] },
  { rules: { "fsd/insignificant-slice": "warn" } },
]);
