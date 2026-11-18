<!-- "✦ Open": the day's note (made if it's missing) -->
<script setup>
import { ref } from "vue";
import { isMuted, toggleMute } from "#/helpers/sounds.js";
import UiButton from "#/components/uikit/UiButton/index.vue";
import { openDaily } from "#/controllers/widgets/dailyNote.js";

defineProps({ state: { type: Object, required: true } });
const muted = ref(isMuted());
const mute = () => { toggleMute(); muted.value = isMuted(); };
</script>

<template>
  <div class="ui-row ui-gap-s">
    <UiButton
      kind="chip"
      title="sounds on/off"
      :aria-pressed="muted"
      @click="mute"
    >
      {{ muted ? "🔇" : "🔊" }}
    </UiButton>
    <UiButton
      v-if="state.data.date"
      kind="pill"
      title="open the day's note"
      @click="openDaily(state.data.date)"
    >
      {{ state.data.text }}
    </UiButton>
  </div>
</template>
