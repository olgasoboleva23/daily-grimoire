<!-- A 🗑 that asks by itself (block ui-del, on a round UiButton): the first click arms it for 3 s
     (✓?, red, its tip «Click again to delete»), the second one emits `delete`; left alone, it
     goes back to 🗑. title: its tip at rest. A task's and a market line's 🗑 -->
<script setup>
import { onBeforeUnmount, ref } from "vue";
import UiButton from "#/shared/ui/UiButton/index.vue";

defineProps({ title: { type: String, default: "delete" } });
const emit = defineEmits(["delete"]);
const armed = ref(false);
let timer = null;

function click() {
  window.clearTimeout(timer);
  if (!armed.value) {
    armed.value = true;
    timer = window.setTimeout(() => { armed.value = false; }, 3000);
    return;
  }

  armed.value = false;
  emit("delete");
}

onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <UiButton
    :title="armed ? 'Click again to delete' : title"
    :class="['ui-del', { 'ui-del--armed': armed }]"
    @click="click"
  >{{ armed ? "✓?" : "🗑" }}</UiButton>
</template>
