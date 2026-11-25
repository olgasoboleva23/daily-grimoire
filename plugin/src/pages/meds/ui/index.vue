<!-- The Medication Vue page: a tab per course of courses.json
     (running first, then the newest start), the picked one below it (MedsCourse); no course yet:
     how to make one -->
<script setup>
import { computed, ref } from "vue";
import UiEmpty from "#/shared/ui/UiEmpty/index.vue";
import UiTabs from "#/shared/ui/UiTabs/index.vue";
import { APP_NAME } from "#/shared/config/index.js";
import MedsCourse from "./MedsCourse/index.vue";

const props = defineProps({ state: { type: Object, required: true } });
const list = computed(() => props.state.data.list);
// the tab picked; the first one until then, or when the picked course is gone
const chosen = ref(null);
const picked = computed({
  get: () => (list.value.some(c => c.id === chosen.value) ? chosen.value : list.value[0]?.id),
  set: id => { chosen.value = id; },
});
</script>

<template>
  <UiEmpty
    v-if="!list.length"
    on-background
    :text="`No courses yet: ${APP_NAME}: New medication course`"
  />
  <div v-else>
    <!-- one row, sideways scroll -->
    <UiTabs
      v-model="picked"
      :tabs="list.map(c => ({ key: c.id, text: c.label, title: c.title }))"
      on-background
      scroll
    />
    <MedsCourse
      :id="picked"
      :course="state.data.data[picked]"
      :notes="state.data.notes[picked]"
      :intake="state.data.intake[picked]"
    />
  </div>
</template>
