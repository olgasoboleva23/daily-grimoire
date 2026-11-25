<!-- Life Areas: the radar of XP per area, the caption under it -->
<script setup>
import UiChart from "#/shared/ui/UiChart/index.vue";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <UiChart :config="state.data.chart" />
  <div class="ui-areas__caption ui-text-center">last 4 weeks</div>
</template>
