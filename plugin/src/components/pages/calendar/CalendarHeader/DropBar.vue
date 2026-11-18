<!-- while dragging, a bar of 7 days sticks to the top: the shown week, or in the month view the
     next 7 days; a chip is a drop zone (drag.js) -->
<script setup>
import { computed, inject } from "vue";
import { addDays } from "#/helpers/dates.js";
import { useDropZone } from "#/composables/drag.js";

const view = inject("calendar");

const chips = computed(() => {
  const { view: v, days, today } = view.ctx;
  const list = v === "week" ? days : Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return list.map(d => ({
    d, label: window.moment(d).format("ddd D"), today: d === today,
    zone: useDropZone(view, () => d),
  }));
});
</script>

<template>
  <div class="ui-cal__dropbar" data-part="header">
    <div class="ui-cal__dropbar-in">
      <div
        v-for="c in chips"
        :key="c.d"
        :class="['ui-cal__chip', 'ui-text-center',
                 { 'ui-cal__chip--today': c.today, 'ui-cal__chip--over': c.zone.over }]"
        @dragover="c.zone.enter"
        @dragleave="c.zone.leave"
        @drop="c.zone.drop"
      >{{ c.label }}</div>
    </div>
  </div>
</template>
