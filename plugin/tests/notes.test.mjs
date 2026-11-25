// Note contents, collection choices and journal creation in an in-memory vault.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Note, notePath } from "#/models/note.js";
import { KINDS, daily } from "#/models/kinds.js";
import { createJournal } from "#/controllers/journals.js";
import { vault } from "./stubs/vault.mjs";

const make = (kind, v, today = "2026-10-29") => new Note(KINDS[kind].note(v, today)).text;

test("a note from data: properties, a title when given, the sections", () => {
  const note = new Note({
    props: { type: "x", name: 'The "Tea" Shop', n: 7, empty: null, tags: [], list: ["a", "b"] },
    title: "T", sections: { One: "", Two: "- [ ] go" },
  });
  assert.equal(note.text, `---
type: x
name: "The \\"Tea\\" Shop"
n: 7
empty:
tags: []
list:
  - a
  - b
---

# T

## One

## Two
- [ ] go
`);
});

test("a watch item's note", () => {
  assert.equal(make("watch", { title: "Moon Tales", media_type: "anime", status: "to_watch" }), `---
type: watch
media_type: anime
status: to_watch
rating:
created: 2026-10-29
tags:
---

## Notes

## Progress
- [ ] Start
- [ ] Watch
- [ ] Finish
`);
});

test("a game has a genre and hours instead of a type", () => {
  const note = make("game", { title: "Star Garden", status: "playing", genre: "cozy" });
  assert.match(note, /\nstatus: playing\ngenre: cozy\nrating:\nhours:\ncreated: 2026-10-29\n/);
  assert.match(note, /- \[ \] Play\n/);
  assert.match(make("game", { title: "X", status: "playing" }), /\ngenre:\n/);
});

test("a recipe and a work task: their properties and sections", () => {
  const recipe = make("recipe", { title: "Pumpkin soup" });
  assert.match(recipe, /^---\ntype: recipe\ntags: \[\]\n/);
  assert.match(recipe, /\n---\n\n## Steps\n\n## Notes\n\n## Variations\n$/);
  const work = make("work", { title: "Fix login" }, "2026-10-31");
  assert.match(work, /^---\nstatus: active\ncreated: 2026-10-31\nasana:\n---\n\n## Зачем\n/);
  assert.match(work, /\n## Сделать\n- \[ \] \n/);
});

test("note paths sanitize titles and add numbers when a name is taken", () => {
  const taken = new Set(["03 Resources/Collections/Readlist/Moon Tales.md"]);
  assert.equal(notePath(KINDS.read.folder, "Moon: Tales?", p => taken.has(p)),
    "03 Resources/Collections/Readlist/Moon Tales 1.md");
  assert.equal(notePath(KINDS.watch.folder, "  ", () => false),
    "03 Resources/Collections/Watchlist/Untitled.md");
});

test("the optional watch, read and game rating is written to the note", () => {
  assert.match(make("watch", { media_type: "movie", status: "completed", rating: 7 }),
    /\nrating: 7\n/);
});

test("collection types and statuses: the windows' choices, the first status the default", () => {
  const expected = {
    watch: {
      types: [
        ["Movie", "movie"], ["Movie series", "movie_series"], ["Cartoon", "cartoon"],
        ["Animated series", "animated_series"], ["TV Show", "tv"], ["Anime", "anime"],
        ["Documentary", "doc"], ["Other", "other"],
      ],
      statuses: [
        ["to watch", "to_watch"], ["watching", "watching"], ["completed", "completed"],
        ["dropped", "dropped"],
      ],
    },
    read: {
      types: [
        ["Fanfiction", "fanfiction"], ["Fiction", "fiction"], ["Manga", "manga"],
        ["Scientific pop", "scientific_pop"], ["IT", "it"],
      ],
      statuses: [
        ["to read", "to_read"], ["reading", "reading"], ["completed", "completed"],
        ["dropped", "dropped"],
      ],
    },
    game: {
      statuses: [
        ["to play", "to_play"], ["playing", "playing"], ["completed", "completed"],
        ["paused", "paused"], ["dropped", "dropped"],
      ],
    },
  };
  const options = pairs => pairs?.map(([label, value]) => ({ label, value }));

  for (const [kind, choices] of Object.entries(expected)) {
    const { types, statuses } = KINDS[kind];

    assert.deepEqual(types, options(choices.types), kind);
    assert.deepEqual(statuses, options(choices.statuses), kind);
  }
});

test("a daily note: its date, the day as the title, Notes and the XP log", () => {
  assert.equal(new Note(daily("2026-11-02", "Monday, November 2")).text, `---
date: 2026-11-02
---

# Monday, November 2

## 📝 Notes

## 🎯 XP Log
-
`);
});

test("YAML strings are quoted when they could be read as another type", () => {
  const text = new Note({
    props: { a: "true", b: "null", c: "123", d: "no", e: 5, f: "Tea 2" }, title: "T",
  }).text;
  assert.match(text, /^a: "true"$/m);
  assert.match(text, /^b: "null"$/m);
  assert.match(text, /^c: "123"$/m);
  assert.match(text, /^d: "no"$/m);
  assert.match(text, /^e: 5$/m);
  assert.match(text, /^f: Tea 2$/m);
  const more = new Note({ props: { a: "0x10", b: "1e3", c: "2026-11-02", d: "y" } }).text;
  assert.match(more, /^a: "0x10"$/m);
  assert.match(more, /^b: "1e3"$/m);
  assert.match(more, /^c: 2026-11-02$/m);   // a date stays a date
  assert.match(more, /^d: "y"$/m);
});

test("work task filenames use the next number and the lowercased title", () => {
  const names = ["38_mail_templates.md", "3_taxonomy_for_skelary_2.md", "_future_tasks_notes.md"];
  assert.equal(KINDS.work.file({ title: "Versions bug on Duplicates" }, names),
    "39_versions_bug_on_duplicates");
  assert.equal(KINDS.work.file({ title: "First" }, []), "1_first");
});

test("createJournal returns the note file with cleaned reasons and a numeric lag", async () => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-20" }) };
  const { files } = vault();
  const file = await createJournal({
    title: "Test journal", reasons: ["  Mint ", "", "  ", " Tea"], lag: 2,
  });

  assert.deepEqual(file, { path: `${KINDS.journal.folder}/Test journal.md` });
  assert.ok(files[file.path].startsWith(
    "---\ntype: journal\nlag: 2\nreasons:\n  - Mint\n  - Tea\n---\n",
  ));
});
