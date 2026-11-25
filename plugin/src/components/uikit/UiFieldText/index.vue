<!-- A window's text box (block ui-field-text), in a UiField row or a UiFieldList cell. v-model:
     a text trimmed, a `number` a Number ("" null), `lines` a textarea of 4 rows as typed, a
     `color` the colour picker ("#rrggbb", its own size). The first one shown in the window takes
     the focus (UiWindow), a textarea and a colour never. Its look: index.scss -->
<script setup>
import { computed, inject, onMounted, ref } from "vue";

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  type: { type: String, default: "text" },   // text, number, lines, color
  placeholder: { type: String, default: "" },
  readonly: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);
const model = computed({
  get: () => props.modelValue ?? "",
  set: v => emit("update:modelValue", props.type === "number" ? (v === "" ? null : Number(v)) : v),
});
const field = ref(null);
const focusFirst = inject("focusFirst", () => {});

onMounted(() => { if (field.value) focusFirst(field.value); });
</script>

<template>
  <textarea
    v-if="type === 'lines'"
    v-model="model"
    class="ui-field-text__textarea"
    :placeholder="placeholder"
    rows="4"
  />
  <input
    v-else-if="type === 'color'"
    v-model="model"
    type="color"
    :placeholder="placeholder"
  >
  <input
    v-else
    ref="field"
    v-model.trim="model"
    :type="type"
    class="ui-field-text__input"
    :placeholder="placeholder"
    :readonly="readonly"
  >
</template>
