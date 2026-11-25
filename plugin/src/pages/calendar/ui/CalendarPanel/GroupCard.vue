<!-- a card of the panel: its title, then its tasks (the slot) -->
<script setup>
defineProps({ title: { type: String, required: true } });
</script>

<template>
  <div class="ui-cal__group-card">
    <div class="ui-cal__group">{{ title }}</div>
    <slot />
  </div>
</template>
