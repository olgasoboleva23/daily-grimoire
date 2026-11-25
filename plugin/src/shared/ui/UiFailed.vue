<!-- a screen that couldn't draw: "⚠ couldn't draw: <why>" and retry (the parent's @retry loads
     again) -->
<script setup>
import UiEmpty from "#/shared/ui/UiEmpty/index.vue";
import UiButton from "#/shared/ui/UiButton/index.vue";

defineProps({ text: { type: String, required: true } });
defineEmits(["retry"]);
</script>

<template>
  <UiEmpty :text="`couldn't draw: ${text}`" mod="error" icon="⚠">
    <UiButton kind="chip" class="ui-empty__retry" @click="$emit('retry')">retry</UiButton>
  </UiEmpty>
</template>
