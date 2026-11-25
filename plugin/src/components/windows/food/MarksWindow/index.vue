<!-- ✦ Marks (the food page's ⚙): the food marks as a table, a line each (Icon, Name), + one
     more, × one off. Save greyed until there is one and every line has both. Resolves true once
     saveMarks wrote (a mark keeps its tag, a new one gets the next) -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import UiFieldList from "#/shared/ui/UiFieldList/index.vue";
import { groupsFilled, useWrite } from "#/shared/ui/Window/index.ts";
import { saveMarks } from "#/entities/food-log/index.js";

const props = defineProps({
  marks: { type: Array, required: true },   // [{ tag, icon, name }]
});
const emit = defineEmits(["done"]);

const COLUMNS = [
  { key: "icon", name: "Icon", wide: true }, { key: "name", name: "Name", wide: true },
];
const v = reactive({ marks: props.marks.map(m => ({ ...m })) });
const ready = computed(() => groupsFilled(v.marks, ["icon", "name"]));
const { busy, run } = useWrite(emit);

const save = () => run(() => saveMarks(v.marks));
</script>

<template>
  <UiWindow
    title="✦ Marks"
    submit="Save"
    :ready="ready"
    :busy="busy"
    @submit="save"
  >
    <UiFieldList v-model="v.marks" name="Marks" :columns="COLUMNS">
      <template #icon="{ group }">
        <UiFieldText v-model="group.icon" placeholder="🍫" />
      </template>
      <template #name="{ group }">
        <UiFieldText v-model="group.name" placeholder="какао" />
      </template>
    </UiFieldList>
  </UiWindow>
</template>
