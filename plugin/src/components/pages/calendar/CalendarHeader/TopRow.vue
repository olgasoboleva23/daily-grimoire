<!-- the top row: the date field, sounds on/off, ＋ task -->
<script setup>
import { computed, inject, ref } from "vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import { goTo } from "#/store/calendar.js";
import { isMuted, toggleMute } from "#/helpers/sounds.js";
import { app } from "#/helpers/app.js";
import { APP_NAME } from "#/helpers/name.js";

const view = inject("calendar");
const base = computed(() => view.ctx.base);
const muted = ref(isMuted());

// emptied (the phone's "Reset"): today
const onDate = e => goTo(view.state, e.target.value || null, view.ctx);
const mute = () => { toggleMute(); muted.value = isMuted(); };

const newTask = () => app.commands.executeCommandById("daily-grimoire:new-task");
</script>

<template>
  <div class="ui-cal__top ui-row ui-gap-s" data-part="header">
    <div class="mb-input-type-date"><input type="date" :value="base" @change="onDate"></div>
    <button
      class="ui-cal__mute"
      title="sounds on/off"
      aria-label="sounds on/off"
      @click="mute"
    >{{ muted ? "🔇" : "🔊" }}</button>
    <UiButton
      kind="chip"
      :title="`new task (${APP_NAME}: New task)`"
      @click="newTask"
    >＋ task</UiButton>
  </div>
</template>
