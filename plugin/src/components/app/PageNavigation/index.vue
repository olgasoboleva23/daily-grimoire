<!-- PageNavigation (block ui-menu): the nav (UiNav: the floating pill, the phone's
     bottom bar) with the main pages, ⋯ Other when a page isn't main, and Other's drawer
     (UiDrawer: from the left, the phone's bottom sheet) with those pages: desktop rows with a ↗
     (a new tab), the phone's round icons with their names; ⚙ Settings last (its window, no page).
     A click goes there (Cmd-click: a new tab) -->
<script setup>
import { inject, ref } from "vue";
import { Platform } from "obsidian";
import UiNav from "#/shared/ui/UiNav/index.vue";
import UiDrawer from "#/shared/ui/UiDrawer/index.vue";
import { openUi } from "#/shared/host/index.js";
import { pages, APP_NAME } from "#/shared/config/index.js";
import { openSettings } from "#/features/save-settings/index.js";

const ui = inject("ui");
const phone = Platform.isMobile;
const other = ref(false);   // Other's drawer open

const item = ([key, p]) => ({ key, icon: p.icon, text: p.title });
const entries = Object.entries(pages);
const rest = entries.filter(([, p]) => !p.main).map(item);
const items = [
  ...entries.filter(([, p]) => p.main).map(item),
  ...(rest.length ? [{ key: "other", icon: "⋯", text: "Other" }] : []),
];

function go(key, event) {
  other.value = key === "other" && !other.value;
  if (key !== "other") void ui.go(key, {}, event);
}

// ↗: the page in a new, unpinned app tab
function openTab(key) {
  other.value = false;
  void openUi(key, {}, true);
}

// ⚙ Settings, last in the drawer: its window, not a page
function settings() {
  other.value = false;
  void openSettings();
}
</script>

<template>
  <UiNav
    class="ui-menu__rail"
    :items="items"
    :current="ui.state.page"
    :phone="phone"
    :expanded="other ? 'other' : null"
    @go="go"
  />
  <UiDrawer
    class="ui-menu__drawer"
    :open="other"
    :side="phone ? 'bottom' : 'left'"
    label="Other pages"
    @close="other = false"
  >
    <div v-if="!phone" class="ui-menu__head ui-row">
      <span class="ui-menu__crest ui-center" aria-hidden="true">✦</span>
      <span class="ui-menu__title">{{ APP_NAME }}</span>
    </div>
    <template v-for="p in rest" :key="p.key">
      <button
        v-if="phone"
        type="button"
        class="ui-menu__tile"
        :class="{ 'ui-menu__tile--on': p.key === ui.state.page }"
        @click="go(p.key, $event)"
      >
        <span class="ui-menu__tile-icon ui-center">{{ p.icon }}</span>
        <span class="ui-menu__label">{{ p.text }}</span>
      </button>
      <div
        v-else
        class="ui-menu__row ui-row"
        :class="{ 'ui-menu__row--on': p.key === ui.state.page }"
      >
        <button
          type="button"
          class="ui-menu__go ui-row ui-grow"
          @click="go(p.key, $event)"
        >
          <span class="ui-menu__icon ui-center">{{ p.icon }}</span>
          <span>{{ p.text }}</span>
        </button>
        <button
          type="button"
          class="ui-menu__open-tab ui-center"
          :title="`${p.text} in a new tab`"
          :aria-label="`${p.text} in a new tab`"
          @click="openTab(p.key)"
        >
          ↗
        </button>
      </div>
    </template>
    <button
      v-if="phone"
      type="button"
      class="ui-menu__tile"
      @click="settings"
    >
      <span class="ui-menu__tile-icon ui-center">⚙</span>
      <span class="ui-menu__label">Settings</span>
    </button>
    <div v-else class="ui-menu__row ui-menu__row--last ui-row">
      <button type="button" class="ui-menu__go ui-row ui-grow" @click="settings">
        <span class="ui-menu__icon ui-center">⚙</span>
        <span>Settings</span>
      </button>
    </div>
  </UiDrawer>
</template>
