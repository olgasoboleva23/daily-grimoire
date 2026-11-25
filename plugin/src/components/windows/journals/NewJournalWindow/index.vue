<!-- ✦ New journal (the New journal command, the weight card's ＋): a Title, the Reasons (a line
     each, + one more, × one off; empty ones dropped by the write), the Days after a meal its
     level is looked at on the food page (0). Create greyed until a title. Resolves the new
     journal's file (createJournal) -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import UiField from "#/components/uikit/UiField/index.vue";
import UiFieldText from "#/components/uikit/UiFieldText/index.vue";
import UiFieldList from "#/components/uikit/UiFieldList/index.vue";
import { filled } from "#/components/uikit/UiWindow/ready.js";
import { useWrite } from "#/components/uikit/UiWindow/write.js";
import { createJournal } from "#/controllers/journals.js";

const emit = defineEmits(["done"]);

const REASONS = [{ key: "reason", name: "Reason", wide: true }];
const v = reactive({ title: "", reasons: [], lag: 0 });
const ready = computed(() => filled(v.title));
const { busy, run } = useWrite(emit);

const create = () => run(() => createJournal({
  title: v.title, reasons: v.reasons.map(g => g.reason ?? ""), lag: v.lag ?? 0,
}));
</script>

<template>
  <UiWindow
    title="✦ New journal"
    submit="Create"
    :ready="ready"
    :busy="busy"
    @submit="create"
  >
    <UiField name="Title">
      <UiFieldText v-model="v.title" placeholder="Высыпания" />
    </UiField>
    <UiFieldList v-model="v.reasons" name="Reasons" :columns="REASONS">
      <template #reason="{ group }">
        <UiFieldText v-model="group.reason" placeholder="🍰 сладкое" />
      </template>
    </UiFieldList>
    <UiField name="Days after a meal">
      <UiFieldText v-model="v.lag" type="number" placeholder="0" />
    </UiField>
  </UiWindow>
</template>
