<!-- a card in the bottom panel: its text, a meta line (the meta slot, else `meta`), and the hover
     buttons: the extra slot first, then ⏭ ✏️ 🗑 — or ✏️ 🗑 for a pool item. Dragged onto a day
     (drag.js); a left swipe reveals the actions -->
<script setup>
import { vHoldAction } from "#/shared/lib/holdAction.js";
import { computed, inject, ref } from "vue";
import UiButton from "#/shared/ui/UiButton/index.vue";
import TaskText from "#/components/pages/calendar/TaskText.vue";
import TaskButtons from "#/components/pages/calendar/TaskButtons.vue";
import { useDragSource } from "#/composables/drag.js";
import { useSwipe } from "#/shared/lib/swipe.js";

const POOL_EDIT = "edit pool task";
const props = defineProps({
  task: { type: Object, required: true },
  meta: { type: String, default: "" },
  paused: { type: Boolean, default: false },   // Regulars: a paused 🔁 task, faded
});
const view = inject("calendar");
const gone = ref(false), picker = ref(null);
const added = ref(false), adding = ref(false);
const editTitle = computed(() => props.task.pool ? POOL_EDIT : undefined);
const pickDate = () => picker.value.showPicker();
const key = () => props.task.key;
const drag = useDragSource(view, key);

async function addOn(t, day) {
  if (adding.value) return;
  adding.value = true;
  try {
    added.value = !!await view.actions.fromPool(t, day, false);
  } finally {
    adding.value = false;
  }
}

function pickedDate(e) {
  const day = e.target.value, task = view.task(key());

  e.target.value = "";
  if (day && task) {
    swipe.kind = null;
    return addOn(task, day);
  }
}

const { swipe, ...touch } = useSwipe(view, key, t => {
  if (t.pool) return addOn(t, view.ctx.today);
  if (!view.ctx.TASKS) return;
  gone.value = true;
  view.actions.tick(t);
}, () => props.task.pool || !!view.ctx.TASKS);   // a tick needs the Tasks plugin
</script>

<template>
  <div
    v-if="!gone"
    :class="['ui-task-card', { 'ui-task-card--paused': paused, 'ui-task-card--added': added }]"
    :style="{
      '--area': task.color ?? undefined,
    }"
    :data-area="task.area ?? undefined"
    :data-swipe="swipe.kind"
    :data-swipeable="task.pool || !!view.ctx.TASKS || null"
    :draggable="!swipe.kind"
    @animationend.self="added = false"
    @dragstart="drag.start"
    @dragend="drag.end"
    @touchstart.passive="touch.start"
    @touchmove.passive="touch.move"
    @touchend="touch.end"
    @touchcancel="touch.cancel"
  >
    <div class="ui-task-card__text ui-task__content">
      <slot name="text"><TaskText :task="task" /></slot>
    </div>
    <div class="ui-task-card__meta ui-task__content"><slot name="meta">{{ meta }}</slot></div>
    <div class="ui-task__btns ui-task__actions">
      <UiButton
        v-if="task.pool || view.ctx.TASKS"
        v-hold-action="touch.run"
        :class="['ui-task__primary', { 'ui-task__mobile': !task.pool }]"
        :title="task.pool ? 'add to today' : 'complete task'"
        @click="touch.run"
      >{{ task.pool ? '+📅' : '✓' }}</UiButton>
      <template v-if="task.pool">
        <UiButton
          v-hold-action.release="pickDate"
          title="Pick a date…"
          @click="pickDate"
        >📅…</UiButton>
        <input
          ref="picker"
          type="date"
          class="ui-task-card__date"
          tabindex="-1"
          aria-hidden="true"
          @change="pickedDate"
        >
      </template>
      <slot name="extra" />
      <TaskButtons :task="task" :edit-title="editTitle" @gone="gone = true" />
    </div>
  </div>
</template>
