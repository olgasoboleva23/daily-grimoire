<!-- the full ring: ↺ ▶ ⏭ around the time (a click on it folds back to the small row), the mode and
     session, the stars (not for a meditation), 🧘 / 🍅 (the mode), the lengths and ⚙ -->
<script setup>
import { ICON } from "#/controllers/widgets/pomodoro.js";
import PomodoroStars from "./PomodoroStars.vue";
import { vTip } from "#/shared/ui/tooltip.js";

defineProps({ shown: { type: Object, required: true } });
defineEmits(["toggle", "play", "reset", "skip", "gear", "mode"]);
</script>

<template>
  <div class="ui-pomodoro__body">
    <!-- eslint-disable vue/no-v-html -- the icons are our own constant SVGs (pomodoro.js ICON) -->
    <div class="ui-pomodoro__ring" :style="{ '--p': shown.p }">
      <div class="ui-pomodoro__wing ui-pomodoro__wing--left" />
      <div class="ui-pomodoro__wing ui-pomodoro__wing--right" />
      <div class="ui-pomodoro__top-star" v-html="ICON.star" />
      <div class="ui-pomodoro__time" @click="$emit('toggle')">{{ shown.time }}</div>
      <div class="ui-pomodoro__controls ui-center ui-gap-xl">
        <button
          class="ui-pomodoro__btn ui-pomodoro__btn--reset"
          @click="$emit('reset')"
          v-html="ICON.reset"
        />
        <button
          class="ui-pomodoro__btn ui-pomodoro__btn--play"
          @click="$emit('play')"
          v-html="shown.running ? ICON.pause : ICON.play"
        />
        <button
          class="ui-pomodoro__btn ui-pomodoro__btn--skip"
          @click="$emit('skip')"
          v-html="ICON.skip"
        />
      </div>
    </div>
    <div class="ui-pomodoro__mode">
      <span class="ui-pomodoro__mode-text">{{ shown.mode }}</span>
      <span class="ui-pomodoro__session">{{ shown.session }}</span>
    </div>
    <PomodoroStars v-if="!shown.meditation" :filled="shown.filled" :sets="shown.sets" />
    <div class="ui-pomodoro__bottom ui-center ui-gap-m">
      <button
        v-tip="shown.meditation ? 'pomodoro' : 'meditation'"
        class="ui-pomodoro__gear ui-pomodoro__mode-switch"
        @click="$emit('mode')"
      >{{ shown.meditation ? "🍅" : "🧘" }}</button>
      <span class="ui-pomodoro__settings-info">{{ shown.lengths }}</span>
      <button class="ui-pomodoro__gear" @click="$emit('gear')" v-html="ICON.gear" />
    </div>
  </div>
</template>
