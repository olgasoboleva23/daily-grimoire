import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";

let mount, SavingsJars, deposit, paydaySum, testWindows;
before(async () => {
  GlobalRegistrator.register();
  globalThis.window.moment = () => ({ format: () => "2026-10-30" });
  ({ mount } = await import("@vue/test-utils"));
  SavingsJars = (await import("#/components/pages/dashboard/widgets/savings/index.vue")).default;
  ({ deposit, paydaySum } = await import("#/controllers/widgets/savings.js"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
});
const jar = {
  path: "S/Bike.md", name: "New bike", img: "app://bike.webp", greyed: "clip-path: inset(0 0 25% 0)",
  big: "10 000 ₽", note: "25% of 40 000 ₽", fill: 25, stamps: [true, true, false], next: "Mon 16.11 · Mon 30.11",
  due: { when: "payday today", sum: "5 000 ₽" },
};
const tick = () => new Promise(r => setTimeout(r));

test("Savings: a jar's picture, sums, bar and stamps; ✓ done puts that jar's deposit in its note", async () => {
  const { files } = vault({ "S/Bike.md": "- 2026-10-16 5000\n" }, { props: { "S/Bike.md": { per_payday: 5000 } } });
  const w = mount(SavingsJars, { props: { state: { data: { jars: [jar], empty: "" } } } });
  assert.equal(w.find(".ui-jar__name").text(), "✦ New bike");
  assert.equal(w.findAll(".ui-jar__img").length, 2);
  assert.equal(w.findAll(".ui-jar__stamp--on").length, 2);
  assert.equal(w.find(".ui-jar__due-sum").text(), "put in 5 000 ₽");
  await w.find(".ui-jar__due button").trigger("click"); await tick();
  assert.equal(files["S/Bike.md"], "- 2026-10-16 5000\n- 2026-10-30 5000\n");
  const none = mount(SavingsJars, { props: { state: { data: { jars: [], empty: "A goal: a note in S" } } } });
  assert.equal(none.text(), "✦ A goal: a note in S");
});

test("✓ done without per_payday asks ✦ Deposit's sum, puts it in; closed: nothing", async () => {
  const windows = testWindows();
  const { files } = vault({ "S/Free.md": "" });
  const w = mount(SavingsJars, { props: { state: { data: { jars: [{ ...jar, path: "S/Free.md" }],
    empty: "" } } } });

  try {
    await w.find(".ui-jar__due button").trigger("click");
    const s = await windows.next();

    assert.deepEqual(s.props, { title: "✦ Deposit", name: "Sum", type: "number",
      placeholder: "how much", required: true, submit: "Put in" });
    await s.wrapper.find("input").setValue("700");
    await s.submit();
    assert.equal(files["S/Free.md"], "\n- 2026-10-30 700\n");
    await w.find(".ui-jar__due button").trigger("click");
    await (await windows.next()).close();
    assert.equal(files["S/Free.md"], "\n- 2026-10-30 700\n");
  } finally { windows.restore(); }
});

test("paydaySum reads the preset; an explicit deposit writes the submitted amount", async () => {
  const { files } = vault({ "S/Bike.md": "", "S/Free.md": "" }, {
    props: { "S/Bike.md": { per_payday: 5000 } },
  });

  assert.equal(paydaySum("S/Bike.md"), 5000);
  assert.equal(paydaySum("S/Free.md"), null);
  await deposit("S/Bike.md", 700);
  assert.equal(files["S/Bike.md"], "\n- 2026-10-30 700\n");
});
