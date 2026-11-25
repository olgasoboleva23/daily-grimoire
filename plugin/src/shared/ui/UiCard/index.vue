<!-- a card: a title and a body slot; the button slot: one next to the title;
     each `meta` word becomes a modifier (ui-card--scroll, ui-card--hero) -->
<script setup>
defineProps({
  title: { type: String, default: "" },
  meta: { type: Array, default: () => [] },
  // the widget's own class on the body (the shop's ui-shop)
  bodyClass: { type: String, default: null },
  // a picture above the title (a resource URL), cropped to a fixed height
  cover: { type: String, default: null },
  // with no cover: a block of the same height with this word in it (the projects' "project")
  placeholder: { type: String, default: null },
  // false: no fairy wings in the corners (the projects' cards)
  wings: { type: Boolean, default: true },
});
</script>

<template>
  <div
    :class="['ui-card', { 'ui-card--wingless': !wings }, ...meta.map(m => `ui-card--${m}`)]"
  >
    <img
      v-if="cover"
      class="ui-card__cover"
      :src="cover"
      alt=""
    >
    <div
      v-else-if="placeholder"
      class="ui-card__cover ui-card__cover--empty"
    >{{ placeholder }}</div>
    <div class="ui-card__title" dir="auto">
      <div class="ui-card__title-inner">{{ title }}</div>
      <slot name="button" />
    </div>
    <div :class="['ui-card__body', bodyClass]"><slot /></div>
  </div>
</template>
