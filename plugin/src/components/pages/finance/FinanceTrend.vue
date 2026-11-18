<!-- spending by month: a column per month, the shown one --current -->
<script setup>
defineProps({ trend: { type: Array, required: true } });
</script>

<template>
  <div class="ui-fin__section">Spending by month</div>
  <div class="ui-fin__trend">
    <div
      v-for="b in trend"
      :key="b.month"
      class="ui-fin__bar ui-grow"
      :class="{ 'ui-fin__bar--current': b.current }"
    >
      <div class="ui-fin__col" :style="{ height: `${b.height}%` }" :aria-label="b.sum" />
      <small class="ui-fin__bar-label">{{ b.label }}</small>
    </div>
  </div>
</template>
