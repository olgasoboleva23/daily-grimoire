<!-- a free journal: a level 0–3 and today's reasons (v-model:level, v-model:reasons), each click
     saved (@save), the 30 days' bars, ✦ list (its note), 🗑 (@delete) -->
<script setup>
import UiButton from "#/shared/ui/UiButton/index.vue";
import UiChart from "#/shared/ui/UiChart/index.vue";
import UiNoteLink from "#/shared/ui/UiNoteLink.vue";

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
  <div class="ui-weight__log">
    <div class="ui-weight__log-row ui-flex ui-wrap ui-gap-s">
      <UiButton
        v-for="n in [0, 1, 2, 3]"
        :key="n"
        kind="toggle"
        :on="level === n"
        @click="set(n)"
      >{{ n }}</UiButton>
    </div>
    <div class="ui-weight__log-row ui-flex ui-wrap ui-gap-s">
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
  <div class="ui-row ui-gap-s">
    <UiNoteLink :path="log.path" class="ui-weight__list">✦ list</UiNoteLink>
    <UiButton
      title="delete the journal"
      class="ui-weight__delete"
      @click="$emit('delete')"
    >🗑</UiButton>
  </div>
</template>
