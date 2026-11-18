<!-- the ＋ by Celestial Market's card title: a new item from the search -->
<script setup>
import UiButton from "#/components/uikit/UiButton/index.vue";
import { addMarketItem } from "#/controllers/widgets/market.js";
</script>

<template>
  <UiButton
    kind="add"
    title="add item"
    class="ui-card__add"
    @click="addMarketItem()"
  >+</UiButton>
</template>
