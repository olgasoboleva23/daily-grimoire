<!-- Life Areas: the radar of XP per area, the caption under it -->
<script setup>
import UiChart from "#/components/uikit/UiChart/index.vue";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <UiChart :config="state.data.chart" />
  <div class="winx-areas__caption winx-text-center">last 4 weeks</div>
</template>
