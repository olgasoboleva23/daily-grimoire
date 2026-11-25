<!-- a task's difficulty stars (in the area's colour), its text, its sticker (withIcon: the area's
     icon in front) -->
<script setup>
import { vTip } from "#/shared/ui/tooltip.js";
import { daytimeMark } from "../model/daytime.js";
import { computed } from "vue";

const props = defineProps({
  task: { type: Object, required: true },
  withIcon: { type: Boolean, default: false },
});
const text = computed(() =>
  daytimeMark(props.task.daytime) + (props.withIcon ? props.task.label : props.task.text));
</script>

<template>
  <span
    v-if="task.difficulty && task.difficulty !== 'none'"
    v-tip="'difficulty'"
    class="tag"
    :data-difficulty="task.difficulty"
  />
  {{ text }}
  <img
    v-if="task.sticker"
    class="ui-cal__sticker"
    :src="task.sticker"
    alt=""
  >
</template>
