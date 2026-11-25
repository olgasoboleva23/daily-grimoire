<!-- the small row: a ring, the time, the mode and stars, ▶; a click on the ring or the time opens
     the full ring -->
<script setup>
import { ICON } from "./icon.js";
import PomodoroStars from "./PomodoroStars.vue";

defineProps({ shown: { type: Object, required: true } });
defineEmits(["toggle", "play"]);
</script>

<template>
  <div class="ui-pomodoro__mini">
    <!-- eslint-disable vue/no-v-html -- the icons are our own constant SVGs (icon.js) -->
    <div class="ui-pomodoro__mini-ring" :style="{ '--p': shown.p }" @click="$emit('toggle')" />
    <div class="ui-pomodoro__mini-info ui-grow" @click="$emit('toggle')">
      <div class="ui-pomodoro__mini-time">{{ shown.time }}</div>
      <PomodoroStars v-if="!shown.meditation" :filled="shown.filled" :sets="shown.sets">
        <span class="ui-pomodoro__mini-mode">{{ shown.mode }}</span>
      </PomodoroStars>
      <span v-else class="ui-pomodoro__mini-mode">{{ shown.mode }}</span>
    </div>
    <button
      class="ui-pomodoro__mini-play"
      @click="$emit('play')"
      v-html="shown.running ? ICON.pause : ICON.play"
    />
  </div>
</template>
