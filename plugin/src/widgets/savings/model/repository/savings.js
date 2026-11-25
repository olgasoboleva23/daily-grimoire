// Read savings notes and record a payday deposit in the latest contents of the selected note.
import { app } from "#/shared/host/index.js";
import { SAVINGS } from "#/shared/config/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { edit } from "#/shared/vault/index.js";
import { SavingsJar } from "../savingsJar.js";

export function readJars(app) {
  const files = (app.vault.getFolderByPath(SAVINGS)?.children ?? [])
    .filter(f => f.extension === "md");

  return Promise.all(files.map(async f => {
    const props = app.metadataCache.getFileCache(f)?.frontmatter ?? {};
    const jar = new SavingsJar(await app.vault.cachedRead(f), props);
    const img = props.image && app.metadataCache.getFirstLinkpathDest(String(props.image), f.path);

    return {
      path: f.path,
      name: props.goal ?? f.basename,
      img: img && app.vault.getResourcePath(img),
      jar,
    };
  }));
}

// The jar's default amount, or null when the user enters their share.
export function paydaySum(path) {
  const sum = app.metadataCache.getCache(path)?.frontmatter?.per_payday;

  return sum == null || !Number.isFinite(Number(sum)) ? null : Number(sum);
}

// a payday's deposit of `sum` into the jar's note
export async function deposit(path, sum) {
  if (Number.isFinite(sum) && sum > 0)
    await edit(path, text => new SavingsJar(text).deposit(todayYmd(), sum));
}
