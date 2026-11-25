<!-- a task on a stage: its box (ticks it through the Tasks plugin; a done one: ✅, static), the
     calendar's TaskText, and on an open one ✏️ (the task window) and 📅 (a menu: today, tomorrow,
     a date from the row's hidden date field) -->
<script setup>
import { computed, ref } from "vue";
import { Menu } from "obsidian";
import UiButton from "#/shared/ui/UiButton/index.vue";
import UiCheckbox from "#/shared/ui/UiCheckbox/index.vue";
import TaskText from "#/components/pages/calendar/TaskText.vue";
import { app, tasksApi } from "#/shared/host/index.js";
import config from "#/shared/config/index.js";
import { addDays, todayYmd } from "#/shared/lib/dates.js";
import { editTask } from "#/components/windows/tasks/TaskWindow/open.js";
import { tickTask } from "#/controllers/tasks.js";
import { setDue, taskInfo } from "#/entities/task/index.js";

const props = defineProps({
  entry: { type: Object, required: true },   // stageTasks': { id, t, done }
});
const info = computed(() => taskInfo(props.entry.t, config, app));
const canTick = computed(() => !!tasksApi());
const picker = ref(null);

function dateMenu(e) {
  const t = props.entry.t, today = todayYmd();

  new Menu()
    .addItem(i => i.setTitle("Today").onClick(() => setDue(t, today)))
    .addItem(i => i.setTitle("Tomorrow").onClick(() => setDue(t, addDays(today, 1))))
    .addItem(i => i.setTitle("Pick a date…").onClick(() => picker.value.showPicker()))
    .showAtMouseEvent(e);
}
</script>

<template>
  <div
    class="ui-project__task ui-row ui-gap-s"
    :style="{ '--area': info.color ?? undefined }"
  >
    <UiCheckbox v-if="entry.done" mark="✅" static />
    <UiCheckbox v-else :static="!canTick" @tick="tickTask(entry.t)" />
    <span class="ui-project__task-text ui-grow"><TaskText :task="info" /></span>
    <template v-if="!entry.done">
      <UiButton title="edit" @click="editTask(entry.t)">
        <span class="ui-pencil">✏️</span>
      </UiButton>
      <UiButton title="to the calendar" @click="dateMenu">📅</UiButton>
      <input
        ref="picker"
        type="date"
        class="ui-project__date"
        tabindex="-1"
        aria-hidden="true"
        @change="e => e.target.value && setDue(entry.t, e.target.value)"
      >
    </template>
  </div>
</template>
