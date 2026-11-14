import { ItemView, Keymap, Notice, Platform, type ViewStateResult } from "obsidian";
import { reactive, watch } from "vue";
import { useVueApp } from "#/composables/vueApp.ts";
import { isStep, readState, saved, withParams } from "#/store/router.js";
import { pages, WINX_VIEW } from "./pages.js";
import Winx from "./index.vue";
import styles from "#/styles/shadow.scss";

export { WINX_VIEW } from "./pages.js";

export class WinxView extends ItemView {
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
  getViewType() { return WINX_VIEW; }
  getDisplayText() {
    return pages[this.state.page as keyof typeof pages]?.title ?? "Daily Grimoire";
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

    await super.setState(s, result);
    if (this.closed) return;
    if (!this.mounted) {
      const root = this.contentEl.shadowRoot ?? this.contentEl.attachShadow({ mode: "open" });

      const win = this.contentEl.ownerDocument.defaultView as Window
        & { CSSStyleSheet: typeof CSSStyleSheet };
      const sheet = new win.CSSStyleSheet();

      sheet.replaceSync(styles);
      root.adoptedStyleSheets = [sheet];
      this.mounted = useVueApp(this, root, Winx, {
        provide: { winx: this },
        onError: error => {
          console.error(error);
          new Notice(`${this.getDisplayText()}: couldn't draw: ${error.message}`);
        },
      });
    }

    (this.leaf as any).updateHeader?.();
  }

  // to a page (params: its own state merged in); Cmd/Ctrl-click: in a new Winx tab, a copy of this
  // one's state
  async go(page: string, params = {}, e?: MouseEvent | null) {
    const state = withParams(this.state, page, params);

    if (Keymap.isModEvent(e)) {
      const leaf = this.app.workspace.getLeaf("tab");

      await leaf.setViewState({ type: WINX_VIEW, state, active: true });
    } else {
      await this.leaf.setViewState({ type: WINX_VIEW, state });
    }
  }

  async onOpen() {
    this.closed = false;
    this.contentEl.addClass("winx-host");
    this.contentEl.classList.toggle("is-mobile", Platform.isMobile);
    this.contentEl.classList.toggle("is-phone", Platform.isPhone);
  }
  onResize() { this.app.workspace.trigger("winx:page"); }
  async onClose() {
    this.closed = true;
    this.mounted?.unmount();
    this.mounted = null;
    const root = this.contentEl.shadowRoot;

    if (root) { root.replaceChildren(); root.adoptedStyleSheets = []; }
  }
}
