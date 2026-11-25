<!-- Edits a copy of the five settings tabs and keeps invalid values open for correction. -->
<script setup>
import { computed, reactive } from "vue";
import { Notice } from "obsidian";
import UiField from "#/shared/ui/UiField/index.vue";
import UiFieldChoice from "#/shared/ui/UiFieldChoice/index.vue";
import UiFieldList from "#/shared/ui/UiFieldList/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import { filled, groupsFilled, useWrite } from "#/shared/ui/Window/index.ts";
import { saveSettings } from "#/controllers/settings.js";
import config, { THEMES } from "#/shared/config/index.js";
import { settingsProblem } from "#/models/settings.js";
import { taskStore } from "#/store/tasks.js";

const props = defineProps({ values: { type: Object, required: true } });
const emit = defineEmits(["done"]);
const v = reactive(JSON.parse(JSON.stringify(props.values)));
const xpTab = "XP Today & Level";
const xpSlot = `tab:${xpTab}`;
const tabs = ["Appearance", "Difficulties", "Areas", xpTab, "Recipes"];
const difficulties = [
  { key: "label", name: "Difficulty" },
  { key: "xp", name: "XP", wide: true },
  { key: "gold", name: "Gold", wide: true },
];
const areas = [
  { key: "key", name: "Key", wide: true },
  { key: "icon", name: "Icon", wide: true },
  { key: "title", name: "Name", wide: true },
  { key: "name", name: "On the radar", wide: true },
  { key: "color", name: "Colour", narrow: true },
  { key: "apply", name: "Apply", narrow: true, title: "a changed key: move its tasks to it" },
];
const dishTypes = [
  { key: "key", name: "Key", wide: true }, { key: "name", name: "Name", wide: true },
];
const [, spark, glow, aura, top] = config.levels.map(level => level.name);
const numbers = [
  { key: "spark", name: `XP Today · ${spark} up to`, placeholder: "10" },
  { key: "glow", name: `XP Today · ${glow} up to`, placeholder: "20" },
  { key: "aura", name: `XP Today · ${aura} up to (above: ${top})`, placeholder: "30" },
  { key: "base", name: "Level · the first one costs", placeholder: "100" },
  { key: "step", name: "Level · each next one costs more by", placeholder: "25" },
];
const ready = computed(() => groupsFilled(v.difficulties, ["xp", "gold"])
  && groupsFilled(v.areas, ["key", "icon", "title"])
  && numbers.every(({ key }) => filled(v[key])));
const { busy, run } = useWrite(emit);

const save = () => run(() => {
  const problem = settingsProblem(v, taskStore.records, config);

  if (problem) return void new Notice(`✦ Settings not saved: ${problem}`);
  return saveSettings(v);
});
</script>

<template>
  <UiWindow
    title="✦ Settings"
    submit="Save"
    :tabs="tabs"
    :ready="ready"
    :busy="busy"
    @submit="save"
  >
    <template #tab:Appearance>
      <UiField name="Theme">
        <UiFieldChoice v-model="v.theme" :choices="THEMES" />
      </UiField>
    </template>
    <template #tab:Difficulties>
      <UiFieldList v-model="v.difficulties" :columns="difficulties" fixed>
        <template #label="{ group }">
          <span class="ui-field__label">{{ group.label }}</span>
        </template>
        <template #xp="{ group }">
          <UiFieldText
            v-model="group.xp"
            type="number"
            placeholder="XP"
            :readonly="group.key === 'none'"
          />
        </template>
        <template #gold="{ group }">
          <UiFieldText v-model="group.gold" type="number" placeholder="gold" />
        </template>
      </UiFieldList>
    </template>
    <template #tab:Areas>
      <UiFieldList v-model="v.areas" :columns="areas">
        <template #key="{ group }">
          <UiFieldText v-model="group.key" placeholder="body" />
        </template>
        <template #icon="{ group }">
          <UiFieldText v-model="group.icon" placeholder="🌺" />
        </template>
        <template #title="{ group }">
          <UiFieldText v-model="group.title" placeholder="Body" />
        </template>
        <template #name="{ group }">
          <UiFieldText v-model="group.name" placeholder="Vitality" />
        </template>
        <template #color="{ group }">
          <UiFieldText v-model="group.color" type="color" placeholder="#e8609a" />
        </template>
        <template #apply="{ group }">
          <input v-model="group.apply" type="checkbox" aria-label="Apply">
        </template>
      </UiFieldList>
    </template>
    <template #[xpSlot]>
      <UiField v-for="field in numbers" :key="field.key" :name="field.name">
        <UiFieldText v-model="v[field.key]" type="number" :placeholder="field.placeholder" />
      </UiField>
    </template>
    <template #tab:Recipes>
      <UiFieldList
        v-model="v.dishTypes"
        name="Dish types"
        :columns="dishTypes"
        start-empty
      >
        <template #key="{ group }">
          <UiFieldText v-model="group.key" placeholder="soup" />
        </template>
        <template #name="{ group }">
          <UiFieldText v-model="group.name" placeholder="Soups" />
        </template>
      </UiFieldList>
    </template>
  </UiWindow>
</template>
