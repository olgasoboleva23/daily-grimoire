<!-- XP Today: the day's XP and aura, ↑/↓ against the 7-day average, the month as a heatmap -->
<script setup>
defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="ui-xp">
    <div class="ui-xp__header ui-flex ui-between">
      <div class="ui-xp__aura">
        <span class="ui-xp__icon" aria-hidden="true">🔮</span>
        {{ state.data.aura }} • {{ state.data.todayXP }} XP
      </div>
      <div>{{ state.data.trend }} 7d</div>
    </div>
    <div class="ui-xp__grid">
      <div
        v-for="(v, i) in state.data.vals"
        :key="i"
        :class="`ui-xp__cell ui-xp__cell--v${v}`"
      />
    </div>
    <div class="ui-xp__legend">
      <div
        v-for="l in state.data.legend"
        :key="l.cls"
        class="ui-xp__legend-item"
        :data-tip="l.name"
      >
        <span :class="`ui-xp__swatch ui-xp__swatch--${l.cls}`" />{{ l.max }}
      </div>
    </div>
  </div>
</template>
