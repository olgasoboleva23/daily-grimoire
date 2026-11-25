// Day ranges shared by medication courses and the food journal.
export const MAX_DAY = 365;
const DEFAULT_RANGES = [{ from: 1, to: 90 }];

// ranges of a medicine: [{ from, to }] course days (1-based); none: 1-90
export const rangesOf = m => m.ranges?.length ? m.ranges : DEFAULT_RANGES;

const RANGE = /^(\d+)\s*(?:[-–—]\s*(\d+))?$/;
const partsOf = input => String(input ?? "").split(/[,;]/).map(p => p.trim()).filter(Boolean);

// { from, to } if it is course days from 1 up to MAX_DAY, else null
const checked = ({ from, to }) => from >= 1 && to >= from && to <= MAX_DAY ? { from, to } : null;

// "30" or "45-60": course days from 1 up to MAX_DAY; else null
const rangeOf = part => {
  const m = part.match(RANGE);

  return m && checked({ from: +m[1], to: m[2] ? +m[2] : +m[1] });
};

// the first part of a typed list that isn't a range of course days, else null
export const rangesProblem = input => partsOf(input).find(p => !rangeOf(p)) ?? null;

// "1-30, 45-60, 70" → [{from:1,to:30},{from:45,to:60},{from:70,to:70}], sorted, merged if touching;
// nothing readable: 1-90
export const parseRanges = input => {
  const found = (Array.isArray(input) ? input.map(checked) : partsOf(input).map(rangeOf))
    .filter(Boolean).sort((a, b) => a.from - b.from);
  const merged = [];

  for (const r of found) {
    const last = merged[merged.length - 1];

    if (last && r.from <= last.to + 1) last.to = Math.max(last.to, r.to);
    else merged.push({ ...r });
  }

  return merged.length ? merged : DEFAULT_RANGES;
};

export const formatRanges = ranges =>
  ranges.map(r => (r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`)).join(", ");

export const inRanges = (ranges, day) => ranges.some(r => day >= r.from && day <= r.to);

export const lastDay = ranges => Math.max(...ranges.map(r => r.to));
