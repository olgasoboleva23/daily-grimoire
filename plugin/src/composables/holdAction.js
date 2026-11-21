// Touch confirmation keeps native mouse and keyboard clicks.
const HOLD_MS = 1500;
const bindings = new WeakMap();

export const vHoldAction = {
  mounted(el, binding) {
    const state = { action: binding.value };
    const listeners = new AbortController();
    const on = (event, fn, options = {}) =>
      el.addEventListener(event, fn, { ...options, signal: listeners.signal });
    let timer, strip, finger, startX, startY, blockClick = false, ready = false;

    const cancel = () => {
      window.clearTimeout(timer);
      strip?.removeAttribute("data-holding");
      strip = null;
      finger = null;
      ready = false;
    };

    on("touchstart", e => {
      cancel();
      if (!document.body.classList.contains("is-mobile") || el.disabled) return;
      blockClick = true;
      if (e.touches.length !== 1) return;
      const first = e.touches[0];

      finger = first.identifier;
      startX = first.clientX;
      startY = first.clientY;
      strip = el.closest(".ui-task__actions");
      const style = getComputedStyle(el);

      strip.style.setProperty("--ui-hold-background", style.backgroundColor);
      strip.style.setProperty("--ui-hold-image", style.backgroundImage);
      strip.dataset.holding = "";
      strip.style.setProperty("--ui-hold-duration", HOLD_MS + "ms");
      timer = window.setTimeout(() => {
        if (!el.isConnected || el.disabled) return cancel();
        // Native date pickers require user activation on touchend.
        if (binding.modifiers.release) ready = true;
        else {
          cancel();
          state.action();
        }
      }, HOLD_MS);
    }, { passive: true });
    on("touchmove", e => {
      if (!strip) return;
      const t = e.touches[0], r = el.getBoundingClientRect();

      if (e.touches.length !== 1 || t.identifier !== finger
        || Math.hypot(t.clientX - startX, t.clientY - startY) > 12 || t.clientX < r.left
        || t.clientX > r.right || t.clientY < r.top || t.clientY > r.bottom) cancel();
    }, { passive: true });
    on("touchcancel", cancel);
    on("touchend", e => {
      if (!blockClick) return;
      if (e.cancelable) e.preventDefault();
      const run = ready;

      cancel();
      if (run) state.action();
    });
    on("click", e => {
      if (blockClick && e.detail) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, { capture: true });
    on("pointerdown", e => { if (e.pointerType === "mouse") blockClick = false; });
    state.dispose = () => { cancel(); listeners.abort(); };

    bindings.set(el, state);
  },
  updated(el, binding) { bindings.get(el).action = binding.value; },
  beforeUnmount(el) { bindings.get(el).dispose(); bindings.delete(el); },
};
