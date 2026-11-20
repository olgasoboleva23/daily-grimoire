import { test } from "node:test";
import assert from "node:assert/strict";
import { fillStart } from "#/controllers/prompts.js";

test("literal project text and an empty journal in a Start prompt", () => {
  assert.equal(fillStart("{Project_Name}\n{Last_3_Journal_Entries}\n{Current_Task_Or_Input}",
    { name: "$&", result: "", notes: "" }, [], "$1"), "$&\n$1");
});

test("editing the prompts lists the Start prompt's variables, each with what it becomes", async () => {
  const { Form } = await import("#/components/uikit/Form/index.ts");
  const { editPrompts, fillStart: fill } = await import("#/controllers/prompts.js");
  const ask = Form.ask;
  let rows, values;

  Form.ask = async (_app, _title, r, o) => { rows = r; values = o.values; return null; };
  try { await editPrompts({}); } finally { Form.ask = ask; }
  const vars = rows.find(r => r.key === "vars");

  assert.equal(vars.tab, "Start");
  assert.ok("label" in vars);
  for (const name of ["Project_Name", "Project_Result", "Project_Notes",
    "Last_3_Journal_Entries", "Current_Task_Or_Input"]) {
    assert.match(values.vars, new RegExp(`\\{${name}\\} — \\S`));
    assert.notEqual(fill(`{${name}}x`, { name: "N", result: "R", notes: "O" },
      [{ at: "2026-11-20T10:00", heading: "H", text: "T" }], "I"), `{${name}}x`);
  }
});
