<!-- A medication course's window, new or edit (opened by open.js): the Medicines stacked, each
     its Name, Dose, Утром / Днём / Вечером (none ticked: once at any time), Meal, Days; + one
     more, × one off; then Start and Notes. Create / Save greyed until every medicine has a name.
     Days that don't read (courseProblem): the notice, the window stays with what was typed. New
     resolves the new course's id (createCourse); edit "saved", "changed" or "gone" (saveCourse,
     against `before`: the values as read when the window opened; the notices are the write's) -->
<script setup>
import { computed, reactive } from "vue";
import { Notice } from "obsidian";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import UiFieldChoice from "#/shared/ui/UiFieldChoice/index.vue";
import UiFieldList from "#/shared/ui/UiFieldList/index.vue";
import { groupsFilled, useWrite } from "#/shared/ui/Window/index.ts";
import { courseProblem, createCourse, saveCourse } from "#/entities/course/index.js";

const props = defineProps({
  id: { type: String, default: null },          // edit: its id
  values: { type: Object, default: null },      // edit: formValues(record)
  before: { type: String, default: null },      // edit: those values as read, JSON
});
const emit = defineEmits(["done"]);

const TIMES = [
  { key: "morning", name: "Утром", description: "Ничего не отмечено — один приём в любое время" },
  { key: "day", name: "Днём", description: "" },
  { key: "evening", name: "Вечером", description: "" },
];
const MEALS = [["перед едой", "before"], ["после еды", "after"], ["перед сном", "sleep"],
  ["неважно", "any"]].map(([label, value]) => ({ label, value }));
// a copy (the values are JSON data): the window never changes what it was given
const v = reactive(props.values ? JSON.parse(JSON.stringify(props.values))
  : { meds: [], start: "", notes: "" });
const ready = computed(() => groupsFilled(v.meds, ["name"]));
const { busy, run } = useWrite(emit);

const save = () => run(() => {
  const problem = courseProblem(v);

  if (problem) return void new Notice(`✦ ${problem}`);
  return props.id ? saveCourse(props.id, v, props.before) : createCourse(v);
});
</script>

<template>
  <UiWindow
    :title="id ? '✦ Edit medication course' : '✦ New medication course'"
    :submit="id ? 'Save' : 'Create'"
    :ready="ready"
    :busy="busy"
    @submit="save"
  >
    <UiFieldList v-slot="{ group }" v-model="v.meds" name="Medicines">
      <UiField name="Name">
        <UiFieldText v-model="group.name" placeholder="Мастодинон" />
      </UiField>
      <UiField name="Dose">
        <UiFieldText v-model="group.dose" placeholder="30 капель" />
      </UiField>
      <UiField
        v-for="t in TIMES"
        :key="t.key"
        :name="t.name"
        :description="t.description"
        toggle
      >
        <input v-model="group[t.key]" type="checkbox" :aria-label="t.name">
      </UiField>
      <UiField name="Meal">
        <UiFieldChoice v-model="group.meal" :choices="MEALS" />
      </UiField>
      <UiField name="Days">
        <UiFieldText v-model="group.ranges" placeholder="1-30, 45-60 (empty: 1-90)" />
      </UiField>
    </UiFieldList>
    <UiField name="Start">
      <UiFieldText v-model="v.start" placeholder="YYYY-MM-DD (empty: today)" />
    </UiField>
    <UiField name="Notes">
      <UiFieldText
        v-model="v.notes"
        type="lines"
        placeholder="доп. информация: от врача, как принимать…"
      />
    </UiField>
  </UiWindow>
</template>
