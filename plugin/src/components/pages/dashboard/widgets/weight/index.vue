<!-- Weight: the last value and the change vs a week ago, a field for today, a 30-day line; the
     journal's pill shows a free journal (with more than one, a select under the pills picks it:
     this device remembers it): a level 0–3 and today's reasons, bars over the cycle's period days.
     A level saves the day at once, a reason too (once there's a level). The mode, the typed weight
     and the picks live here; WeightMode and BodyLogMode draw them. -->
<script setup>
import { computed, ref, watch } from "vue";
import UiButton from "#/shared/ui/UiButton/index.vue";
import UiMissing from "#/shared/ui/UiMissing.vue";
import { confirm, openWindow } from "#/shared/ui/Window/index.ts";
import NewJournalWindow from "#/components/windows/journals/NewJournalWindow/index.vue";
import { WEIGHT } from "#/shared/config/index.js";
import { app } from "#/shared/host/index.js";
import { logWeight, logBody, trashJournal } from "#/entities/weight/index.js";
import WeightMode from "./WeightMode.vue";
import BodyLogMode from "./BodyLogMode.vue";

const props = defineProps({ state: { type: Object, required: true } });

const w = computed(() => props.state.data.weight), logs = computed(() => props.state.data.logs);
const mode = ref("weight");   // or "log"
const picked = ref(app.loadLocalStorage("ui-journal"));
const log = computed(() => logs.value.find(l => l.path === picked.value) ?? logs.value[0]);
const logging = computed(() => mode.value === "log" && !!log.value);

const kg = ref("");
// cleared once saved, unless more was typed while it wrote
const save = async () => {
  const typed = kg.value;

  if (await logWeight(typed) && kg.value === typed) kg.value = "";
};

// a journal picked: shown, and remembered on this device
const pick = path => {
  picked.value = path;
  app.saveLocalStorage("ui-journal", path);
  mode.value = "log";
};

// ＋ a new journal in its window: shown once the card loads it
const newJournal = async () => {
  const file = await openWindow(NewJournalWindow);

  if (file) pick(file.path);
};

// 🗑 a journal: asked first, then into the trash (Obsidian's, as set: recoverable)
const deleteJournal = async ({ path, name }) => {
  if (await confirm(`✦ Delete the journal «${name}»?`)) await trashJournal(path);
};

// the picks: the journal's today, again when its file or the day changes
const level = ref(null), reasons = ref([]);

const shown = () => log.value
  && `${log.value.path}|${log.value.day}|${JSON.stringify(log.value.now)}`;

watch(shown, () => {
  level.value = log.value?.now?.level ?? null;
  reasons.value = [...(log.value?.now?.reasons ?? [])];
}, { immediate: true });

// a level saves the day at once, a reason too once there's a level
const saveLog = () =>
  level.value === null ? null : logBody(log.value.path, level.value, reasons.value);
</script>

<template>
  <div class="ui-weight">
    <div v-if="log" class="ui-weight__modes ui-flex ui-gap-s">
      <UiButton
        kind="toggle"
        :on="mode === 'weight'"
        @click="mode = 'weight'"
      >⚖️ weight</UiButton>
      <UiButton
        kind="toggle"
        :on="logging"
        @click="mode = 'log'"
      >{{ log.name }}</UiButton>
      <UiButton
        kind="add"
        title="new journal"
        class="ui-weight__new"
        @click="newJournal"
      >+</UiButton>
    </div>
    <select
      v-if="logging && logs.length > 1"
      class="ui-weight__journal"
      :value="log.path"
      @change="pick($event.target.value)"
    >
      <option v-for="l in logs" :key="l.path" :value="l.path">{{ l.name }}</option>
    </select>
    <BodyLogMode
      v-if="logging"
      v-model:level="level"
      v-model:reasons="reasons"
      :log="log"
      @save="saveLog"
      @delete="deleteJournal(log)"
    />
    <UiMissing v-else-if="w.missing" :path="WEIGHT" />
    <WeightMode
      v-else
      v-model="kg"
      :weight="w"
      @save="save"
    />
  </div>
</template>
