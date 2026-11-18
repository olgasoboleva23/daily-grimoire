<!-- the month on the desktop: weekday names, then a cell per day with its tasks;
     @pick(event, day): a click on a cell -->
<script setup>
import { inject } from "vue";
import DayFill from "#/components/pages/calendar/DayFill.vue";
import DayZones from "#/components/pages/calendar/DayZones.vue";

defineProps({ weekdays: { type: Array, required: true }, cells: { type: Array, required: true } });
defineEmits(["pick"]);
const view = inject("calendar");
</script>

<template>
  <div class="ui-cal__month" data-part="grid">
    <div v-for="w in weekdays" :key="w" class="ui-cal__weekday ui-text-center">{{ w }}</div>
    <div
      v-for="c in cells"
      :key="c.d"
      :class="['ui-cal__cell', {
        'ui-cal__cell--today': c.today,
        'ui-cal__cell--picked': c.picked,
        'ui-cal__cell--outside': c.outside,
        'ui-cal__cell--source': view.drag.day === c.d,
      }]"
      :data-day="c.d"
      @click="$emit('pick', $event, c.d)"
    >
      <div class="ui-cal__num">{{ c.num }}</div>
      <DayFill :day="c.d" compact />
      <DayZones :day="c.d" />
    </div>
  </div>
</template>
