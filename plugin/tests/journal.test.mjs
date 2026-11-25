import { test } from "node:test";
import assert from "node:assert/strict";
import { journalOf } from "#/models/journal.js";
import { addNote } from "#/pages/projects/index.js";
import { vault } from "./stubs/vault.mjs";

test("journal ownership survives a missing target and distinguishes shared tasks", () => {
  const owner = { kind: "project", id: "p1" };
  const note = { owner, at: "2026-11-20T09:00", target: { kind: "task", id: "t1" }, title: "", text: "session", link: "" };
  const state = { projects: new Map([["p1", { name: "P", stages: [{ id: "st1", name: "S", tasks: ["t1"] }] }]]),
    notes: new Map([["n2", note], ["n10", { ...note, target: owner }], ["n3", { ...note, owner: null }]]),
    tasks: new Map([["t1", { name: "Practice" }]]) };
  assert.deepEqual(journalOf("p1", state).map(x => x.heading), ["P", "Practice"]);
  state.tasks.get("t1").name = "Updated";
  assert.equal(journalOf("p1", state)[1].heading, "Updated");
  state.projects.get("p1").stages = [];
  assert.equal(journalOf("p1", state)[1].gone, true);
});

test("empty notes and missing links do not create a journal", async () => {
  const { files } = vault();
  const target = { kind: "project", id: "p1" };
  assert.equal(await addNote({ target, at: "2026-11-20T09:00" }), null);
  assert.equal(await addNote({ target, at: "2026-11-20T09:00", link: "missing.md" }), null);
  assert.equal(Object.keys(files).length, 0);
});
