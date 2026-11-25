<!-- one field (UiInput) and a submit button, a finger's height (block ui-add-form):
     v-model is the field's text, @submit the parent's save; input: the field's attributes
     ({ name, type, placeholder, … }); onBackground: a whiter field, a darker placeholder
     directly on the page background (a project's "+ stage") -->
<script setup>
import UiInput from "#/shared/ui/UiInput/index.vue";

defineProps({
  input: { type: Object, default: () => ({}) },
  submit: { type: String, default: "Add" },
  onBackground: { type: Boolean, default: false },
});
defineEmits(["submit"]);
// a number field gives a number
const value = defineModel({ type: [String, Number], default: "" });
</script>

<template>
  <form
    class="ui-add-form ui-flex ui-gap-s"
    :class="{ 'ui-add-form--on-background': onBackground }"
    @submit.prevent="$emit('submit', value)"
  >
    <UiInput v-model="value" class="ui-add-form__input" v-bind="input" />
    <button class="ui-add-form__submit" type="submit">{{ submit }}</button>
  </form>
</template>
