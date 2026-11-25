// The plugin's display name, from manifest.json: the one place to rename it.
import manifest from "../../../manifest.json" with { type: "json" };

export const APP_NAME = manifest.name;
