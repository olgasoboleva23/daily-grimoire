<!-- The kit's "Delete X?" window (opened by confirm.js): its `lines` ({ name, text }) as label
     rows, the button (`submit`, "Delete" by default). Resolves true on the button or Enter; its
     opener does the deleting -->
<script setup>
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";

defineProps({
  title: { type: String, required: true },
  lines: { type: Array, default: () => [] },
  submit: { type: String, default: "Delete" },
});
defineEmits(["done"]);
</script>

<template>
  <UiWindow :title="title" :submit="submit" @submit="$emit('done', true)">
    <UiField
      v-for="(l, i) in lines"
      :key="i"
      :name="l.name"
      :text="l.text"
    />
  </UiWindow>
</template>
