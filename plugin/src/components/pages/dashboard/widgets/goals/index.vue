<!-- Goals: per goal "X of Y this week", Mon–Sun dots (done, missed, planned or none; the page's day
     ringed), the minimum version and how often it was done -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";
import UiMissing from "#/components/uikit/UiMissing.vue";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <UiMissing v-if="state.data.missing" :path="state.data.path" />
  <div v-else class="ui-goals ui-col ui-gap-l">
    <div
      v-for="g in state.data.goals"
      :key="g.name"
      v-tip="g.plan"
      class="ui-goal"
    >
      <div class="ui-goal__head ui-flex ui-between ui-gap-m">
        <span class="ui-goal__name">{{ g.name }}</span>
        <span class="ui-goal__count">{{ g.count }} this week</span>
      </div>
      <div class="ui-goal__dots ui-flex ui-gap-s">
        <span
          v-for="d in g.dots"
          :key="d.day"
          v-tip="d.day"
          :class="[
            'ui-goal__dot',
            `ui-goal__dot--${d.status}`,
            { 'ui-goal__dot--sel': d.sel },
          ]"
        />
      </div>
      <div v-if="g.min" class="ui-goal__min">{{ g.min }}</div>
    </div>
  </div>
</template>
