// Spending limits read from the finance rules file.
import { RULES } from "#/shared/config/index.js";
import { readJson } from "#/shared/vault/index.js";

export const readRules = () => readJson(RULES, { budgets: {} });
