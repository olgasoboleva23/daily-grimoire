<!-- A journal entry's window, new or edit (opened by the journal window's + Entry and ✏️,
     pages/projects/JournalWindow): new asks what it is about (the project, a stage, a task of a
     stage), edit keeps that and asks When instead; both a title, a text and a note to link. The
     entry belongs to the project it is added in (its owner). Nothing written (no title, text or
     note): a notice, the window stays. Resolves true once addNote / editNote wrote -->
<script setup>
import { projectStore } from "#/entities/project/index.js";
import { computed, reactive } from "vue";
import { FuzzySuggestModal, Notice } from "obsidian";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import UiFieldPick from "#/shared/ui/UiFieldPick/index.vue";
import { filled, useWrite } from "#/shared/ui/Window/index.ts";
import { app } from "#/shared/host/index.js";
import { addNote, editNote } from "#/pages/projects/index.js";
import { taskStore } from "#/entities/task/index.js";

const props = defineProps({
  project: { type: String, required: true },
  entry: { type: Object, default: null },   // edit: the entry ({ id, title, text, link, at })
});
const emit = defineEmits(["done"]);

// the project, its stages, their tasks: { label, value: "kind:id" }
function about(key) {
  const p = projectStore.projects.get(key);
  const stages = p?.stages ?? [];
  const name = id => taskStore.records.get(id)?.name ?? id;

  return [
    { label: `Project · ${p?.name ?? key}`, value: `project:${key}` },
    ...stages.map((s, i) =>
      ({ label: `Stage ${String(i + 1).padStart(2, "0")} · ${s.name}`, value: `stage:${s.id}` })),
    ...[...new Set(stages.flatMap(s => s.tasks ?? []))]
      .map(id => ({ label: `Task · ${name(id)}`, value: `task:${id}` })),
  ];
}

const { entry } = props;
const choices = entry ? [] : about(props.project);
const before = entry && {
  title: entry.title ?? "", text: entry.text ?? "", link: entry.link ?? "", at: entry.at ?? "",
};
const v = reactive(before
  ? { ...before }
  : { about: `project:${props.project}`, title: "", text: "", link: "" });
const ready = computed(() => !entry || filled(v.at));
const { busy, run } = useWrite(emit);

function pickNotePath() {
  return new Promise(resolve => {
    class Picker extends FuzzySuggestModal {
      getItems() { return app.vault.getMarkdownFiles(); }
      getItemText(file) { return file.path; }
      onChooseItem(file) { resolve(file.path); }
      onClose() { super.onClose(); queueMicrotask(() => resolve(null)); }
    }

    new Picker(app).open();
  });
}

const save = () => run(async () => {
  if (!v.title?.trim() && !v.text?.trim() && !v.link)
    return void new Notice("✦ write a title, a text or a note");
  const note = { title: v.title.trim(), text: v.text ?? "", link: v.link ?? "" };

  if (entry) return editNote(entry.id, { ...note, at: v.at }, before);
  const [kind, id] = v.about.split(":");

  return addNote({ owner: { kind: "project", id: props.project }, target: { kind, id }, ...note });
});
</script>

<template>
  <UiWindow
    :title="entry ? '✦ Edit entry' : '✦ New entry'"
    :submit="entry ? 'Save' : 'Add'"
    :ready="ready"
    :busy="busy"
    @submit="save"
  >
    <UiField v-if="!entry" name="About">
      <select v-model="v.about" class="dropdown">
        <option v-for="c in choices" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>
    </UiField>
    <UiField name="Title">
      <UiFieldText v-model="v.title" placeholder="empty: the name of what it is about" />
    </UiField>
    <UiField name="Text">
      <UiFieldText v-model="v.text" type="lines" placeholder="what came out of it" />
    </UiField>
    <UiField name="Note">
      <UiFieldPick v-model="v.link" :pick="pickNotePath" />
    </UiField>
    <UiField v-if="entry" name="When">
      <UiFieldText v-model="v.at" placeholder="YYYY-MM-DDTHH:mm" />
    </UiField>
  </UiWindow>
</template>
