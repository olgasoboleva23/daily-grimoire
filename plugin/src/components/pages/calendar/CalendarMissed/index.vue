<!-- "Missed?": open tasks whose day has passed, only while today is on screen; a row's ✓ (done on
     its day, with Tasks) or ☀️ (moved to today) takes it off at once, the write follows. A row is
     dragged onto a day (drag.js); a swipe reveals the actions on the phone -->
<script setup>
import { vHoldAction } from "#/shared/lib/holdAction.js";
import { computed, inject, reactive, watch } from "vue";
import UiButton from "#/shared/ui/UiButton/index.vue";
import { TaskText, T } from "#/entities/task/index.js";
import TaskButtons from "#/components/pages/calendar/TaskButtons.vue";
import { dm } from "#/shared/lib/dates.js";
import { AudioEngine } from "#/shared/lib/sounds.js";
import { ASSETS, SOUNDS } from "#/shared/config/index.js";
import { useDragSource } from "#/composables/drag.js";
import { useSwipe } from "#/shared/lib/swipe.js";

const view = inject("calendar");
const ctx = computed(() => view.ctx);
const sounds = {
  done: new AudioEngine(`${SOUNDS}/snd_pickup_gem02.wav`),
  today: new AudioEngine(`${ASSETS}/star.wav`),
};
const gone = reactive(new Set());   // rows taken off until the new data comes
watch(ctx, () => gone.clear());
const rows = computed(() => {
  const { days, today, model: { missed }, TASKS } = ctx.value;

  if (!days.includes(today)) return [];
  return missed.map(t => {
    const task = view.info(t), day = T(t).date, key = () => task.key;
    const r = {
      t, task, day, shortDay: dm(day), repeats: T(t).isRecurring ? "🔁 " : "", done: !!TASKS,
      drag: useDragSource(view, key),
    };

    r.sw = useSwipe(view, key, () => doneOnItsDay(r), () => r.done);
    return r;
  }).filter(r => !gone.has(r.task.key));
});

function act(r, sound, write) {
  const t = view.task(r.task.key);

  if (!t) return;
  gone.add(r.task.key);
  sound.play({ gain: 0.25 });
  return write(t);
}

const doneOnItsDay = r => act(r, sounds.done, t => view.actions.doneOnItsDay(t));
const toToday = r => act(r, sounds.today, t => view.actions.toToday(t));
</script>

<template>
  <div v-if="rows.length" class="ui-missed" data-part="missed">
    <div class="ui-missed__head">Missed?</div>
    <div
      v-for="r in rows"
      :key="r.task.key"
      class="ui-missed__row ui-row ui-gap-s"
      :style="{
        '--area': r.task.color ?? undefined,
      }"
      :data-area="r.task.area ?? undefined"
      :data-swipe="r.sw.swipe.kind"
      :data-swipeable="r.done || null"
      :draggable="!r.sw.swipe.kind"
      @dragstart="r.drag.start"
      @dragend="r.drag.end"
      @touchstart.passive="r.sw.start"
      @touchmove.passive="r.sw.move"
      @touchend="r.sw.end"
      @touchcancel="r.sw.cancel"
    >
      <span class="ui-missed__text ui-grow ui-task__content">
        {{ r.repeats }}<TaskText :task="r.task" />
      </span>
      <em class="ui-missed__date ui-task__content">{{ r.shortDay }}</em>
      <div class="ui-task__actions">
        <div class="ui-task__btns">
          <TaskButtons :task="r.task" @gone="gone.add(r.task.key)" />
        </div>
        <UiButton
          v-if="r.done"
          v-hold-action="r.sw.run"
          class="ui-task__primary"
          :title="`done on ${r.day}`"
          tip="pink"
          @click="r.sw.run"
        >✓</UiButton>
        <UiButton
          v-hold-action="() => toToday(r)"
          class="ui-task__btns-today"
          title="move to today"
          tip="pink"
          @click="toToday(r)"
        >☀️</UiButton>
      </div>
    </div>
  </div>
</template>
