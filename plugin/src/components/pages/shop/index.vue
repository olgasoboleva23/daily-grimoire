<!-- Shop: the gold balance and the rewards; an affordable one is bought with a click, the rest are
     greyed out -->
<script setup>
import { inject } from "vue";
import { buy as logBuy } from "#/controllers/widgets/shop.js";

defineProps({ state: { type: Object, required: true } });
// drawn again at once: the host's load (the balance), as before
const retry = inject("retry");
const buy = async i => { if (await logBuy(i.name, i.cost)) retry(); };
</script>

<template>
  <div class="ui-shop__balance ui-center ui-gap-l">
    <span class="ui-shop__balance-icon">✨</span>
    <span>Gold</span>
    <span class="ui-shop__balance-amount">{{ state.data.balance }}</span>
  </div>
  <div class="ui-shop__items ui-col ui-gap-xl">
    <button
      v-for="i in state.data.items"
      :key="i.name"
      class="ui-shop__item"
      :disabled="!i.affordable"
      @click="buy(i)"
    >
      <span class="ui-shop__item-name">{{ i.name }}</span>
      <span class="ui-shop__item-cost">{{ i.cost }} ✨</span>
    </button>
  </div>
</template>
