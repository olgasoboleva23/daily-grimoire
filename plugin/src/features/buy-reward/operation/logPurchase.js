// Check the current purchase file and write one reward at a time so gold cannot be spent twice.
import { appendPurchase, balance, readPurchases } from "#/entities/shop/index.js";
import { earned, taskStore } from "#/entities/task/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { serial } from "#/shared/vault/index.js";

const purchase = serial();

export function logPurchase(name, price) {
  return purchase(async () => {
    const lines = await readPurchases();

    if (balance(earned(taskStore.tasks), lines) < price) return false;
    await appendPurchase(name, price, todayYmd());
    return true;
  });
}
