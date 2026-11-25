<!-- All dashboard tabs show one Pomodoro session. The clock sleeps when the last view closes
     and resumes from the session's start time on remount. Each view keeps its own ring toggle. -->
<script>
import { reactive } from "vue";
import { Notice } from "obsidian";
import { Timer } from "#/models/timer.js";
import { app, keepAwake } from "#/shared/host/index.js";
import { bell, ding, save as write, syncMusic } from "#/controllers/widgets/pomodoro.js";

const MODE = { focus: "Focus", break: "Break", meditation: "Meditation" };
const shown = reactive({});
let timer, sessionApp, views = 0, ending = 0, every = 0;

function tick() {
  const { filled, sets } = timer.stars, meditation = timer.type === "meditation";
  const { focusMin, breakMin, meditationMin } = timer.settings;

  Object.assign(shown, {
    time: timer.clock,
    p: 1 - timer.remaining / timer.duration,
    mode: MODE[timer.type],
    session: meditation ? "" : `Session ${timer.sessions + 1}`,
    lengths: meditation ? `${meditationMin}m` : `${focusMin}m · ${breakMin}m`,
    meditation,
    running: timer.running,
    filled,
    sets: sets > 0 ? `×${sets}` : "",
  });
  void keepAwake(timer.running);
  void syncMusic(timer);
}

const save = (min = 0, kind = "focus", mini) =>
  write({ settings: timer.settings, current: timer.current, mini }, min, kind);

function arm() {
  window.clearTimeout(ending);
  if (timer.running) ending = window.setTimeout(finish, timer.remaining);
  tick();
}

async function finish() {
  const was = timer.type, min = was === "break" ? 0 : timer.duration / 60_000;

  timer.next();
  if (was === "meditation") bell();
  else { ding(timer.type === "focus" ? 1.0 : 0.8); timer.play(); }

  arm();
  await save(min, was).catch(e => {
    console.error(e);
    new Notice("Pomodoro: not saved, the next save will try again");
  });
}

const back = () => document.hidden || tick();

function mountSession(saved, current) {
  if (views++) return;
  if (app !== sessionApp || !timer?.running) timer = new Timer(saved.settings, current);
  sessionApp = app;
  arm();
  every = window.setInterval(tick, 1000);
  document.addEventListener("visibilitychange", back);
  window.addEventListener("focus", tick);
}

function unmountSession() {
  if (--views) return;
  void keepAwake(false);
  window.clearInterval(every);
  window.clearTimeout(ending);
  document.removeEventListener("visibilitychange", back);
  window.removeEventListener("focus", tick);
}

function act(change) {
  change(timer);
  arm();
  return save();
}
</script>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { openWindow } from "#/components/uikit/Window/open.ts";
import PomodoroWindow from "#/components/windows/pomodoro/PomodoroWindow/index.vue";
import PomodoroMini from "./PomodoroMini.vue";
import PomodoroRing from "./PomodoroRing.vue";

const props = defineProps({ state: { type: Object, required: true } });
const { saved, current } = props.state.data;
const mini = ref(saved.mini ?? true);

const play = () => act(t => t.running ? t.pause() : t.play());
const reset = () => act(t => t.reset());
const skip = () => act(t => t.reset(t.other));
const switchMode = () => act(t => t.reset(t.type === "meditation" ? "focus" : "meditation"));
const toggle = () => { mini.value = !mini.value; return save(0, "focus", mini.value); };

async function gear() {
  const settings = await openWindow(PomodoroWindow, { settings: timer.settings });

  if (settings) await act(t => { t.settings = settings; t.reset(); });
}

onMounted(() => mountSession(saved, current));
onBeforeUnmount(unmountSession);
</script>

<template>
  <div :class="['ui-pomodoro', { 'ui-pomodoro--mini': mini }]">
    <PomodoroMini :shown="shown" @toggle="toggle" @play="play" />
    <PomodoroRing
      :shown="shown"
      @toggle="toggle"
      @play="play"
      @reset="reset"
      @skip="skip"
      @gear="gear"
      @mode="switchMode"
    />
  </div>
</template>
