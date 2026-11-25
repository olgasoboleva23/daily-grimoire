<!-- The journal viewer (block ui-journal; open.js opens it): the filter
     (what an entry is about, with counts) and + Entry, then the timeline, newest first: a dot
     each, all alike (a journal, not a progress list), its date and what it is about, the heading,
     the text, the linked note, ✏️ and × -->
<script setup>
import { projectStore } from "#/entities/project/index.js";
import { computed, inject, ref } from "vue";
import { confirm, openWindow, WINDOW } from "#/shared/ui/Window/index.ts";
import JournalEntryWindow from "#/components/windows/projects/JournalEntryWindow/index.vue";
import UiTabs from "#/shared/ui/UiTabs/index.vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import { openNote } from "#/shared/host/index.js";
import { removeNote } from "#/controllers/journal.js";
import { journalOf } from "#/models/journal.js";
import { taskStore } from "#/store/tasks.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({ project: { type: String, required: true } });
const ctx = inject(WINDOW);
const title = `🕒 Journal · ${projectStore.projects.get(props.project)?.name ?? ""}`;

const KINDS = [["all", "All"], ["project", "Project"], ["stage", "Stages"], ["task", "Tasks"]];
const kind = ref("all");
const entries = computed(() => {
  void taskStore.version.value;
  void projectStore.version.value;
  return journalOf(props.project,
    { projects: projectStore.projects, notes: taskStore.notes, tasks: taskStore.records });
});
const of = k => entries.value.filter(e => k === "all" || e.target.kind === k);
const tabs = computed(() =>
  KINDS.map(([key, name]) => ({ key, text: `${name} · ${of(key).length}` })));
const shown = computed(() => of(kind.value));

const when = at => window.moment(at).format("D MMM YYYY, HH:mm");
const noteName = path => path.split("/").pop().replace(/\.md$/i, "");

function open(e, event) {
  openNote(e.link, "", event);
  ctx.close();
}

// + Entry (no entry) and ✏️ (the entry): the entry's window
const entryWindow = (entry = null) =>
  openWindow(JournalEntryWindow, { project: props.project, entry });

async function remove(e) {
  if (await confirm("Delete entry?", [{ name: "Entry", text: e.heading }])) await removeNote(e.id);
}
</script>

<template>
  <UiWindow :title="title" frame-class="ui-journal-window">
    <div class="ui-journal">
      <div class="ui-journal__bar">
        <UiTabs v-model="kind" :tabs="tabs" />
        <button class="mod-cta" @click="entryWindow()">+ Entry</button>
      </div>
      <div v-if="!shown.length" class="ui-journal__empty">No entries yet</div>
      <ol class="ui-journal__list">
        <li
          v-for="e in shown"
          :key="e.id"
          :class="['ui-journal__entry', { 'ui-journal__entry--gone': e.gone }]"
        >
          <span class="ui-journal__dot" aria-hidden="true" />
          <div class="ui-journal__meta">{{ when(e.at) }} · {{ e.label }}</div>
          <div class="ui-journal__heading" dir="auto">{{ e.heading }}</div>
          <div v-if="e.text" class="ui-journal__text" dir="auto">{{ e.text }}</div>
          <div class="ui-journal__actions">
            <button v-if="e.link" class="ui-journal__link" @click="open(e, $event)">
              📄 {{ noteName(e.link) }}
            </button>
            <button class="clickable-icon" title="Edit" @click="entryWindow(e)">✏️</button>
            <button class="clickable-icon" title="Delete" @click="remove(e)">×</button>
          </div>
        </li>
      </ol>
    </div>
  </UiWindow>
</template>
