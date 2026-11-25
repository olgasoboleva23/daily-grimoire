<!-- the top row: the date field, ＋ task -->
<script setup>
import { computed, inject } from "vue";
import UiButton from "#/shared/ui/UiButton/index.vue";
import { goTo } from "#/pages/calendar/index.js";
import { app } from "#/shared/host/index.js";
import { APP_NAME } from "#/shared/config/index.js";

const view = inject("calendar");
const base = computed(() => view.ctx.base);

// emptied (the phone's "Reset"): today
const onDate = e => goTo(view.state, e.target.value || null, view.ctx);

const newTask = () => app.commands.executeCommandById("daily-grimoire:new-task");
</script>

<template>
  <div class="ui-cal__top ui-row ui-gap-s" data-part="header">
    <div class="ui-date"><input type="date" :value="base" @change="onDate"></div>
    <UiButton
      kind="chip"
      :title="`new task (${APP_NAME}: New task)`"
      @click="newTask"
    >＋ task</UiButton>
  </div>
</template>
