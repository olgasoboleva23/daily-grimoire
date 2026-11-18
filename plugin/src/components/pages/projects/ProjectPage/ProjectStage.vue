<!-- a stage's card: its number (01, 02…), name, done/total, ✓ when complete (then it starts
     folded; the fold is this card's own, not saved), its task rows and + task (the New task
     window, then the id onto this stage) -->
<script setup>
import { computed, ref } from "vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiCard from "#/components/uikit/UiCard/index.vue";
import { addToStage } from "#/controllers/projects.js";
import ProjectTask from "./ProjectTask.vue";

const props = defineProps({
  project: { type: String, required: true },
  index: { type: Number, required: true },
  stage: { type: Object, required: true },   // { name, entries: stageTasks' }
});
const done = computed(() => props.stage.entries.filter(e => e.done).length);
const total = computed(() => props.stage.entries.length);
const complete = computed(() => total.value > 0 && done.value === total.value);
const folded = ref(complete.value);
</script>

<template>
  <UiCard
    :wings="false"
    :class="['ui-project__stage', { 'ui-project__stage--folded': folded }]"
  >
    <div class="ui-project__stage-head ui-row ui-gap-m">
      <span class="ui-project__stage-num">{{ String(index + 1).padStart(2, "0") }}</span>
      <span class="ui-project__stage-name ui-grow">{{ stage.name }}</span>
      <span class="ui-project__stage-count">{{ done }}/{{ total }}</span>
      <span v-if="complete" class="ui-project__stage-done">✓</span>
      <UiButton
        kind="text"
        class="ui-project__fold"
        :title="folded ? 'Show tasks' : 'Hide tasks'"
        @click="folded = !folded"
      >{{ folded ? "⌄" : "⌃" }}</UiButton>
    </div>
    <template v-if="!folded">
      <ProjectTask v-for="e in stage.entries" :key="e.id" :entry="e" />
      <UiButton
        kind="text"
        class="ui-project__add"
        @click="addToStage(project, index, stage.name)"
      >+ task</UiButton>
    </template>
  </UiCard>
</template>
