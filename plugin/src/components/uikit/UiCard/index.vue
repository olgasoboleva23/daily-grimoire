<!-- a dashboard card: the markup Obsidian draws for a "> [!card] Title" callout (as uikit/card.js),
     with a slot; the button slot: one next to the title -->
<script setup>
defineProps({
  title: { type: String, default: "" },
  meta: { type: Array, default: () => [] },
  // the widget's own class on the body (the shop's ui-shop)
  bodyClass: { type: String, default: null },
  // a picture above the title (a resource URL), cropped to a fixed height
  cover: { type: String, default: null },
  // false: no fairy wings in the corners (the projects' cards)
  wings: { type: Boolean, default: true },
});
</script>

<template>
  <div
    :class="['callout ui-widget', { 'ui-widget--wingless': !wings }]"
    data-callout="card"
    :data-callout-metadata="meta.join(' ')"
    data-callout-fold=""
  >
    <img
      v-if="cover"
      class="ui-widget__cover"
      :src="cover"
      alt=""
    >
    <div class="callout-title ui-widget__title" dir="auto">
      <div class="callout-icon" />
      <div class="callout-title-inner">{{ title }}</div>
      <slot name="button" />
    </div>
    <div :class="['callout-content ui-widget__body', bodyClass]"><slot /></div>
  </div>
</template>
