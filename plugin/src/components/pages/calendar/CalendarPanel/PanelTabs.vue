<!-- the panel's tabs, each with its count -->
<script setup>
import { computed, inject } from "vue";
import UiTabs from "#/components/uikit/UiTabs/index.vue";
import { openProjects } from "#/helpers/panelGroups.js";

const view = inject("calendar");
const state = view.state;

const tabs = computed(() => {
  const { backlog, regulars, pool, ahead } = view.ctx.model;

  return [
    ["nodate", `No date · ${backlog.length}`],
    ["ahead", `Ahead · ${ahead.flatMap(g => g.items).length}`],
    ["regulars", `Regulars · ${regulars.length}`],
    ["pool", `Pool · ${pool.length}`],
    ["projects", `Projects · ${openProjects().reduce((n, p) => n + p.open, 0)}`],
  ].map(([key, text]) => ({ key, text }));
});
</script>

<template>
  <UiTabs v-model="state.tab" :tabs="tabs" />
</template>
