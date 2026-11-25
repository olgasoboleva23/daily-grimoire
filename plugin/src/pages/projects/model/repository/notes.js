// The project journal records, keyed by ID in notes.json.
import { NOTES } from "#/shared/config/index.js";
import { collection } from "#/shared/vault/index.js";

export const notes = collection(NOTES);
