// A shopping-list row and its recorded quantities and purchases.
import { FIELD, LineItem, lineOf, withField } from "#/shared/lib/lineItem.js";
import { catOf } from "./category.js";

// a line bought before 2026-11-11 has its date as "✅ 2026-10-01"; newer ones [completion:: …]
const CHECKED = /\s*✅\s*(\d{4}-\d{2}-\d{2})/u;

const needValues = line => [...line.matchAll(FIELD)]
  .filter(([, key]) => key === "need").map(([, , value]) => value);
const needSeparator = " · ";
const needText = value => value.trim().replace(/\[/g, "(").replace(/\]/g, ")")
  .replace(/[\r\n]+/g, " ");

// An open line may have repeated [need:: Dish · amount] fields (amount optional).
// One line of the log: "- [ ] m12" (its record in items.json: name, type), bought
// "- [x] m12 [completion:: date]".
export class MarketItem extends LineItem {
  static ID = /^m\d+(?=\s|$)/;
  static of(t) { return new MarketItem(lineOf(t), t, t.rec ?? null); }
  get words()    { return super.words.replace(CHECKED, "").trim(); }
  get doneOn()   { return super.doneOn ?? this.line.match(CHECKED)?.[1] ?? null; }
  get type()     { return this.rec?.type ?? "other"; }
  get category() { return catOf(this.type); }
  get needs() {
    return needValues(this.line).map(value => {
      const cut = value.indexOf(needSeparator);

      return cut === -1 ? { dish: value, amount: "" }
        : { dish: value.slice(0, cut), amount: value.slice(cut + needSeparator.length) };
    });
  }

  withNeed(dish, amount = "") {
    const name = needText(dish);
    const quantity = needText(amount);
    const value = quantity ? `${name}${needSeparator}${quantity}` : name;

    if (!name || needValues(this.line).includes(value)) return this.line;
    const body = this.line.trimEnd();

    return `${body} [need:: ${value}]${this.line.slice(body.length)}`;
  }

  // bought on `date`; a line that isn't open comes back as it is
  bought(date) {
    return this.isOpen ? withField(this.line.replace("- [ ]", "- [x]"), "completion", date)
      : this.line;
  }
}
