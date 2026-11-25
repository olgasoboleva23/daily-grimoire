// Stored food marks and the training task in food.json.
import { FOOD_DATA } from "#/shared/config/index.js";
import { collection, readJson } from "#/shared/vault/index.js";

export const food = collection(FOOD_DATA);

export const readFood = () => readJson(FOOD_DATA, {});
