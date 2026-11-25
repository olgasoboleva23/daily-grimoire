<!-- the dashboard's Finance card: this month's spent and income on one line, the Finance page a tap
     away -->
<script setup>
import { inject } from "vue";
import { Keymap } from "obsidian";
import UiButton from "#/shared/ui/UiButton/index.vue";
import { openUi } from "#/shared/host/index.js";

const ui = inject("ui", null);
const open = e => ui ? ui.go("finance", {}, e)
  : openUi("finance", {}, Keymap.isModEvent(e));

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="ui-fin__month">
    <div v-if="!state.data.empty">{{ state.data.month }}: spent
      <b class="ui-fin__month-sum">{{ state.data.spent }}</b> · income
      <b class="ui-fin__month-sum">{{ state.data.income }}</b></div>
    <UiButton kind="text" @click="open">💰 open finance</UiButton>
  </div>
</template>
