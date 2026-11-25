<!-- Промпты проекта (opened by the Projects list's Промпты): the shared Start and Final prompts,
     a tab each, the text and its variables (Start's: PROMPT_VARIABLES; Final has none). Сохранить
     greyed until both are written. Resolves true once savePrompts wrote -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import { filled, useWrite } from "#/shared/ui/Window/index.ts";
import config from "#/shared/config/index.js";
import { PROMPT_VARIABLES } from "../../model/prompt.js";
import { savePrompts } from "./save.js";

const emit = defineEmits(["done"]);

const v = reactive({ promptStart: config.promptStart, promptFinal: config.promptFinal });
const ready = computed(() => filled(v.promptStart) && filled(v.promptFinal));
const { busy, run } = useWrite(emit);

const save = () => run(async () => {
  await savePrompts(v);
  return true;
});
</script>

<template>
  <UiWindow
    title="Промпты проекта"
    submit="Сохранить"
    :tabs="['Start', 'Final']"
    :ready="ready"
    :busy="busy"
    @submit="save"
  >
    <template #tab:Start>
      <UiField name="Start">
        <UiFieldText v-model="v.promptStart" type="lines" />
      </UiField>
      <UiField name="Переменные" :text="PROMPT_VARIABLES" />
    </template>
    <template #tab:Final>
      <UiField name="Final">
        <UiFieldText v-model="v.promptFinal" type="lines" />
      </UiField>
      <UiField name="Переменные" text="нет: копируется как есть" />
    </template>
  </UiWindow>
</template>
