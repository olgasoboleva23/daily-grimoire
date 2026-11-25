<!-- A project's window, new or edit (opened by open.js): Name, Description, Cover (a local
     picture, imported by the write), then Status (new: Active lit) or whether the project shows
     in the calendar's Projects tab (edit). Create / Save greyed until a name. New resolves the
     new project's key (newProject), edit true (editProject, against `before`: the project as it
     was on disk when the window opened) -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import UiFieldChoice from "#/shared/ui/UiFieldChoice/index.vue";
import { filled, useWrite } from "#/shared/ui/Window/index.ts";
import { editProject, newProject } from "#/controllers/projects.js";

const props = defineProps({
  project: { type: String, default: null },   // edit: its key
  before: { type: Object, default: null },    // edit: the project read from disk
});
const emit = defineEmits(["done"]);

const STATUSES = ["idea", "active", "paused", "done"]
  .map(s => ({ label: `${s[0].toUpperCase()}${s.slice(1)}`, value: s }));
const editing = !!props.project;
const v = reactive(editing
  ? { name: props.before.name, description: props.before.description ?? "", cover: null,
    showInCalendar: props.before.showInCalendar !== false }
  : { name: "", description: "", cover: null, status: "active" });
const ready = computed(() => filled(v.name));
const { busy, run } = useWrite(emit);

const save = () => run(() => editing
  ? editProject(props.project, v, props.before)
  : newProject(v));
</script>

<template>
  <UiWindow
    :title="editing ? '✦ Edit project' : '✦ New project'"
    :submit="editing ? 'Save' : 'Create'"
    :ready="ready"
    :busy="busy"
    @submit="save"
  >
    <UiField name="Name">
      <UiFieldText v-model="v.name" placeholder="what it is" />
    </UiField>
    <UiField name="Description">
      <UiFieldText v-model="v.description" type="lines" placeholder="a line about it" />
    </UiField>
    <UiField name="Cover">
      <input
        type="file"
        class="ui-field__upload"
        accept="image/*,.heic,.heif,.tif,.tiff"
        aria-label="Cover"
        @change="v.cover = $event.target.files?.[0] ?? null"
      >
    </UiField>
    <UiField
      v-if="editing"
      name="Показывать во вкладке Projects календаря"
      description="Запланированные задачи остаются в своих днях"
      toggle
    >
      <input
        v-model="v.showInCalendar"
        type="checkbox"
        aria-label="Показывать во вкладке Projects календаря"
      >
    </UiField>
    <UiField v-else name="Status">
      <UiFieldChoice v-model="v.status" :choices="STATUSES" />
    </UiField>
  </UiWindow>
</template>
