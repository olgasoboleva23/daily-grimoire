<!-- a day's drop zones while dragging (drag.js): ✓ (done that day: today and before) and 📅
     (planned for it) -->
<script setup>
import { computed, inject } from "vue";
import { useDropZone } from "#/composables/drag.js";

const props = defineProps({ day: { type: String, required: true } });
const view = inject("calendar");
const label = computed(() => `📅 ${window.moment(props.day).format("D MMM")}`);
const past = computed(() => props.day <= view.ctx.today);
const done = useDropZone(view, () => props.day, true);
const plan = useDropZone(view, () => props.day);
</script>

<template>
  <div class="ui-cal__zones">
    <div
      v-if="past"
      :class="['ui-cal__zone ui-cal__zone--done ui-grow ui-center',
               { 'ui-cal__zone--over': done.over }]"
      @dragover="done.enter"
      @dragleave="done.leave"
      @drop="done.drop"
    >✓</div>
    <div
      :class="['ui-cal__zone ui-cal__zone--plan ui-grow ui-center',
               { 'ui-cal__zone--over': plan.over }]"
      @dragover="plan.enter"
      @dragleave="plan.leave"
      @drop="plan.drop"
    >{{ label }}</div>
  </div>
</template>
