// v-tip="text": Obsidian's tooltip on hover (setTooltip: drawn on the body, so nothing clips
// it), in the Winx look (styles/_tooltip.scss: .tooltip.ui-tooltip): blue over the pink paper;
// v-tip.pink for a blue place (Missed, today); v-tip:bottom puts it below. The value may be
// { text, pink, placement } when a component decides (UiButton). Nothing for an empty text;
// it comes after 100 ms (Obsidian's own is slower at first).
import { displayTooltip, setTooltip } from "obsidian";

const shadows = new WeakMap();

const tip = (el, { value, arg, modifiers }) => {
  const { text, pink = modifiers.pink, placement = arg ?? "top" } =
    typeof value === "object" && value ? value : { text: value };

  if (!text && !shadows.has(el)) return;

  const classes = ["ui-tooltip", ...(pink ? ["ui-tooltip--pink"] : [])];

  const options = { classes, placement };

  setTooltip(el, text ?? "", { ...options, delay: 100 });
  const existing = shadows.get(el);

  if (existing) {
    Object.assign(existing, { text, options });
    if (!text) existing.hide();
    return;
  }

  if (!el.getRootNode().host) return;

  // setTooltip delegates hover to body, where a shadow child is retargeted to its host.
  const win = el.ownerDocument.defaultView;
  const state = { text, options, timer: null, shown: null };
  const hide = () => {
    win.clearTimeout(state.timer);
    state.shown?.remove();
    state.shown = null;
  };

  const show = event => {
    if (event.pointerType === "touch") return;
    hide();
    state.timer = win.setTimeout(() => {
      if (!state.text || !el.isConnected) return;
      displayTooltip(el, state.text, { ...state.options, classes: [...state.options.classes] });
      state.shown = el.ownerDocument.querySelector(".tooltip.ui-tooltip");
    }, 100);
  };

  el.addEventListener("pointerenter", show);
  el.addEventListener("pointerleave", hide);
  el.addEventListener("pointerdown", hide);
  shadows.set(el, Object.assign(state, { hide, dispose: () => {
    hide();
    el.removeEventListener("pointerenter", show);
    el.removeEventListener("pointerleave", hide);
    el.removeEventListener("pointerdown", hide);
    shadows.delete(el);
  } }));
};

export const vTip = {
  mounted: tip, updated: tip,
  beforeUnmount: el => shadows.get(el)?.dispose(),
};
