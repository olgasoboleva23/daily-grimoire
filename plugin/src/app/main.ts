import { Platform, Plugin } from "obsidian";
import { UI_VIEW, UiView } from "./tab/view.ts";
import { openUi, setApp } from "#/shared/host/index.js";
import { registerCommands } from "./commands.ts";
import { useNotify } from "./notify.js";
import { installSounds } from "#/shared/lib/sounds.js";
import { useTheme } from "./theme.js";
import { useTaskStore } from "./tasksSync.js";

// Daily Grimoire: the app tab, the task window and the
// commands, and the styles (styles.css, built from src/app/styles/main.scss and the components'
// index.scss).

export default class UiPlugin extends Plugin {
  async onload() {
    setApp(this.app);
    useTaskStore(this);   // the tasks, read by the plugin itself (app/tasksSync.js)
    useTheme(this);
    installSounds(this);
    registerCommands(this);
    // the app tab (its pages: shared/config/pages.js); ✨ and the command go to the one used
    // last, or open it, pinned, on the dashboard
    this.registerView(UI_VIEW, leaf => new UiView(leaf));
    this.addCommand({ id: "open", name: "Open", callback: () => openUi() });
    this.addRibbonIcon("sparkles", this.manifest.name, () => openUi());
    this.addCommand({   // after a rebuild: load the new main.js without restarting Obsidian
      id: "reload",
      name: "Reload",
      callback: async () => {
        const plugins = (this.app as any).plugins;
        await plugins.disablePlugin(this.manifest.id);
        await plugins.enablePlugin(this.manifest.id);
      },
    });
    // the phone has no status bar: "✦ syncing" (the star spinning) at the top while Remotely Save
    // syncs
    if (Platform.isMobile) {
      // hidden even before the styles load
      const badge = document.body.createDiv({
        cls: "ui-syncing", attr: { style: "display: none" },
      });
      badge.createSpan({ cls: "ui-syncing__star", text: "✦" });
      badge.appendText("syncing");
      this.register(() => badge.remove());
      const syncing = () => (this.app as any).plugins.plugins["remotely-save"]?.isSyncing;
      this.registerInterval(window.setInterval(() => {
        badge.style.display = syncing() ? "flex" : "none";
      }, 500));
    }

    // desktop: today's reminders; a click opens the calendar in the app tab
    useNotify(this, () => openUi("calendar"));
  }
}
