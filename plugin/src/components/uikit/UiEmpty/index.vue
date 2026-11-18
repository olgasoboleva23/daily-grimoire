<!-- An empty message, with an optional action in the slot.
     onBackground uses UiCard to keep it readable directly on the page background. -->
<script setup>
import UiCard from "#/components/uikit/UiCard/index.vue";

defineProps({
  onBackground: { type: Boolean, default: false },
  text: { type: String, default: "Nothing here yet" },
  mod: { type: String, default: null },
  icon: { type: String, default: "✦" },
});
</script>

<template>
  <component
    :is="onBackground ? UiCard : 'div'"
    :meta="onBackground ? ['hero'] : undefined"
    class="ui-empty ui-text-center"
    :class="mod && `ui-empty--${mod}`"
  >{{ icon }} {{ text }}<slot /></component>
</template>
