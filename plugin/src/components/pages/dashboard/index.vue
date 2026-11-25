<script setup>
import { computed, ref, watch } from "vue";
import { Platform } from "obsidian";
import config, { themeLabels, DATA, POMODORO } from "#/shared/config/index.js";
import { taskStore } from "#/store/tasks.js";
import { app } from "#/shared/host/index.js";
import { useObsidian } from "#/shared/lib/vueApp.ts";
import { useBusy, useNewDay } from "#/shared/lib/use.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { blocks } from "#/controllers/blocks.js";
import Widget from "#/components/UiWidget.vue";
import UiCard from "#/shared/ui/UiCard/index.vue";
import DashboardDate from "./DashboardDate.vue";

defineOptions({ name: "DashboardPage" });
const props = defineProps({ state: { type: Object, required: true } });
const state = props.state;
const root = ref(null), owner = useObsidian(), today = ref(todayYmd());
const date = computed(() => state.date ?? today.value);
const go = day => { state.date = day === today.value ? null : day; };

useNewDay(owner, day => { today.value = day; });
watch(date, () => app.workspace.trigger("ui:date"), { flush: "post" });
useBusy(owner, path => path !== POMODORO && path.startsWith(`${DATA}/`),
  () => root.value, "ui-dash--busy");
const drawn = () => root.value.classList.remove("ui-dash--busy");
const columns = computed(() => {
  taskStore.version.value;
  return [
    [["levelToday", "Level"], ["cycle", "Cycle"], ["pomodoro", "Pomodoro"], ["goals", "Goals"]],
    [["lifeAreas", "Life Areas"], ["weight", "Weight"]],
    [["xpToday", "XP Today"], ["quests", "Quests", "scroll"],
      ["celestialMarket", themeLabels(config.theme).market, "scroll"]],
  ];
});
</script>

<template>
  <div
    ref="root"
    class="ui-view__page markdown-preview-view markdown-rendered dashboard ui-dash"
    :data-date="date"
    @ui-drawn="drawn"
  >
    <div class="ui-busy">
      <div class="ui-busy__pill" title="saving…"><span class="ui-busy__star">✦</span></div>
    </div>
    <div class="ui-dash__content">
      <div class="ui-dash__top">
        <div class="ui-dash__date ui-nav ui-row ui-gap-l">
          <DashboardDate
            :date="date"
            :today="today"
            :phone="Platform.isMobile"
            @go="go"
          />
        </div>
        <Widget :definition="blocks.dailyNote" />
      </div>
      <div class="ui-dash__columns">
        <div v-for="(column, i) in columns" :key="i" class="ui-dash__column">
          <Widget
            v-for="[key, title, meta] in column"
            :key="key"
            :definition="{ ...blocks[key], card: { title, meta: meta ? [meta] : [] } }"
          />
          <UiCard v-if="i === 2" title="Finance" class="ui-dash__finance">
            <Widget :definition="blocks.financeMonth" />
            <Widget :definition="blocks.savings" />
          </UiCard>
        </div>
      </div>
    </div>
  </div>
</template>
