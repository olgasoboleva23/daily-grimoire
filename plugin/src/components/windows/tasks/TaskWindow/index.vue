<!-- Collects task fields for the native Tasks dialog or for a Pool item. -->
<script setup>
import { computed, reactive } from "vue";
import { Notice } from "obsidian";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import UiField from "#/components/uikit/UiField/index.vue";
import UiFieldChoice from "#/components/uikit/UiFieldChoice/index.vue";
import UiFieldText from "#/components/uikit/UiFieldText/index.vue";
import { filled } from "#/components/uikit/UiWindow/ready.js";
import config from "#/shared/config/index.js";
import { variantNames, variantsProblem } from "#/models/task.js";

const props = defineProps({
  preset: { type: Object, default: () => ({}) },
  isNew: { type: Boolean, default: false },
  variants: { type: Boolean, default: true },
  stickers: { type: Array, default: () => [] },
});
const emit = defineEmits(["done"]);
const { variants: presetVariants, currVariant, ...initial } = props.preset;
const v = reactive({
  difficulty: null, area: null, daytime: null, sticker: null, ...initial,
  variantsText: (presetVariants ?? []).join("\n"), currVariant: currVariant ?? null,
});
const hasName = "name" in initial;
const ready = computed(() => !props.isNew || filled(v.difficulty) && filled(v.area));
const difficulties = config.difficulties
  .map(d => ({ label: `${d.label} (${d.xp} XP)`, value: d.key }));
const areas = config.areas.map(a => ({ label: a.label, value: a.key }));
const times = [
  { label: "—", value: null },
  { label: "🌅 morning", value: "morning" },
  { label: "🌙 evening", value: "evening" },
];
const stickers = [
  { label: "—", value: null },
  ...props.stickers.map(({ name, url }) => ({ label: name, value: name, img: url })),
];
const names = computed(() => variantNames(v.variantsText));
const nextChoices = computed(() => [
  { label: "First in the list", value: null },
  ...names.value.map(name => ({ label: name, value: name })),
]);

function submit() {
  const { currVariant, ...picks } = v;

  delete picks.variantsText;
  if (!props.variants) return emit("done", picks);
  const next = names.value.length ? currVariant ?? names.value[0] : null;
  const problem = variantsProblem(names.value, next);

  if (problem) return void new Notice(problem);
  emit("done", { ...picks, variants: names.value, currVariant: next });
}
</script>

<template>
  <UiWindow
    :title="isNew ? '✦ New task' : '✦ Edit task'"
    :submit="hasName && !isNew ? 'Save' : 'Next →'"
    :ready="ready"
    @submit="submit"
  >
    <UiField v-if="hasName" name="Name">
      <UiFieldText v-model="v.name" placeholder="name" />
    </UiField>
    <UiField name="Difficulty">
      <UiFieldChoice v-model="v.difficulty" :choices="difficulties" />
    </UiField>
    <UiField name="Area">
      <UiFieldChoice v-model="v.area" :choices="areas" />
    </UiField>
    <UiField name="Time of day">
      <UiFieldChoice v-model="v.daytime" :choices="times" />
    </UiField>
    <UiField name="Sticker">
      <UiFieldChoice v-model="v.sticker" :choices="stickers" />
    </UiField>
    <template v-if="variants">
      <UiField name="Variants · in order">
        <UiFieldText
          v-model="v.variantsText"
          type="lines"
          placeholder="One name per line; empty = no alternation"
        />
      </UiField>
      <UiField name="Next variant">
        <UiFieldChoice v-model="v.currVariant" :choices="nextChoices" />
      </UiField>
    </template>
    <UiField
      :name="isNew ? 'To pool' : 'Показывать в пуле'"
      :description="isNew ? `pick it from the calendar's Pool tab when it's time`
        : 'Добавить в Calendar → Pool, сохранив запланированные даты'"
      toggle
    >
      <input v-model="v.pool" type="checkbox" :aria-label="isNew ? 'To pool' : 'Показывать в пуле'">
    </UiField>
  </UiWindow>
</template>
