// Food journal days in log.json.
import { FOOD_LOG } from "#/shared/config/index.js";
import { collection, readJson } from "#/shared/vault/index.js";

export const log = collection(FOOD_LOG);

export const readLog = () => readJson(FOOD_LOG, {});
