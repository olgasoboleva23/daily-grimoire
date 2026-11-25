<!-- The shell every window's template starts with (opened by openWindow, uikit/Window/open.ts):
     the frame's title, the tabs (UiTabs) with a pane each (#tab:<name>; all mounted, the hidden
     ones keep their values), the fields without a tab (default slot), then the button (#footer:
     something next to it; no `submit`: no button row, the viewers). The button and the frame's
     Enter emit `submit` only when `ready` and not `busy` (greyed out otherwise). The first shown
     text box (UiFieldText) takes the focus. The frame's content holds the fields directly;
     field styling lives with each component (UiField*) -->
<script setup>
import { inject, provide, ref, watchEffect } from "vue";
import UiTabs from "#/components/uikit/UiTabs/index.vue";
import { WINDOW } from "#/components/uikit/Window/open.ts";

const props = defineProps({
  title: { type: String, required: true },
  submit: { type: String, default: null },
  ready: { type: Boolean, default: true },
  busy: { type: Boolean, default: false },
  tabs: { type: Array, default: () => [] },
  frameClass: { type: String, default: null },
});
const emit = defineEmits(["submit"]);
const frame = inject(WINDOW);
const send = () => { if (props.submit && props.ready && !props.busy) emit("submit"); };

watchEffect(() => frame.setTitle(props.title));
if (props.frameClass) frame.addClass(props.frameClass);
frame.onEnter(send);

const picked = ref(props.tabs[0]);
// a text box offers itself as it mounts (the window's order): the first one shown keeps the focus
let focused = false;

provide("focusFirst", el => {
  if (focused || el.closest("[hidden]")) return;
  focused = true;
  el.focus();
});
</script>

<template>
  <div v-if="tabs.length" class="ui-window__tabs">
    <UiTabs v-model="picked" :tabs="tabs.map(t => ({ key: t, text: t }))" />
  </div>
  <div
    v-for="t in tabs"
    :key="t"
    class="ui-window__pane"
    :hidden="t !== picked"
  >
    <slot :name="`tab:${t}`" />
  </div>
  <slot />
  <div v-if="submit" class="modal-button-container ui-window__buttons">
    <slot name="footer" />
    <button
      class="mod-cta ui-window__submit"
      :disabled="!ready || busy"
      @click="send"
    >{{ submit }}</button>
  </div>
</template>
