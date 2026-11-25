<!-- ✦ New link (opened by a project page's + link): a title (empty: the URL) and a URL, Add greyed
     until the URL. Resolves true once addLink wrote; not a web address: its notice, the window
     stays -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import UiField from "#/components/uikit/UiField/index.vue";
import UiFieldText from "#/components/uikit/UiFieldText/index.vue";
import { filled } from "#/components/uikit/UiWindow/ready.js";
import { useWrite } from "#/components/uikit/UiWindow/write.js";
import { addLink } from "#/controllers/projects.js";

const props = defineProps({ project: { type: String, required: true } });
const emit = defineEmits(["done"]);

const v = reactive({ title: "", url: "" });
const ready = computed(() => filled(v.url));
const { busy, run } = useWrite(emit);
</script>

<template>
  <UiWindow
    title="✦ New link"
    submit="Add"
    :ready="ready"
    :busy="busy"
    @submit="run(() => addLink(props.project, v))"
  >
    <UiField name="Title">
      <UiFieldText v-model="v.title" placeholder="what it is" />
    </UiField>
    <UiField name="URL">
      <UiFieldText v-model="v.url" placeholder="https://…" />
    </UiField>
  </UiWindow>
</template>
