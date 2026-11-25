<!-- Projects: a card per project with open tasks (a Done one too), a stage's name over them -->
<script setup>
import { computed, inject } from "vue";
import UiEmpty from "#/shared/ui/UiEmpty/index.vue";
import GroupCard from "./GroupCard.vue";
import TaskCard from "../TaskCard/index.vue";
import { T } from "#/entities/task/index.js";
import { calendarProjects } from "../../model/panelGroup.js";

const EMPTY_PROJECTS = "Projects are kept in projects.json";
const view = inject("calendar");

// the store's version keeps the computed tracked while there are no projects yet
const projects = computed(() => calendarProjects.value.map(p => ({
  ...p,
  stages: p.stages.map(s => ({
    name: s.name,
    cards: s.entries.map(e => ({
      task: view.info(e.t), meta: T(e.t).date ? `📅 ${T(e.t).date}` : "",
    })),
  })),
})));
</script>

<template>
  <UiEmpty v-if="!projects.length" :text="EMPTY_PROJECTS" />
  <GroupCard v-for="p in projects" :key="p.key" :title="p.title">
    <template v-for="(s, i) in p.stages" :key="`${i} ${s.name}`">
      <div class="ui-cal__stage">{{ s.name }}</div>
      <TaskCard
        v-for="c in s.cards"
        :key="c.task.key"
        :task="c.task"
        :meta="c.meta"
      />
    </template>
  </GroupCard>
</template>
