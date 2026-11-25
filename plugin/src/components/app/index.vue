<script setup>
import { computed, inject, nextTick, watch } from "vue";
import { Platform } from "obsidian";
import config, { pages } from "#/shared/config/index.js";
import { taskStore } from "#/entities/task/index.js";
import PageNavigation from "./PageNavigation/index.vue";
import Widget from "#/shared/ui/UiWidget.vue";
import { pageMap } from "#/app/pageMap.js";

const ui = inject("ui"), phone = Platform.isMobile;
const theme = computed(() => (taskStore.version.value, config.theme));
const page = computed(() => pages[ui.state.page]);
watch(() => ui.state.page, async () => {
  await nextTick();
  ui.app.workspace.trigger("ui:page");
});
</script>

<template>
  <div
    :class="['ui-view dashboard', { 'ui-view--phone': phone }]"
    :data-page="ui.state.page"
    :data-theme="theme"
  >
    <div class="ui-view__pages">
      <KeepAlive :include="['CalendarPage', 'DashboardPage']">
        <component
          :is="pageMap[ui.state.page]"
          v-if="!page.widget"
          :key="ui.state.page"
          :state="ui.state[ui.state.page]"
        />
      </KeepAlive>
      <div
        v-if="page.widget"
        :key="ui.state.page"
        class="ui-view__page markdown-preview-view markdown-rendered dashboard"
      >
        <h2>{{ page.title }}</h2>
        <Widget
          :definition="{
            ...pageMap[ui.state.page], note: page.note,
            card: page.card ? { meta: ['hero'] } : undefined,
          }"
        />
      </div>
    </div>
    <div class="ui-view__nav ui-menu"><PageNavigation /></div>
  </div>
</template>
