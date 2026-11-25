<!-- Delete stage? (opened by a stage's 🗑️, ProjectPage/ProjectStage.vue): the stage's name and
     a checkbox to delete its tasks too (only open undated copies no other stage holds). Resolves
     true once deleteStage wrote, against `stage`: the stage as it was on disk when it opened -->
<script setup>
import { ref } from "vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";
import { useWrite } from "#/shared/ui/Window/index.ts";
import { deleteStage } from "../../operation/deleteStage.js";

const props = defineProps({
  project: { type: String, required: true },
  index: { type: Number, required: true },
  stage: { type: Object, required: true },
});
const emit = defineEmits(["done"]);

const deleteTasks = ref(false);
const { busy, run } = useWrite(emit);

const remove = () => run(() =>
  deleteStage(props.project, props.index, props.stage, { deleteTasks: deleteTasks.value }));
</script>

<template>
  <UiWindow
    title="Delete stage?"
    submit="Delete"
    :busy="busy"
    @submit="remove"
  >
    <UiField name="Stage" :text="stage.name" />
    <UiField
      name="Также удалить задачи этапа"
      description="Только открытые копии без даты. Задачи других этапов сохранятся."
      toggle
    >
      <input v-model="deleteTasks" type="checkbox" aria-label="Также удалить задачи этапа">
    </UiField>
  </UiWindow>
</template>
