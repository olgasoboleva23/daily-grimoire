<!-- the month on the phone: a cell per day with a dot per task, and the picked day as a day card
     under it; @pick(event, day): a click on a cell -->
<script setup>
import CalendarDay from "#/components/pages/calendar/CalendarDay.vue";
import DayZones from "#/components/pages/calendar/DayZones.vue";

defineProps({
  weekdays: { type: Array, required: true },
  cells: { type: Array, required: true },
  picked: { type: String, required: true },
});
defineEmits(["pick"]);
</script>

<template>
  <div class="ui-cal__phone-month" data-part="grid">
    <div class="ui-cal__month">
      <div v-for="w in weekdays" :key="w" class="ui-cal__weekday ui-text-center">{{ w }}</div>
      <div
        v-for="c in cells"
        :key="c.d"
        :class="['ui-cal__cell', {
          'ui-cal__cell--today': c.today,
          'ui-cal__cell--picked': c.picked,
          'ui-cal__cell--outside': c.outside,
        }]"
        :data-day="c.d"
        @click="$emit('pick', $event, c.d)"
      >
        <div class="ui-cal__num">{{ c.num }}</div>
        <div class="ui-cal__dots">
          <i
            v-for="dot in c.dots"
            :key="dot.i"
            :class="['ui-cal__dot', `ui-cal__dot--${dot.kind}`]"
          />
          <span v-if="c.more" class="ui-cal__dots-more">{{ c.more }}</span>
        </div>
        <DayZones :day="c.d" />
      </div>
    </div>
    <CalendarDay :day="picked" format="dddd D MMMM" />
  </div>
</template>
