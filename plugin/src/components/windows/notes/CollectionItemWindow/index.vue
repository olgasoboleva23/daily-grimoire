<!-- ✦ New watch item / New read item / New game (the commands of the same names): Title, a Type
     (watch, read) or a Genre (game), the Status (its first lit), a Rating 1–10 (optional: rated
     later). Create greyed until a title, a status and a type. Resolves the new note's file
     (createNote, in `dir`); the command opens it -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import UiField from "#/components/uikit/UiField/index.vue";
import UiFieldText from "#/components/uikit/UiFieldText/index.vue";
import UiFieldChoice from "#/components/uikit/UiFieldChoice/index.vue";
import { filled } from "#/components/uikit/UiWindow/ready.js";
import { useWrite } from "#/components/uikit/UiWindow/write.js";
import { createNote } from "#/controllers/notes.js";
import { KINDS } from "#/models/kinds.js";

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
    @submit="run(() => createNote(kind, v, props.dir))"
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
