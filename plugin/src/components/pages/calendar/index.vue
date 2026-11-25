<script setup>
import { projectStore } from "#/entities/project/index.js";
import { Notice } from "obsidian";
import { computed, markRaw, onActivated, provide, ref, watch } from "vue";
import { useLater, useNewDay, useRedraw } from "#/shared/lib/use.js";
import { app, tasksApi } from "#/shared/host/index.js";
import { useObsidian } from "#/shared/lib/vueApp.ts";
import { taskStore, T, findTask } from "#/entities/task/index.js";
import config from "#/shared/config/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { CalendarData, calendarTaskInfo } from "#/pages/calendar/index.js";
import { baseDate, shownDays } from "#/pages/calendar/index.js";
import { makeActions } from "#/controllers/calendar.js";
import { dragState } from "#/composables/drag.js";
import CalendarTab from "./CalendarTab/index.vue";

defineOptions({ name: "CalendarPage" });
const props = defineProps({ state: { type: Object, required: true } });
const state = props.state, owner = useObsidian(), root = ref(null), version = ref(0);
const data = computed(() => { void version.value; return markRaw(build()); });
const { redraw, catchUp } = useRedraw(owner,
  () => !!root.value?.isConnected && root.value.isShown(), () => { version.value++; });
owner.register(watch([taskStore.version, projectStore.version], redraw));
useNewDay(owner, redraw);
onActivated(catchUp);
const view = {
  state, waits: useLater(owner), drag: dragState(),
  get ctx() { return data.value; },
  get actions() { return data.value.actions; },
  info: t => calendarTaskInfo(t, data.value, app),
  task(key) {
    const t = data.value.model && findTask(key, data.value.model.all);

    if (!t) new Notice("✦ task changed, try again");
    return t;
  },
};
provide("calendar", view);

function build() {
  if (!taskStore.ready) return { say: "✦ reading the tasks…" };   // the store's first read draws
  const today = todayYmd(), days = shownDays(state, today);
  const { tasks, pool: poolLines } = taskStore;
  // the data, all of it or one area's tasks and pool items
  const data = (area) => new CalendarData({
    tasks: area ? tasks.filter((t) => T(t).area === area) : tasks,
    poolLines: area ? poolLines.filter((l) => l.rec.area === area) : poolLines,
    days, today, areaOrder: Object.keys(config.areaIcons), inProject: projectStore.inProject,
  });
  const ctx = {
    state, today, days, base: baseDate(state, today), view: state.view,
    shown: { open: true, ghost: true, done: state.showDone },
    model: data(state.area),
    everything: state.area ? data(null) : null,   // the tabs' counts, whatever tab is picked
    config, TASKS: tasksApi(), infos: new Map(),
  };
  ctx.actions = makeActions(ctx);
  return ctx;
}
</script>

<template>
  <div ref="root" class="ui-view__page markdown-preview-view markdown-rendered dashboard">
    <CalendarTab />
  </div>
</template>
