<!-- a screen that couldn't draw: "⚠ couldn't draw: <why>" and retry (the parent's @retry loads
     again) -->
<script setup>
import UiEmpty from "./UiEmpty/index.vue";
import UiButton from "./UiButton/index.vue";

defineProps({ text: { type: String, required: true } });
defineEmits(["retry"]);
</script>

<template>
  <UiEmpty :text="`couldn't draw: ${text}`" mod="error" icon="⚠">
    <UiButton kind="chip" class="winx-empty__retry" @click="$emit('retry')">retry</UiButton>
  </UiEmpty>
</template>
