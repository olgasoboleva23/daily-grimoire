<script setup>
import { computed, inject, nextTick, watch } from "vue";
import { Platform } from "obsidian";
import config from "#/helpers/config.js";
import { taskStore } from "#/store/tasks.js";
import { pages } from "./pages.js";
import PageNavigation from "./PageNavigation/index.vue";
import Widget from "#/components/UiWidget.vue";
import { blocks } from "#/controllers/blocks.js";
import Dashboard from "#/components/pages/dashboard/index.vue";
import Calendar from "#/components/pages/calendar/index.vue";
import Projects from "#/components/pages/projects/index.vue";

const ui = inject("ui"), phone = Platform.isMobile;
const views = { dashboard: Dashboard, calendar: Calendar, projects: Projects };
const theme = computed(() => (taskStore.version.value, config.theme));
const page = computed(() => pages[ui.state.page]);
watch(() => ui.state.page, async () => {
  await nextTick();
  ui.app.workspace.trigger("winx:page");
});
</script>

<template>
  <div
    :class="['winx-view dashboard', { 'winx-view--phone': phone }]"
    :data-page="ui.state.page"
    :data-theme="theme"
  >
    <div class="winx-view__pages">
      <KeepAlive :include="['CalendarPage', 'DashboardPage']">
        <component
          :is="views[ui.state.page]"
          v-if="!page.widget"
          :key="ui.state.page"
          :state="ui.state[ui.state.page]"
        />
      </KeepAlive>
      <div
        v-if="page.widget"
        :key="ui.state.page"
        class="winx-view__page markdown-preview-view markdown-rendered dashboard"
      >
        <h2>{{ page.title }}</h2>
        <Widget
          :definition="{
            ...blocks[page.widget], note: page.note,
            card: page.card ? { meta: ['hero'] } : undefined,
          }"
        />
      </div>
    </div>
    <div class="winx-view__nav winx-menu"><PageNavigation /></div>
  </div>
</template>
