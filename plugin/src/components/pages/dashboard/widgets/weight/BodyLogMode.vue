<!-- a free journal: a level 0–3 and today's reasons (v-model:level, v-model:reasons), each click
     saved (@save), the 30 days' bars, ✦ list (its note), 🗑 (@delete) -->
<script setup>
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiChart from "#/components/uikit/UiChart/index.vue";
import UiNoteLink from "#/components/uikit/UiNoteLink.vue";

defineProps({ log: { type: Object, required: true } });
const emit = defineEmits(["save", "delete"]);
const level = defineModel("level", { type: Number, default: null });
const reasons = defineModel("reasons", { type: Array, default: () => [] });

// a level, a reason (on, again: off): saved at once
const set = n => { level.value = n; emit("save"); };

const pick = r => {
  const list = reasons.value;

  reasons.value = list.includes(r) ? list.filter(x => x !== r) : [...list, r];
  emit("save");
};
</script>

<template>
  <div class="winx-weight__log">
    <div class="winx-weight__log-row winx-flex winx-wrap winx-gap-s">
      <UiButton
        v-for="n in [0, 1, 2, 3]"
        :key="n"
        kind="toggle"
        :on="level === n"
        @click="set(n)"
      >{{ n }}</UiButton>
    </div>
    <div class="winx-weight__log-row winx-flex winx-wrap winx-gap-s">
      <UiButton
        v-for="r in log.reasons"
        :key="r"
        kind="toggle"
        :on="reasons.includes(r)"
        @click="pick(r)"
      >{{ r }}</UiButton>
    </div>
  </div>
  <UiChart :config="log.chart" />
  <div class="winx-row winx-gap-s">
    <UiNoteLink :path="log.path" class="winx-weight__list">✦ list</UiNoteLink>
    <UiButton
      title="delete the journal"
      class="winx-weight__delete"
      @click="$emit('delete')"
    >🗑</UiButton>
  </div>
</template>
