<!-- Level and XP: the level, total XP, progress to the next level; HP and MP bars, their reasons in
     the tooltip (v-tip) -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="ui-level ui-row ui-gap-3xl">
    <div class="ui-level__icon ui-center" />
    <div class="ui-level__body ui-grow ui-col ui-gap-xs">
      <div class="ui-level__text">Level: {{ state.data.level }} |
        Total XP: {{ state.data.total }}</div>
      <div class="ui-level__text">Progress: {{ state.data.progress }}/{{ state.data.cost }}</div>
      <div class="ui-level__progress">
        <div class="ui-level__progress-fill" :style="`width:${state.data.fill}%`" />
      </div>
      <div class="ui-level__vitals">
        <div
          v-for="v in state.data.vitals"
          :key="v.name"
          v-tip="v.title"
          class="ui-level__vital ui-row ui-gap-s"
          :class="`ui-level__vital--${v.mod}`"
        >
          <b class="ui-level__vital-name">{{ v.name }}</b>
          <div class="ui-level__vital-bar ui-grow">
            <i class="ui-level__vital-fill" :style="`width: ${v.width}%`" />
          </div>
          <span class="ui-level__vital-value">{{ v.value }}/{{ v.max }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
