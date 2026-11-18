<!-- Tabs (block ui-tabs): a word per tab ({ key, text, title? }), the picked one underlined in
     gold; v-model is the picked tab's key; onBackground: light text on the page background;
     scroll: one row, scrolls sideways when the tabs do not fit (the courses); a tab's `title`:
     its tip -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";

defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, default: null },
  onBackground: { type: Boolean, default: false },
  scroll: { type: Boolean, default: false },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <div
    class="ui-tabs"
    :class="{ 'ui-tabs--on-background': onBackground, 'ui-tabs--scroll': scroll }"
  >
    <button
      v-for="t in tabs"
      :key="t.key"
      v-tip="{ text: t.title }"
      :class="['ui-tabs__tab', { 'ui-tabs__tab--on': t.key === modelValue }]"
      :data-tab="t.key"
      @click="$emit('update:modelValue', t.key)"
    >{{ t.text }}</button>
  </div>
</template>
