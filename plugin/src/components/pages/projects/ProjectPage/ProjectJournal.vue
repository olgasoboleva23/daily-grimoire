<!-- the project's journal on its page: 🕒 and the number of entries (opens the journal window),
     the last entry in one line, and the two prompts to copy for a chat with an AI: 🚀 Start (the
     interviewer, with the project's context) and 📝 Final (the archivist's summary) -->
<script setup>
import { computed } from "vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiCard from "#/components/uikit/UiCard/index.vue";
import { app } from "#/helpers/app.js";
import { copyFinalPrompt, copyStartPrompt } from "#/controllers/prompts.js";
import { journalOf } from "#/models/journal.js";
import { taskStore } from "#/store/tasks.js";
import { openJournal } from "../JournalWindow/index.ts";

const props = defineProps({ project: { type: String, required: true } });
const entries = computed(() => {
  void taskStore.version.value;
  return journalOf(props.project,
    { projects: taskStore.projects, notes: taskStore.notes, tasks: taskStore.records });
});
const last = computed(() => entries.value[0]);
const day = at => window.moment(at).format("D MMM");
</script>

<template>
  <UiCard :wings="false" class="ui-project__journal" title="Journal">
    <template #button>
      <UiButton
        kind="chip"
        class="ui-project__journal-open"
        title="Open the journal"
        @click="openJournal(app, project)"
      >🕒 {{ entries.length }}</UiButton>
    </template>
    <div
      v-if="last"
      class="ui-project__journal-last"
      dir="auto"
      @click="openJournal(app, project)"
    >{{ day(last.at) }} · {{ last.heading }}</div>
    <div class="ui-row ui-wrap ui-gap-s">
      <UiButton kind="chip" @click="copyStartPrompt(app, project)">🚀 Start</UiButton>
      <UiButton kind="chip" @click="copyFinalPrompt()">📝 Final</UiButton>
    </div>
  </UiCard>
</template>
