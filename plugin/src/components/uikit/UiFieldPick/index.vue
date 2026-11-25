<!-- A window's pick (block ui-field-pick): a button with the value (`show`: its text; «Choose…»
     when empty or an empty list) that sets what `pick()` gives ("": clears the value; null: the
     picker closed, the value stays); its text drawn again after (the same value can show a new
     name: a product renamed in its own window); × Clears it, unless `clear` is false or it sits
     in a list's line (UiFieldList: the line's × takes the group off). v-model: the value. Its
     look: index.scss -->
<script setup>
import { computed, inject, ref } from "vue";

const props = defineProps({
  modelValue: { type: [String, Array, Object], default: null },
  pick: { type: Function, required: true },
  show: { type: Function, default: null },
  clear: { type: Boolean, default: true },
});
const emit = defineEmits(["update:modelValue"]);
const cell = inject("inField", null) === "cell";
const drawn = ref(0);
const picked = computed(() => {
  const v = props.modelValue;

  return Array.isArray(v) ? v.length > 0 : !!v;
});
const choose = async () => {
  const v = await props.pick();

  if (v !== null && v !== undefined) emit("update:modelValue", v);
  drawn.value++;
};
</script>

<template>
  <button :key="drawn" class="ui-field-pick__button" @click="choose">
    {{ picked ? (show?.(modelValue) ?? modelValue) : "Choose…" }}
  </button>
  <button
    v-if="modelValue && clear && !cell"
    class="ui-field-pick__clear"
    title="Clear"
    @click="emit('update:modelValue', '')"
  >×</button>
</template>
