<!-- a button that opens a note (a pill by default): from the note the
     block is in -->
<script setup>
import { inject } from "vue";
import { openNote } from "#/shared/host/index.js";
import UiButton from "#/shared/ui/UiButton/index.vue";

const props = defineProps({
  path: { type: String, required: true },
  kind: { type: String, default: "pill" },
});
const sourcePath = inject("sourcePath", "");
const open = e => openNote(props.path, sourcePath, e);
</script>

<template>
  <UiButton :kind="kind" @click="open"><slot /></UiButton>
</template>
