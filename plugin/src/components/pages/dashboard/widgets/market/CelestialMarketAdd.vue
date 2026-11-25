<!-- the ＋ by Celestial Market's card title: a new item from the search -->
<script setup>
import UiButton from "#/shared/ui/UiButton/index.vue";
import { addMarketItem } from "#/components/windows/market/MarketItemWindow/open.js";
</script>

<template>
  <UiButton
    kind="add"
    title="add item"
    class="ui-card__add"
    @click="addMarketItem()"
  >+</UiButton>
</template>
