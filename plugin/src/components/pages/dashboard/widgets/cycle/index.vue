<!-- Cycle: the day and the next start; unfolded, the cycles as rows of day pills or their lengths
     as columns. The fold (kept per device) and the days / stats tab live here; CycleHead,
     CycleRows, CycleStats draw. -->
<script setup>
import { computed, ref } from "vue";
import { app } from "#/shared/host/index.js";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiEmpty from "#/components/uikit/UiEmpty/index.vue";
import UiMissing from "#/components/uikit/UiMissing.vue";
import UiNoteLink from "#/components/uikit/UiNoteLink.vue";
import { CYCLE } from "#/shared/config/index.js";
import { markCycle } from "#/controllers/widgets/cycle.js";
import CycleHead from "./CycleHead.vue";
import CycleRows from "./CycleRows.vue";
import CycleStats from "./CycleStats.vue";

const props = defineProps({ state: { type: Object, required: true } });

const d = computed(() => props.state.data);
const tab = ref("days");   // or "stats"

// folded unless opened on this device
const open = ref(app.loadLocalStorage("winx-cycle-open") === "1");
const fold = () => {
  open.value = !open.value;
  app.saveLocalStorage("winx-cycle-open", open.value ? "1" : null);
};

const folded = computed(() => !open.value && d.value.info);
</script>

<template>
  <div :class="['ui-cycle', { 'ui-cycle--folded': folded }]">
    <UiMissing v-if="!d.page" :path="CYCLE" />
    <UiEmpty v-else-if="!d.info" text="No data yet" />
    <CycleHead
      v-else
      :head="d.head"
      :open="open"
      @fold="fold"
    />
    <template v-if="!folded && d.rows.length">
      <div class="ui-cycle__tabs ui-flex ui-gap-s">
        <UiButton kind="toggle" :on="tab === 'days'" @click="tab = 'days'">days</UiButton>
        <UiButton kind="toggle" :on="tab === 'stats'" @click="tab = 'stats'">stats</UiButton>
      </div>
      <CycleStats v-if="tab === 'stats'" :charts="d.charts" />
      <CycleRows v-else :rows="d.rows" />
    </template>
    <div class="ui-cycle__btns ui-flex ui-gap-m ui-wrap">
      <UiButton
        kind="pill"
        @click="markCycle(d.mark.kind, d.day)"
      >{{ d.mark.text }}</UiButton>
      <UiNoteLink :path="CYCLE">dates</UiNoteLink>
    </div>
  </div>
</template>
