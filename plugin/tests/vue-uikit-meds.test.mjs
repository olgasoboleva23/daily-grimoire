import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, UiTabs;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  UiTabs = (await import("../src/components/uikit/UiTabs/index.vue")).default;
});

test("UiTabs: scroll keeps the tabs in one row", () => {
  const tabs = [{ key: "a", text: "A" }];

  assert.ok(mount(UiTabs, { props: { tabs, scroll: true } }).classes("ui-tabs--scroll"));
  assert.ok(!mount(UiTabs, { props: { tabs } }).classes("ui-tabs--scroll"));
});
