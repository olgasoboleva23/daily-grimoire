// The test frame for windows (shared/ui/Window/index.ts): testWindows() puts it in place of Obsidian's
// Modal, so a test opens a window the way its opener does and answers it. It loads Vue: import it
// after happy-dom is registered (`await import("./stubs/windows.mjs")` in before()).
//   const windows = testWindows();      // windows.restore() at the end
//   const running = openSomething();    // the opener, as a button would call it
//   const w = await windows.next();     // the windows in the order they opened
//   await w.wrapper.find("input").setValue("Garden");
//   await w.submit();                   // the button, then the write's ticks
// An opened window: { component, props, title, classes, wrapper, submit(), enter(target?),
// close() } (enter: the frame's Enter, from `target`; close: ×). Several can be open at once (a
// dish form over a product window); `all` is the ones still open.
import { flushPromises, mount } from "@vue/test-utils";
import { Component } from "obsidian";
import { enterKey, setFrame, WINDOW } from "#/shared/ui/Window/index.ts";

const settle = async () => {
  await flushPromises();
  await new Promise(r => setTimeout(r));
};

export function testWindows() {
  const all = [], opened = [], waiting = [];
  const previous = setFrame({ open(component, props, finish) {
    const owner = new Component();
    let submit = null, finished = false;
    const end = result => {
      if (finished) return;
      finished = true;
      w.wrapper.unmount();
      owner.unload();
      all.splice(all.indexOf(w), 1);
      finish(result);
    };
    const w = {
      component, props, title: "", classes: [],
      submit: async () => {
        await w.wrapper.find(".ui-window__submit").trigger("click");
        await settle();
      },
      enter: async (target = document.body) => {
        enterKey({ target, preventDefault() {} }, submit);
        await settle();
      },
      close: async () => { end(null); await settle(); },
    };
    const context = {
      setTitle: t => { w.title = t; }, onEnter: s => { submit = s; },
      addClass: c => w.classes.push(c), owner, close: () => end(null),
    };

    owner.load();
    w.wrapper = mount(component, {
      props: { ...props, onDone: end }, attachTo: document.body,
      global: { provide: { [WINDOW]: context } },
    });
    all.push(w);
    if (waiting.length) waiting.shift()(w);
    else opened.push(w);
  } });

  return {
    all,
    next: () => opened.length ? Promise.resolve(opened.shift()) : new Promise(r => waiting.push(r)),
    restore() {
      [...all].forEach(w => w.close());
      setFrame(previous);
    },
  };
}
