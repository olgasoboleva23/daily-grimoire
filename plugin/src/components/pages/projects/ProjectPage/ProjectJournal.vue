<!-- the project's journal on its page: 🕒 and the number of entries (opens the journal window),
     the last entry in one line, and the two prompts to copy for a chat with an AI: 🚀 Start (the
     interviewer, with the project's context and the task asked for first) and 📝 Final (the
     archivist's summary) -->
<script setup>
import { computed } from "vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiCard from "#/components/uikit/UiCard/index.vue";
import { askValue } from "#/components/uikit/FieldWindow/ask.js";
import { copyFinalPrompt, copyStartPrompt } from "#/controllers/prompts.js";
import { journalOf } from "#/models/journal.js";
import { taskStore } from "#/store/tasks.js";
import { openJournal } from "../JournalWindow/open.js";

const props = defineProps({ project: { type: String, required: true } });
const entries = computed(() => {
  void taskStore.version.value;
  return journalOf(props.project,
    { projects: taskStore.projects, notes: taskStore.notes, tasks: taskStore.records });
});
const last = computed(() => entries.value[0]);
const day = at => window.moment(at).format("D MMM");

async function start() {
  const task = await askValue({ title: "Start", name: "Task for this session", submit: "Copy" });

  if (task !== null) await copyStartPrompt(props.project, task);
}
</script>

<template>
  <UiCard :wings="false" class="ui-project__journal" title="Journal">
    <template #button>
      <UiButton
        kind="chip"
        class="ui-project__journal-open"
        title="Open the journal"
        @click="openJournal(project)"
      >🕒 {{ entries.length }}</UiButton>
    </template>
    <div
      v-if="last"
      class="ui-project__journal-last"
      dir="auto"
      @click="openJournal(project)"
    >{{ day(last.at) }} · {{ last.heading }}</div>
    <div class="ui-row ui-wrap ui-gap-s">
      <UiButton kind="chip" @click="start">🚀 Start</UiButton>
      <UiButton kind="chip" @click="copyFinalPrompt()">📝 Final</UiButton>
    </div>
  </UiCard>
</template>
