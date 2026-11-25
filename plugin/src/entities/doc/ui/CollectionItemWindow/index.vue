<!-- ✦ New watch item / New read item / New game (the commands of the same names): Title, a Type
     (watch, read) or a Genre (game), the Status (its first lit), a Rating 1–10 (optional: rated
     later). Create greyed until a title, a status and a type. Resolves the new note's file
     (createDoc, in `dir`); the command opens it -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import UiFieldChoice from "#/shared/ui/UiFieldChoice/index.vue";
import { filled, useWrite } from "#/shared/ui/Window/index.ts";
import { createDoc } from "../../model/doc.js";
import { KINDS } from "../../model/kind.js";

const props = defineProps({
  kind: { type: String, required: true },   // watch, read, game
  dir: { type: String, required: true },
});
const emit = defineEmits(["done"]);

const kind = KINDS[props.kind];
const RATINGS = Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
const v = reactive({
  title: "", media_type: null, genre: null, status: kind.statuses[0].value, rating: null,
});
const ready = computed(() =>
  filled(v.title) && filled(v.status) && (!kind.types || filled(v.media_type)));
const { busy, run } = useWrite(emit);
</script>

<template>
  <UiWindow
    :title="`✦ ${kind.name}`"
    submit="Create"
    :ready="ready"
    :busy="busy"
    @submit="run(() => createDoc(kind, v, props.dir))"
  >
    <UiField name="Title">
      <UiFieldText v-model="v.title" placeholder="title" />
    </UiField>
    <UiField v-if="kind.types" name="Type">
      <UiFieldChoice v-model="v.media_type" :choices="kind.types" />
    </UiField>
    <UiField v-else name="Genre">
      <UiFieldText v-model="v.genre" placeholder="optional" />
    </UiField>
    <UiField name="Status">
      <UiFieldChoice v-model="v.status" :choices="kind.statuses" />
    </UiField>
    <UiField name="Rating">
      <UiFieldChoice v-model="v.rating" :choices="RATINGS" />
    </UiField>
  </UiWindow>
</template>
