<!-- ✦ Pomodoro & Meditation (the pomodoro's ⚙): the Focus, Break and Meditation lengths in
     minutes (a line before Meditation), its Music ("—": none). Save greyed while a length is
     empty or not above 0. Resolves the settings with these four changed (nothing written: the
     widget applies them) -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import UiField from "#/components/uikit/UiField/index.vue";
import UiFieldText from "#/components/uikit/UiFieldText/index.vue";
import UiFieldChoice from "#/components/uikit/UiFieldChoice/index.vue";
import { MUSIC } from "#/controllers/widgets/pomodoro.js";

const props = defineProps({ settings: { type: Object, required: true } });
const emit = defineEmits(["done"]);

const MUSICS = [
  { label: "—", value: null },
  ...Object.entries(MUSIC).map(([value, label]) => ({ label, value })),
];
const { focusMin, breakMin, meditationMin, music } = props.settings;
const v = reactive({ focusMin, breakMin, meditationMin, music: music ?? null });
const ready = computed(() => [v.focusMin, v.breakMin, v.meditationMin]
  .every(min => Number.isFinite(min) && min > 0));
</script>

<template>
  <UiWindow
    title="✦ Pomodoro & Meditation"
    submit="Save"
    :ready="ready"
    @submit="emit('done', { ...props.settings, ...v })"
  >
    <UiField name="Focus">
      <UiFieldText v-model="v.focusMin" type="number" placeholder="minutes" />
    </UiField>
    <UiField name="Break">
      <UiFieldText v-model="v.breakMin" type="number" placeholder="minutes" />
    </UiField>
    <hr>
    <UiField name="Meditation">
      <UiFieldText v-model="v.meditationMin" type="number" placeholder="minutes" />
    </UiField>
    <UiField name="Music">
      <UiFieldChoice v-model="v.music" :choices="MUSICS" />
    </UiField>
  </UiWindow>
</template>
