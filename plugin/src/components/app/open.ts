import { ItemView, Keymap, type WorkspaceLeaf } from "obsidian";
import { app } from "#/helpers/app.js";
import { APP_NAME } from "#/helpers/name.js";
import { OLD_UI_VIEW, pageOf, UI_VIEW } from "./pages.js";
import type { UiView } from "./view.ts";

// Opening Winx: ✨, the command and the reminders go to the Winx tab used last, or open one
// (pinned) on the dashboard; `newTab`: another one, not pinned. With a page: that page in it.
export async function openUi(page?: string, params = {}, newTab = false) {
  const { workspace } = app;
  const newest = (a: any, b: any) => (b.activeTime ?? 0) - (a.activeTime ?? 0);
  let leaf: WorkspaceLeaf | undefined = newTab ? undefined
    : [...workspace.getLeavesOfType(UI_VIEW), ...workspace.getLeavesOfType(OLD_UI_VIEW)]
      .sort(newest)[0];

  if (!leaf) {
    // a fresh tab opens on its page in one call: no dashboard step to go Back to
    leaf = workspace.getLeaf("tab");
    const state = page ? { page, [page]: params } : undefined;

    await leaf.setViewState({ type: UI_VIEW, active: true, state });
    if (!newTab) leaf.setPinned(true);
    await workspace.revealLeaf(leaf);
    return leaf;
  }

  await workspace.revealLeaf(leaf);   // loads a tab still deferred since the start
  // TODO: delete with OldUiView, one release after the rename
  if (leaf.view.getViewType() === OLD_UI_VIEW) await toUi(leaf, leaf.getViewState().state);
  if (page) await (leaf.view as UiView).go(page, params);
  return leaf;
}

// the Winx tab in front, if it is one
export const activeUi = (): UiView | null => {
  const view = app.workspace.getActiveViewOfType(ItemView);

  return view?.getViewType() === UI_VIEW ? view as UiView : null;
};

// is a Winx tab the one in front?
export const inUi = () => activeUi() !== null;

// A link to a note: a Winx page's note (Finance, Shop, Supplies, Food) switches the page of the
// Winx tab in front, in place (Cmd/Ctrl: in a new Winx tab); any other note opens as a note
// does, in a new tab from a Winx tab, so that one stays where it is. `href` may be a short link
// ("Finance").
export function openNote(href: string, sourcePath: string, e?: MouseEvent | null,
  tab: UiView | null = activeUi()) {
  const path = app.metadataCache.getFirstLinkpathDest(href, sourcePath)?.path;
  const page = path ? pageOf(path) : null;

  if (tab && page) return void tab.go(page, {}, e);
  return void app.workspace.openLinkText(href, sourcePath, Keymap.isModEvent(e) || tab !== null);
}

// the leaf as a Ui tab with this state; `popstate` (not in the typings, but read by Obsidian's
// setViewState): no Back step for the old view this replaces
const toUi = (leaf: WorkspaceLeaf, state: unknown) =>
  leaf.setViewState({ type: UI_VIEW, state, popstate: true } as any);

// TODO: delete after one release with the rename "winx" → "ui-app" (this class, OLD_UI_VIEW, the
// registerView of it in main.ts, and the lookup in openUi).
// A saved layout still has leaves of the type "winx": they come back as a Ui tab with their state.
export class OldUiView extends ItemView {
  private state: unknown = {};
  private timer = 0;

  getViewType() { return OLD_UI_VIEW; }
  getDisplayText() { return APP_NAME; }
  getState() { return this.state as Record<string, unknown>; }
  async onClose() { window.clearTimeout(this.timer); }

  // Obsidian ignores a setViewState while the leaf is still busy with this one: moved a moment
  // later (not when it is closed, or already something else)
  async setState(s: unknown) {
    this.state = s ?? {};
    this.timer = window.setTimeout(() => {
      if (this.leaf.view === this) void toUi(this.leaf, this.state);
    });
  }
}
