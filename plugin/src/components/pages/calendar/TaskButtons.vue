<!-- a task's hover buttons: ⏭ (a dated 🔁 one), ✏️ (the task window, then the Tasks dialog), 🗑
     (UiDeleteButton: click twice, the first arms it for 3 s; the phone: a hold); @gone when the
     task leaves (skipped, deleted) so its row goes at once -->
<script setup>
import { vHoldAction } from "#/composables/holdAction.js";
import { inject } from "vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiDeleteButton from "#/components/uikit/UiDeleteButton/index.vue";
import { editTask } from "#/components/windows/tasks/TaskWindow/open.js";

const props = defineProps({
  task: { type: Object, required: true },
  editTitle: {
    type: String, default: "edit: difficulty, area, time, sticker, then text and dates",
  },
});
const emit = defineEmits(["gone"]);
const view = inject("calendar");
const edit = () => {
  const t = view.task(props.task.key);

  if (t) return editTask(t);
};

const skip = () => {
  const t = view.task(props.task.key);

  if (!t) return;
  emit("gone");
  view.actions.skip(t);
};

const unplan = () => {
  const t = view.task(props.task.key);

  if (!t) return;
  emit("gone");
  view.actions.unplan(t);
};

async function remove() {
  const t = view.task(props.task.key);

  if (!t) return;
  emit("gone");
  await view.actions.remove(t);
}
</script>

<template>
  <UiButton
    v-if="task.canSkip"
    v-hold-action="skip"
    class="ui-task__btns-skip"
    title="skip this time"
    @click="skip"
  >⏭</UiButton>
  <UiButton
    v-if="task.canUnplan"
    v-hold-action="unplan"
    class="ui-task__mobile ui-task__btns-unplan"
    title="remove date"
    @click="unplan"
  >↩</UiButton>
  <UiButton class="ui-task__btns-edit" :title="editTitle" @click="edit">
    <span class="ui-pencil">✏️</span>
  </UiButton>
  <UiDeleteButton
    v-hold-action="remove"
    title="delete task"
    class="ui-task__btns-del"
    @delete="remove"
  />
</template>
