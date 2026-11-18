<!-- a card in the bottom panel: its text, a meta line (the meta slot, else `meta`), and the hover
     buttons: the extra slot first, then ⏭ ✏️ 🗑 — or ✏️ 🗑 for a pool item. Dragged onto a day
     (drag.js); a long left swipe (swipe.js) ticks it at once, or adds a pool copy to today -->
<script setup>
import { computed, inject, ref } from "vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import TaskText from "#/components/pages/calendar/TaskText.vue";
import TaskButtons from "#/components/pages/calendar/TaskButtons.vue";
import { useDragSource } from "#/composables/drag.js";
import { useSwipe } from "#/composables/swipe.js";

const POOL_EDIT = "edit: difficulty, area, time, sticker, then text";
const props = defineProps({
  task: { type: Object, required: true },
  meta: { type: String, default: "" },
  paused: { type: Boolean, default: false },   // Regulars: a paused 🔁 task, faded
});
const view = inject("calendar");
const gone = ref(false);
const editTitle = computed(() => props.task.pool ? POOL_EDIT : undefined);
const key = () => props.task.key;
const drag = useDragSource(view, key);
const { swipe, ...touch } = useSwipe(view, key, t => {
  if (t.pool) return view.actions.fromPool(t, view.ctx.today, false);
  if (!view.ctx.TASKS) return;
  gone.value = true;
  view.actions.tick(t);
}, () => props.task.pool || !!view.ctx.TASKS);   // a tick needs the Tasks plugin
</script>

<template>
  <div
    v-if="!gone"
    :class="['ui-task-card', { 'ui-task-card--paused': paused }]"
    :style="{
      '--area': task.color ?? undefined, '--ui-swipe-progress': swipe.progress,
    }"
    :data-area="task.area ?? undefined"
    :data-swipe="swipe.kind"
    :data-swipeable="task.pool || !!view.ctx.TASKS || null"
    draggable="true"
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
        :class="['ui-task__primary', { 'ui-task__mobile': !task.pool }]"
        :title="task.pool ? 'add to today' : 'complete task'"
        @click="touch.run"
      >{{ task.pool ? '+📅' : '✓' }}</UiButton>
      <slot name="extra" />
      <TaskButtons :task="task" :edit-title="editTitle" @gone="gone = true" />
    </div>
  </div>
</template>
