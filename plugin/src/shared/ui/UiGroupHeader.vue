<!-- a group's heading (block ui-group-header): its label and, when given, how many it has -->
<script setup>
defineProps({ label: { type: String, required: true }, count: { type: Number, default: null } });
</script>

<template>
  <div class="ui-group-header">
    <span>{{ label }}</span>
    <span v-if="count !== null" class="ui-group-header__count">{{ count }}</span>
  </div>
</template>
