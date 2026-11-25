<!-- the month's spent, received and net -->
<script setup>
defineProps({ totals: { type: Array, required: true } });
</script>

<template>
  <div class="ui-fin__totals ui-flex ui-gap-l">
    <div
      v-for="t in totals"
      :key="t.label"
      class="ui-fin__total ui-grow ui-text-center"
      :class="`ui-fin__total--${t.sign}`"
    >
      <span class="ui-fin__total-label">{{ t.label }}</span>
      <b class="ui-fin__total-value">{{ t.value }}</b>
    </div>
  </div>
</template>
