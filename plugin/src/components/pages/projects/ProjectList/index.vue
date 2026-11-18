<!-- The projects' list (block ui-projects): the title, ✦ New project, a tab per status with
     its count, then a card per project in file order: its cover, name, status, description,
     progress (none without tasks) and next task (the first open one of the first stage not
     complete), its box ticks it; a click elsewhere on the card opens the project -->
<script setup>
import { computed, inject } from "vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiCard from "#/components/uikit/UiCard/index.vue";
import UiCheckbox from "#/components/uikit/UiCheckbox/index.vue";
import UiProgress from "#/components/uikit/UiProgress/index.vue";
import UiEmpty from "#/components/uikit/UiEmpty/index.vue";
import UiTabs from "#/components/uikit/UiTabs/index.vue";
import { app } from "#/helpers/app.js";
import { tasksApi } from "#/helpers/plugins.js";
import { askNewProject } from "#/controllers/projects.js";
import { tickTask } from "#/controllers/tasks.js";
import { T } from "#/models/calendarData.js";
import { stageTasks, taskStore } from "#/store/tasks.js";
import { FILTERS } from "#/store/projects.js";
import { coverUrl } from "../cover.js";
import ProjectStatus from "../ProjectStatus/index.vue";

const projects = inject("projects");
const state = projects.state;
const label = s => `${s[0].toUpperCase()}${s.slice(1)}`;

// every project as its card shows it (read again when the tasks or projects change)
const all = computed(() => {
  void projects.version.value;
  return [...taskStore.projects].map(([key, p]) => {
    const entries = (p.stages ?? []).flatMap(stageTasks);
    const next = entries.find(e => !e.done);

    return {
      key, name: p.name, status: p.status, description: p.description, cover: coverUrl(p, app),
      done: entries.filter(e => e.done).length, total: entries.length,
      next: next && { t: next.t, text: T(next.t).text },
    };
  });
});
const shown = computed(() =>
  all.value.filter(p => state.filter === "all" || p.status === state.filter));
const tabs = computed(() => FILTERS.map(f => ({
  key: f,
  text: `${label(f)} · ${
    f === "all" ? all.value.length : all.value.filter(p => p.status === f).length}`,
})));
const canTick = computed(() => { void projects.version.value; return !!tasksApi(); });
</script>

<template>
  <div class="ui-projects">
    <div class="ui-projects__header ui-row ui-between ui-wrap ui-gap-m">
      <div class="ui-row ui-gap-m">
        <h1 class="ui-projects__title">Projects</h1>
        <UiButton kind="chip" @click="askNewProject(app)">✦ New project</UiButton>
      </div>
      <UiTabs v-model="state.filter" :tabs="tabs" on-background />
    </div>
    <UiEmpty v-if="!all.length" on-background text="No projects yet" />
    <UiEmpty
      v-else-if="!shown.length"
      on-background
      :text="`No ${label(state.filter).toLowerCase()} projects`"
    />
    <div class="ui-projects__grid">
      <UiCard
        v-for="p in shown"
        :key="p.key"
        :wings="false"
        class="ui-projects__card"
        :title="p.name"
        :cover="p.cover"
        placeholder="project"
        @click="projects.open(p.key, $event)"
      >
        <template #button>
          <ProjectStatus :status="p.status" />
        </template>
        <div v-if="p.description" class="ui-projects__description">{{ p.description }}</div>
        <UiProgress v-if="p.total" :value="p.done" :max="p.total" />
        <div v-if="p.next" class="ui-projects__next ui-row ui-gap-s" @click.stop>
          <UiCheckbox :static="!canTick" @tick="tickTask(p.next.t)" />
          <span class="ui-projects__next-text">{{ p.next.text }}</span>
        </div>
      </UiCard>
    </div>
  </div>
</template>
