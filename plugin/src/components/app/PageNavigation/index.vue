<!-- PageNavigation (block winx-menu): the nav (UiNav: the floating pill, the phone's
     bottom bar) with the main pages, ⋯ Other when a page isn't main, and Other's drawer
     (UiDrawer: from the left, the phone's bottom sheet) with those pages: desktop rows with a ↗
     (a new tab), the phone's round icons with their names; ⚙ Settings last (its window, no page).
     A click goes there (Cmd-click: a new tab) -->
<script setup>
import { inject, ref } from "vue";
import { Platform } from "obsidian";
import UiNav from "#/components/uikit/UiNav/index.vue";
import UiDrawer from "#/components/uikit/UiDrawer/index.vue";
import { openUi } from "#/components/app/open.ts";
import { pages } from "#/components/app/pages.js";
import { openSettings } from "#/controllers/settings.js";
import { APP_NAME } from "#/helpers/name.js";

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

// ↗: the page in a new, unpinned Winx tab
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
    class="winx-menu__rail"
    :items="items"
    :current="ui.state.page"
    :phone="phone"
    :expanded="other ? 'other' : null"
    @go="go"
  />
  <UiDrawer
    class="winx-menu__drawer"
    :open="other"
    :side="phone ? 'bottom' : 'left'"
    label="Other pages"
    @close="other = false"
  >
    <div v-if="!phone" class="winx-menu__head winx-row">
      <span class="winx-menu__crest winx-center" aria-hidden="true">✦</span>
      <span class="winx-menu__title">{{ APP_NAME }}</span>
    </div>
    <template v-for="p in rest" :key="p.key">
      <button
        v-if="phone"
        type="button"
        class="winx-menu__tile"
        :class="{ 'winx-menu__tile--on': p.key === ui.state.page }"
        @click="go(p.key, $event)"
      >
        <span class="winx-menu__tile-icon winx-center">{{ p.icon }}</span>
        <span class="winx-menu__label">{{ p.text }}</span>
      </button>
      <div
        v-else
        class="winx-menu__row winx-row"
        :class="{ 'winx-menu__row--on': p.key === ui.state.page }"
      >
        <button
          type="button"
          class="winx-menu__go winx-row winx-grow"
          @click="go(p.key, $event)"
        >
          <span class="winx-menu__icon winx-center">{{ p.icon }}</span>
          <span>{{ p.text }}</span>
        </button>
        <button
          type="button"
          class="winx-menu__open-tab winx-center"
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
      class="winx-menu__tile"
      @click="settings"
    >
      <span class="winx-menu__tile-icon winx-center">⚙</span>
      <span class="winx-menu__label">Settings</span>
    </button>
    <div v-else class="winx-menu__row winx-menu__row--last winx-row">
      <button type="button" class="winx-menu__go winx-row winx-grow" @click="settings">
        <span class="winx-menu__icon winx-center">⚙</span>
        <span>Settings</span>
      </button>
    </div>
  </UiDrawer>
</template>
