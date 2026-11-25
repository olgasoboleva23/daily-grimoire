import { FuzzySuggestModal, Platform, type Plugin, type TFile } from "obsidian";
import { APP_NAME } from "#/helpers/name.js";
import { KINDS } from "#/models/kinds.js";
import { mirrorMobileConfig } from "#/controllers/mobileConfig.js";
import { newTask } from "#/components/windows/tasks/TaskWindow/open.js";
import { migrateTasks } from "#/migrations/tasks.js";
import { openSettings } from "#/components/windows/settings/SettingsWindow/open.js";
import { createNote } from "#/controllers/notes.js";
import { openNewProject } from "#/components/windows/projects/ProjectWindow/open.js";
import { addMarketItem } from "#/components/windows/market/MarketItemWindow/open.js";
import {
  openEditCourse, openNewCourse, pickCourse,
} from "#/components/windows/meds/CourseWindow/open.js";
import { openWindow } from "#/components/uikit/Window/open.ts";
import { askValue } from "#/components/uikit/FieldWindow/ask.js";
import CollectionItemWindow from "#/components/windows/notes/CollectionItemWindow/index.vue";
import NewJournalWindow from "#/components/windows/journals/NewJournalWindow/index.vue";
import BuyRewardWindow from "#/components/windows/shop/BuyRewardWindow/index.vue";


// The commands in Cmd+P ("Daily Grimoire: …"); each one window, then saved.
export function registerCommands(plugin: Plugin) {
  const { app } = plugin;
  const add = (id: string, name: string, run: () => Promise<void>) =>
    plugin.addCommand({ id, name, callback: run });

  // a past task (its difficulty, area, time and sticker come along) or a new one: then difficulty,
  // area, time of day, sticker (or "to pool") in one window; then the Tasks modal for the text and
  // dates
  add("new-task", "New task", async () => void await newTask());

  // a watch / read / game / recipe / work task note or a free journal (models/kinds.js), in its
  // folder, opened in a new tab: a watch / read / game item and a journal in their windows, a
  // recipe and a work task asked only their title
  const newNote = async (key: string, kind: any, dir: string) => {
    if (kind.statuses) return openWindow(CollectionItemWindow, { kind: key, dir });
    if (key === "journal") return openWindow(NewJournalWindow);
    const title = await askValue({
      title: `✦ ${kind.name}`, name: "Title", placeholder: "title", required: true,
      submit: "Create",
    });

    return title && createNote(kind, { title }, dir);
  };

  for (const [key, kind] of Object.entries(KINDS) as [string, any][]) {
    add(kind.id, kind.name, async () => {
      const dir = (kind.setting && (await plugin.loadData())?.[kind.setting]) || kind.folder;
      const file = await newNote(key, kind, dir) as TFile | null;

      if (file) await app.workspace.getLeaf("tab").openFile(file);
    });
  }

  // a project: name, description, status, an optional cover; then the Projects tab opens on it
  add("new-project", "New project", async () => void await openNewProject());

  // a medication course (courses.json), then the Medication page opens; edited: the only one, or
  // the one picked (the ✎ on its card does the same)
  add("new-meds", "New medication course", async () => void await openNewCourse());
  add("edit-meds", "Edit medication course", async () => {
    const id = await pickCourse();

    if (id) await openEditCourse(id);
  });

  // a purchase, logged to Purchases.md (the wallet's spent) when the gold covers it
  add("buy-reward", "Buy reward", async () => void await openWindow(BuyRewardWindow));

  // a shopping item in the Celestial Market: one bought before, or a new one with its category
  add("new-market-item", "New market item", addMarketItem);

  // the phone: the synced obsidian-mobile/ copied into the real config folder .obsidian-mobile
  // (then restart)
  if (Platform.isMobile) add("update-mobile-config", "Update mobile config", mirrorMobileConfig);

  // ⚙ the numbers and areas (config.json); the app tab's drawer opens it too
  add("settings", "Settings", async () => void await openSettings());

  // once: the old emoji Master.md and Pool.md to ids, Dataview fields and tasks.json
  add("migrate-tasks", "Migrate tasks", migrateTasks);

  // every Daily Grimoire command in one list to pick from (Alt+T in this vault's hotkeys.json)
  plugin.addCommand({
    id: "menu", name: "Menu",
    callback: () => new UiMenu(app).open(),
  });
}

class UiMenu extends FuzzySuggestModal<any> {
  getItems() {
    return (this.app as any).commands.listCommands()
      .filter((c: any) => c.id.startsWith("daily-grimoire:") && c.id !== "daily-grimoire:menu");
  }
  getItemText(c: any) { return c.name.replace(`${APP_NAME}: `, ""); }
  onChooseItem(c: any) { (this.app as any).commands.executeCommandById(c.id); }
}
