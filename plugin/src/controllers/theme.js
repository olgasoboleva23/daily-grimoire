// One synced choice; only Winx containers inherit its palette (styles/_themes.scss).
import { watch } from "vue";
import config, { THEMES, THEME_IMAGES } from "#/shared/config/index.js";
import { taskStore } from "#/store/tasks.js";
import { useFileChanges } from "#/shared/lib/use.js";

export function useTheme(plugin) {
  const { app } = plugin, body = document.body;
  const classes = THEMES.map(t => `ui-theme-${t.value}`);
  const images = THEMES.filter(t => t.value !== "winx")
    .map(t => `${THEME_IMAGES}/${t.value}.avif`);
  const clear = () => {
    body.classList.remove(...classes);
    body.style.removeProperty("--ui-theme-image");
  };

  const apply = () => {
    clear();
    if (config.theme !== "winx") {
      body.classList.add(`ui-theme-${config.theme}`);
      const file = app.vault.getFileByPath(`${THEME_IMAGES}/${config.theme}.avif`);

      body.style.setProperty("--ui-theme-image",
        file ? `url(${JSON.stringify(app.vault.getResourcePath(file))})` : "none");
    }

    app.workspace.trigger("ui:theme");
  };

  // The store reads config before its version changes; apply before widgets rebuild charts.
  plugin.register(watch(() => (taskStore.version.value, config.theme), apply,
    { immediate: true, flush: "sync" }));
  // An image can arrive after config during sync.
  useFileChanges(plugin, apply, path => images.includes(path));
  plugin.register(clear);
}
