<!-- "✦ Open": the day's note (made if it's missing) -->
<script setup>
import UiButton from "#/components/uikit/UiButton/index.vue";
import { openDaily } from "#/controllers/widgets/dailyNote.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <UiButton
    v-if="state.data.date"
    kind="pill"
    title="open the day's note"
    @click="openDaily(state.data.date)"
  >
    {{ state.data.text }}
  </UiButton>
</template>
