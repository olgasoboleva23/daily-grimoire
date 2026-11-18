<!-- the month's categories, each a bar against its budget (over it: --over) or against the biggest
-->
<script setup>
defineProps({ categories: { type: Array, required: true } });
</script>

<template>
  <div class="ui-fin__section">Categories</div>
  <div class="ui-fin__rows ui-col ui-gap-s">
    <div v-for="c in categories" :key="c.name" class="ui-fin__row">
      <span>{{ c.name }}</span>
      <span :class="['ui-fin__amt', { 'ui-fin__amt--over': c.over }]">{{ c.amount }}</span>
      <div class="ui-fin__track">
        <div class="ui-fin__fill" :style="{ width: `${c.width}%`, background: c.fill }" />
      </div>
    </div>
  </div>
</template>
