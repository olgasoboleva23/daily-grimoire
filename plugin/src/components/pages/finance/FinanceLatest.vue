<!-- the month's latest operations: date, category · description, sum -->
<script setup>
defineProps({ latest: { type: Array, required: true } });
</script>

<template>
  <div class="ui-fin__section">Recent transactions</div>
  <div class="ui-fin__list">
    <div v-for="r in latest" :key="r.key" class="ui-fin__item">
      <span class="ui-fin__item-date">{{ r.date }}</span>
      <span class="ui-fin__item-text">{{ r.text }}</span>
      <span class="ui-fin__item-sum">{{ r.sum }}</span>
    </div>
  </div>
</template>
