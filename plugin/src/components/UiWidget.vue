<script>
// Preserve a page widget's height while its replacement loads.
const heights = new WeakMap();
</script>

<script setup>
import {
  nextTick, onMounted, onActivated, onErrorCaptured, provide, reactive, ref, watch,
} from "vue";
import { useObsidian } from "#/shared/lib/vueApp.ts";
import {
  useDataviewChanges, useFileChanges, useRedraw, useTabDate, useWhenIndexed,
} from "#/shared/lib/use.js";
import { app, blockDv } from "#/shared/host/index.js";
import { taskStore } from "#/store/tasks.js";
import { TASKS } from "#/shared/config/index.js";
import UiCard from "#/shared/ui/UiCard/index.vue";
import UiFailed from "#/shared/ui/UiFailed.vue";

const props = defineProps({ definition: { type: Object, required: true } });
const root = ref(null), owner = useObsidian(), state = reactive({ data: null, error: null });
const def = props.definition, sourcePath = def.note ?? "";
const kept = heights.get(def.view)?.get(sourcePath);
const el = () => root.value?.$el ?? root.value;
const retry = () => void refresh();
let runs = 0, gone = false;
owner.register(() => { gone = true; });
provide("sourcePath", sourcePath);
provide("retry", retry);
onErrorCaptured(error => { state.error = error.message; console.error(error); return false; });

async function refresh() {
  const n = ++runs;

  try {
    const data = await def.load({
      get dv() { return blockDv(sourcePath, el()); }, app, sourcePath,
    });

    if (gone || n !== runs) return;
    Object.assign(state, { data, error: null });
    await nextTick();
    if (gone || n !== runs) return;
    const body = el().querySelector(".ui-card__body") ?? el();

    if (!heights.has(def.view)) heights.set(def.view, new Map());
    heights.get(def.view).set(sourcePath, body.offsetHeight);
    el().dispatchEvent(new CustomEvent("ui-drawn", { bubbles: true }));
  } catch (error) {
    if (gone || n !== runs) return;
    console.error(error);
    state.error = error.message;
  }
}

let catchUp = () => {};

onActivated(() => catchUp());
onMounted(() => {
  if (def.follows === false) return retry();
  const redraws = useRedraw(owner, () => el().isConnected && el().isShown(), retry);
  const { redraw } = redraws;

  catchUp = redraws.catchUp;
  owner.registerEvent(app.workspace.on("ui:theme", redraw));
  const taskFiles = `${TASKS}/`, dataview = def.dataview;
  const native = def.watches?.filter(path => path !== taskFiles && !dataview?.includes(path));

  if (def.watches?.includes(taskFiles)) owner.register(watch(taskStore.version, redraw));
  if (native?.length || def.watchesNote) useFileChanges(owner, redraw, path =>
    native?.some(w => w.endsWith("/") ? path.startsWith(w) : path === w)
      || def.watchesNote?.(state.data, path), true);
  if (dataview?.length)
    useDataviewChanges(owner, redraw, { watched: path => dataview.includes(path) });

  useTabDate(owner, el(), retry);
  if (dataview) useWhenIndexed(owner, retry); else retry();
});
defineExpose({ state, refresh });
</script>

<template>
  <component
    :is="def.card ? UiCard : 'div'"
    ref="root"
    v-bind="definition.card"
    :class="def.bodyClass"
  >
    <template v-if="def.cardButton" #button><component :is="def.cardButton" /></template>
    <UiFailed v-if="state.error" :text="state.error" @retry="retry" />
    <div
      v-else-if="state.data === null"
      class="ui-card__skeleton"
      :style="kept ? { minHeight: `${kept}px` } : null"
    />
    <component :is="def.view" v-else :state="state" />
  </component>
</template>
