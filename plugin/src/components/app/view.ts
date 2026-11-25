import { ItemView, Keymap, Notice, Platform, type ViewStateResult } from "obsidian";
import { reactive, watch } from "vue";
import { useVueApp } from "#/shared/lib/vueApp.ts";
import { isStep, readState, saved, withParams } from "#/store/router.js";
import { APP_NAME } from "#/helpers/name.js";
import { pages, UI_VIEW } from "./pages.js";
import UiApp from "./index.vue";
import styles from "#/styles/shadow.scss";

export { UI_VIEW } from "./pages.js";

export class UiView extends ItemView {
  navigation = true;   // Obsidian records a history step only for a navigation view
  // the saved state, plus the calendar's unsaved area and picked day; a new one per tab
  state;
  private closed = false;
  private mounted: ReturnType<typeof useVueApp> | null = null;

  constructor(leaf: ItemView["leaf"]) {
    super(leaf);
    const initial = readState(undefined);

    this.state = reactive({ ...initial,
      calendar: { ...initial.calendar, area: null as string | null, picked: null as string | null },
    });
    const json = () => JSON.stringify(saved(this.state));

    this.register(watch(json, () => this.app.workspace.requestSaveLayout()));
  }
  getViewType() { return UI_VIEW; }
  getDisplayText() {
    return pages[this.state.page as keyof typeof pages]?.title ?? APP_NAME;
  }
  getIcon() { return "sparkles"; }

  getState() { return saved(this.state); }
  async setState(s: unknown, result: ViewStateResult) {
    const next = readState(s);

    if (this.mounted) result.history = isStep(this.state, next);
    this.state.page = next.page;
    Object.assign(this.state.dashboard, next.dashboard);
    Object.assign(this.state.calendar, next.calendar);
    Object.assign(this.state.projects, next.projects);
    Object.assign(this.state.recipes, next.recipes);

    await super.setState(s, result);
    if (this.closed) return;
    if (!this.mounted) {
      const root = this.contentEl.shadowRoot ?? this.contentEl.attachShadow({ mode: "open" });

      const win = this.contentEl.ownerDocument.defaultView as Window
        & { CSSStyleSheet: typeof CSSStyleSheet };
      const sheet = new win.CSSStyleSheet();

      sheet.replaceSync(styles);
      root.adoptedStyleSheets = [sheet];
      this.mounted = useVueApp(this, root, UiApp, {
        provide: { ui: this },
        onError: error => {
          console.error(error);
          new Notice(`${this.getDisplayText()}: couldn't draw: ${error.message}`);
        },
      });
    }

    (this.leaf as any).updateHeader?.();
  }

  // to a page (params: its own state merged in); Cmd/Ctrl-click: in a new app tab, a copy of this
  // one's state
  async go(page: string, params = {}, e?: MouseEvent | null) {
    const state = withParams(this.state, page, params);

    if (Keymap.isModEvent(e)) {
      const leaf = this.app.workspace.getLeaf("tab");

      await leaf.setViewState({ type: UI_VIEW, state, active: true });
    } else {
      await this.leaf.setViewState({ type: UI_VIEW, state });
    }
  }

  async onOpen() {
    this.closed = false;
    this.contentEl.addClass("ui-host");
    // Native device classes reset Obsidian’s inherited header/navbar spacing.
    this.contentEl.toggleAttribute("data-mobile", Platform.isMobile);
    this.contentEl.toggleAttribute("data-phone", Platform.isPhone);
    // Obsidian cannot see the shadow scroller when recognizing pull-down gestures.
    this.contentEl.dataset.ignoreSwipe = "true";
  }
  onResize() { this.app.workspace.trigger("ui:page"); }
  async onClose() {
    this.closed = true;
    this.mounted?.unmount();
    this.mounted = null;
    const root = this.contentEl.shadowRoot;

    if (root) { root.replaceChildren(); root.adoptedStyleSheets = []; }
  }
}
