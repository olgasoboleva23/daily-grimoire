import { before, test } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let Component, useVueApp, h, ref, nextTick, Drawer;
before(async () => {
  GlobalRegistrator.register();
  HTMLElement.prototype.isShown = function () { return !this.hidden; };
  ({ Component } = await import("obsidian"));
  ({ useVueApp } = await import("#/shared/lib/vueApp.ts"));
  ({ h, ref, nextTick } = await import("vue"));
  Drawer = (await import("#/components/uikit/UiDrawer/index.vue")).default;
});

test("the tab's shadow drawer traps Tab, closes on Escape and restores the actual button's focus", async () => {
  const host = document.body.appendChild(document.createElement("div"));
  const root = host.attachShadow({ mode: "open" });
  const owner = new Component(), open = ref(false);
  owner.load();
  useVueApp(owner, root, { setup: () => () => h("div", [
    h("button", { onClick: () => { open.value = true; } }, "Other"),
    h(Drawer, { open: open.value, onClose: () => { open.value = false; } },
      () => [h("button", "First"), h("button", "Last")]),
  ]) });
  const other = root.querySelector("button");
  other.focus(); other.click();
  await nextTick(); await nextTick();
  const panel = root.querySelector(".ui-drawer__panel");
  assert.equal(root.activeElement, panel);
  const buttons = panel.querySelectorAll("button");
  panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(root.activeElement, buttons[1]);
  buttons[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  assert.equal(root.activeElement, buttons[0]);
  buttons[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await nextTick();
  assert.equal(root.activeElement, other);
  owner.unload();
  assert.equal(root.childElementCount, 0);
  host.remove();
});

test("task sounds recognise a checkbox across the shadow boundary and in native Markdown", async () => {
  const { installSounds, AudioEngine } = await import("#/shared/lib/sounds.js");
  const calls = [], play = AudioEngine.prototype.play;
  AudioEngine.prototype.play = function (options) { calls.push([this.path, options]); };
  const owner = new Component(), host = document.body.appendChild(document.createElement("div"));
  const root = host.attachShadow({ mode: "open" });
  const native = document.body.appendChild(document.createElement("input"));
  const row = root.appendChild(document.createElement("div")); row.dataset.goal = "training";
  const box = row.appendChild(document.createElement("input"));
  for (const el of [native, box]) { el.type = "checkbox"; el.className = "task-list-item-checkbox"; }
  try {
    owner.load(); installSounds(owner);
    box.click(); native.click(); box.click();
    assert.match(calls[0][0], /dragon_flower/);
    assert.match(calls[1][0], /pickup_gem/);
    assert.equal(calls[2][1].rate, 0.6);
  } finally {
    owner.unload(); host.remove(); native.remove(); AudioEngine.prototype.play = play;
  }
});

test("shadow tooltips use the native body popup, update and clean up on leave, click and unmount", async () => {
  const { vTip } = await import("#/components/uikit/tooltip.js");
  const host = document.body.appendChild(document.createElement("div"));
  const root = host.attachShadow({ mode: "open" });
  const button = root.appendChild(document.createElement("button"));
  const binding = value => ({ value, modifiers: { pink: true }, arg: "bottom" });
  const hover = () => button.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
  const wait = () => new Promise(resolve => setTimeout(resolve, 120));
  try {
    vTip.mounted(button, binding("First"));
    hover(); await wait();
    const tip = document.body.querySelector(".tooltip.ui-tooltip--pink");
    assert.equal(tip.textContent, "First");
    assert.equal(tip.dataset.placement, "bottom");
    button.dispatchEvent(new PointerEvent("pointerleave"));
    assert.equal(tip.isConnected, false);
    vTip.updated(button, binding("Second"));
    hover(); await wait();
    assert.equal(document.body.querySelector(".tooltip").textContent, "Second");
    button.dispatchEvent(new PointerEvent("pointerdown"));
    assert.equal(document.body.querySelector(".tooltip"), null);
    hover(); vTip.beforeUnmount(button); await wait();
    assert.equal(document.body.querySelector(".tooltip"), null);
  } finally { vTip.beforeUnmount(button); host.remove(); }
});
