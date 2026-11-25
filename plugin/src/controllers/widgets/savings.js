// The savings jars' controller: a jar per note in the Savings folder (a goal: its picture, saved so
// far, a ✦ stamp per deposit); on a payday "put in N" until the deposit is in; with a price the
// picture fills with colour from the bottom and, past halfway, "saved" turns into "left". Writes: a
// payday's deposit into a jar's note. The markup: widgets/savings.
import { dm, todayYmd, weekday } from "#/shared/lib/dates.js";
import { money } from "#/shared/lib/format.js";
import { SavingsJar } from "#/models/savingsJar.js";
import { edit } from "#/shared/vault/index.js";
import { SAVINGS } from "#/shared/config/index.js";
import { app } from "#/shared/host/index.js";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const day = d => `${DAYS[weekday(d)]} ${dm(d)}`;

export async function loadSavings({ app }) {
  const today = todayYmd();
  const files = (app.vault.getFolderByPath(SAVINGS)?.children ?? [])
    .filter(f => f.extension === "md");
  const jars = await Promise.all(files.map(async f => {
    const props = app.metadataCache.getFileCache(f)?.frontmatter ?? {};
    const jar = new SavingsJar(await app.vault.cachedRead(f), props);
    const img = props.image && app.metadataCache.getFirstLinkpathDest(String(props.image), f.path);

    return {
      path: f.path,
      name: props.goal ?? f.basename,
      img: img && app.vault.getResourcePath(img),
      ...shown(jar, today),
    };
  }));

  return { jars, empty: `A goal: a note in ${SAVINGS}` };
}

// a jar as the card shows it: the picture greyed above what's saved, past halfway "left" instead
// of "saved", a ✦ stamp per deposit (rows of 8, one free), the payday's "put in" until it's in
function shown(jar, today) {
  const pct = jar.pct, count = jar.deposits.length, due = jar.due(today);
  const grey = pct === null ? 100 : Math.max(0, 100 - pct);

  return {
    greyed: `clip-path: inset(0 0 ${100 - grey}% 0)`,
    big: pct !== null && pct >= 50 ? `left ${money(jar.left)}` : money(jar.saved),
    note: pct === null
      ? `saved · ${count} deposit${count === 1 ? "" : "s"}`
      : `${pct}% of ${money(jar.price)}`,
    fill: pct === null ? null : Math.min(100, pct),
    stamps: Array.from({ length: Math.max(8, Math.ceil((count + 1) / 8) * 8) }, (_, i) =>
      i < count),
    due: due && {
      when: due.payday === today ? "payday today" : `payday ${day(due.payday)}`,
      sum: due.sum ? money(due.sum) : "your part",
    },
    next: jar.next(today, 2).map(day).join(" · "),
  };
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
