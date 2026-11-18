<!-- a task's hover buttons: ⏭ (a dated 🔁 one), ✏️ (the task window, then the Tasks dialog), 🗑
     (click twice: the first arms it for 3 s); @gone when the task leaves (skipped, deleted) so
     its row goes at once -->
<script setup>
import { computed, inject, ref } from "vue";
import UiButton from "#/components/uikit/UiButton/index.vue";

const props = defineProps({
  task: { type: Object, required: true },
  editTitle: {
    type: String, default: "edit: difficulty, area, time, sticker, then text and dates",
  },
});
const emit = defineEmits(["gone"]);
const view = inject("calendar");
const armed = ref(false), disarmed = ref(false);
const del = computed(() => armed.value
  ? { text: "✓?", title: "Click again to delete" }
  : { text: "🗑", title: disarmed.value ? "Delete task" : "delete task" });
const edit = () => {
  const t = view.task(props.task.key);

  if (t) view.actions.edit(t);
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
  if (!armed.value) {
    armed.value = true;
    window.setTimeout(() => { armed.value = false; disarmed.value = true; }, 3000);
    return;
  }

  const t = view.task(props.task.key);

  if (!t) return;
  emit("gone");
  await view.actions.remove(t);
}
</script>

<template>
  <UiButton
    v-if="task.canSkip"
    class="ui-task__btns-skip"
    title="skip this time"
    @click="skip"
  >⏭</UiButton>
  <UiButton
    v-if="task.canUnplan"
    class="ui-task__mobile ui-task__btns-unplan"
    title="remove date"
    @click="unplan"
  >↩</UiButton>
  <UiButton class="ui-task__btns-edit" :title="editTitle" @click="edit">
    <span class="ui-pencil">✏️</span>
  </UiButton>
  <UiButton
    :title="del.title"
    :class="['ui-task__btns-del', { 'ui-task__btns-del--armed': armed }]"
    @click="remove"
  >{{ del.text }}</UiButton>
</template>
