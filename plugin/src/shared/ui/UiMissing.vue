<!-- a widget whose note isn't there: "✦ Create 00 System/Data/Goals.md" -->
<script setup>
import UiEmpty from "#/shared/ui/UiEmpty/index.vue";

defineProps({ path: { type: String, required: true } });
</script>

<template>
  <UiEmpty :text="`Create ${path}`" />
</template>
