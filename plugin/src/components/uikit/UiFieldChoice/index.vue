<!-- A window's choice of a few (block ui-field-choice, one per button): a button a choice
     ({ label, value, img? }), the chosen one lit (Obsidian's mod-cta), its label as its tip; `img`
     (a URL: a sticker) shows instead of the label. v-model: the chosen value. Its look:
     index.scss -->
<script setup>
defineProps({
  modelValue: { type: [String, Number, Boolean], default: null },
  choices: { type: Array, required: true },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <button
    v-for="(c, i) in choices"
    :key="i"
    class="ui-field-choice"
    :class="{ 'mod-cta': c.value === modelValue }"
    :title="c.label"
    @click="$emit('update:modelValue', c.value)"
  >
    <img v-if="c.img" class="ui-field-choice__img" :src="c.img">
    <template v-else>{{ c.label }}</template>
  </button>
</template>
