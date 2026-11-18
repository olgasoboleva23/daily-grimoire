<!-- a day as a column (the week) or a card (under the phone's month): its heading, its tasks, its
     drop zones; the day a task is dragged from shows as the source (drag.js) -->
<script setup>
import { computed, inject } from "vue";
import DayFill from "./DayFill.vue";
import DayZones from "./DayZones.vue";

const props = defineProps({
  day: { type: String, required: true },
  format: { type: String, required: true },
});
const view = inject("calendar");
const head = computed(() => window.moment(props.day).format(props.format));
const today = computed(() => props.day === view.ctx.today);
</script>

<template>
  <div
    :class="['ui-cal__day',
             { 'ui-cal__day--today': today, 'ui-cal__day--source': view.drag.day === day }]"
  >
    <div class="ui-cal__head ui-text-center">{{ head }}</div>
    <DayFill :day="day" />
    <DayZones :day="day" />
  </div>
</template>
