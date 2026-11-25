<!-- A window's field row (block ui-field): Obsidian's setting row, its name on the left, its
     control (the slot: UiFieldText, UiFieldChoice, UiFieldPick, a native checkbox or select) on
     the right. `toggle`: a checkbox's row (Obsidian's mod-toggle, the narrow control), with its
     `description` under the name ("": an empty line, as Form's check rows had); `text`: a label
     row, the text shown selectable, its line breaks kept, instead of a control. Its look:
     index.scss -->
<script setup>
defineProps({
  name: { type: String, required: true },
  description: { type: String, default: null },
  toggle: { type: Boolean, default: false },
  text: { type: String, default: null },
});
</script>

<template>
  <div class="setting-item ui-field" :class="{ 'mod-toggle': toggle }">
    <!-- a long name wraps (the field stays in the window), but many buttons never squeeze it -->
    <div class="setting-item-info ui-field__info">
      <div class="setting-item-name">{{ name }}</div>
      <div v-if="description !== null" class="setting-item-description">{{ description }}</div>
    </div>
    <div
      class="setting-item-control ui-field__control"
      :class="{ 'ui-field__control--check': toggle }"
    >
      <span v-if="text !== null" class="ui-field__label">{{ text }}</span>
      <slot v-else />
    </div>
  </div>
</template>
