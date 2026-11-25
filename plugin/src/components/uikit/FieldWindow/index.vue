<!-- The kit's one-field window (opened by ask.js): a name and one field, a text box (`type`
     text, number, lines; UiFieldText) or, with `choices`, a button each (UiFieldChoice).
     `required`: the button greyed until the value is filled. Resolves the value (text trimmed,
     a number a Number); its opener does the writing -->
<script setup>
import { computed, ref } from "vue";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import UiField from "#/components/uikit/UiField/index.vue";
import UiFieldText from "#/components/uikit/UiFieldText/index.vue";
import UiFieldChoice from "#/components/uikit/UiFieldChoice/index.vue";
import { filled } from "#/components/uikit/UiWindow/ready.js";

const props = defineProps({
  title: { type: String, required: true },
  name: { type: String, required: true },
  value: { type: [String, Number], default: "" },
  placeholder: { type: String, default: "" },
  type: { type: String, default: "text" },   // text, number, lines
  choices: { type: Array, default: null },
  required: { type: Boolean, default: false },
  submit: { type: String, default: "Save" },
});

defineEmits(["done"]);

const value = ref(props.value);
const ready = computed(() => !props.required || filled(value.value));
</script>

<template>
  <UiWindow
    :title="title"
    :submit="submit"
    :ready="ready"
    @submit="$emit('done', value)"
  >
    <UiField :name="name">
      <UiFieldChoice v-if="choices" v-model="value" :choices="choices" />
      <UiFieldText
        v-else
        v-model="value"
        :type="type"
        :placeholder="placeholder"
      />
    </UiField>
  </UiWindow>
</template>
