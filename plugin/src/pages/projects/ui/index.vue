<script setup>
import { projectStore } from "#/entities/project/index.js";
import { computed, inject, provide } from "vue";
import ProjectList from "./ProjectList/index.vue";
import ProjectPage from "./ProjectPage/index.vue";

const props = defineProps({ state: { type: Object, required: true } });
const ui = inject("ui");
const view = { state: props.state, version: projectStore.version,
  open: (key, e) => ui.go("projects", { open: key }, e) };
provide("projects", view);
const open = computed(() => {
  void view.version.value;
  return projectStore.projects.has(view.state.open);
});
</script>

<template>
  <div class="ui-view__page markdown-preview-view markdown-rendered dashboard">
    <ProjectPage v-if="open" />
    <ProjectList v-else />
  </div>
</template>
