<!-- ✦ Buy reward (the Buy reward command): a Name and a Cost in coins, Buy greyed until both.
     Logs the purchase (logPurchase) when the gold covers it and resolves true; when it doesn't,
     "Not enough gold" and resolves false (the window closes either way, as it always did) -->
<script setup>
import { Notice } from "obsidian";
import { computed, reactive } from "vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import { filled, useWrite } from "#/shared/ui/Window/index.ts";
import { logPurchase } from "#/controllers/widgets/shop.js";

const emit = defineEmits(["done"]);

const v = reactive({ name: "", cost: null });
const ready = computed(() => filled(v.name) && filled(v.cost));
const { busy, run } = useWrite(emit);

const buy = () => run(async () => {
  const bought = await logPurchase(v.name, v.cost);

  if (!bought) new Notice(`✦ Not enough gold for ${v.name}`);
  emit("done", bought);
});
</script>

<template>
  <UiWindow
    title="✦ Buy reward"
    submit="Buy"
    :ready="ready"
    :busy="busy"
    @submit="buy"
  >
    <UiField name="Name">
      <UiFieldText v-model="v.name" placeholder="what you bought" />
    </UiField>
    <UiField name="Cost">
      <UiFieldText v-model="v.cost" type="number" placeholder="coins" />
    </UiField>
  </UiWindow>
</template>
