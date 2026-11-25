// Gold spent on purchases, parsed from the final field of each line.
import { amount } from "#/shared/lib/format.js";

// a purchase's cost: the line's last field ("… | 1984 | 20" costs 20; 2,5 or 1 000 too)
const cost = text => amount(text.split("|").at(-1)) ?? 0;

const spent = lines => [...lines].reduce((a, l) => a + cost(l), 0);

export const balance = (gold, lines) => gold - spent(lines);
