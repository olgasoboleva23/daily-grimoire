// Windows: the one way to open one. openWindow(Component, props) draws a window (a Vue component
// whose template starts with UiWindow) in the current frame and resolves to what it emits with
// done(result); null when it is closed any other way (×, Esc, a click outside). A window never
// emits done(null).
// The frame is what draws it: Obsidian's Modal (WindowModal below) now, the test frame in the
// tests (tests/stubs/windows.mjs), our own non-blocking frame later, each put in place by
// setFrame without touching any window. A window reaches its frame through the context provided
// under WINDOW (UiWindow injects it): its title, its Enter, a class on the frame, the Obsidian
// owner it unloads with, close.
import { Component, Modal, type App } from "obsidian";
import { h, type Component as VueComponent } from "vue";
import { app } from "#/helpers/app.js";
import { useVueApp } from "#/shared/lib/vueApp.ts";

type Props = Record<string, unknown>;
type Finish = (result: unknown) => void;

interface Frame { open(component: VueComponent, props: Props, finish: Finish): void }

interface WindowContext {
  setTitle(text: string): void;
  onEnter(submit: () => void): void;   // the frame's Enter calls it
  addClass(name: string): void;        // on the frame's element (a viewer's width)
  owner: Component;                    // unloads with the window
  close(): void;
}

export const WINDOW = "uiWindow";

// Enter in a window: its submit, even with nothing focused; in a textarea, a new line
export function enterKey(e: Pick<KeyboardEvent, "target" | "preventDefault">, submit?: () => void) {
  if ((e.target as HTMLElement | null)?.tagName === "TEXTAREA") return;
  e.preventDefault();
  submit?.();
}

// The Obsidian frame: a Modal with the window's Vue app in its content, Enter in its keyboard
// scope (so it works with nothing focused), the app unmounted on close
class WindowModal extends Modal {
  private owner = new Component();
  private component: VueComponent;
  private props: Props;
  private finish: Finish;
  private submit?: () => void;
  private result: unknown = null;

  constructor(app: App, component: VueComponent, props: Props, finish: Finish) {
    super(app);
    this.component = component;
    this.props = props;
    this.finish = finish;
  }

  onOpen() {
    const context: WindowContext = {
      setTitle: text => this.titleEl.setText(text),
      onEnter: submit => { this.submit = submit; },
      addClass: name => this.modalEl.addClass(name),
      owner: this.owner,
      close: () => this.close(),
    };
    const onDone = (result: unknown) => {
      this.result = result;
      this.close();
    };

    this.owner.load();
    useVueApp(this.owner, this.contentEl, {
      render: () => h(this.component, { ...this.props, onDone }),
    }, { provide: { [WINDOW]: context } });
    this.scope.register([], "Enter", e => enterKey(e, this.submit));
  }

  onClose() {
    this.owner.unload();
    this.finish(this.result);
  }
}

let frame: Frame = {
  open: (component, props, finish) => new WindowModal(app, component, props, finish).open(),
};

// the frame windows open in from now on; returns the one it replaces (a test puts it back)
export function setFrame(next: Frame): Frame {
  const was = frame;

  frame = next;
  return was;
}

export const openWindow = (component: VueComponent, props: Props = {}) =>
  new Promise<unknown>(resolve => frame.open(component, props, resolve));
