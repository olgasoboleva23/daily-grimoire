<!-- Supplies: by category, each with how long since the last time (or that it's listed) and
     "running low" -->
<script setup>
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiEmpty from "#/components/uikit/UiEmpty/index.vue";
import UiGroupHeader from "#/components/uikit/UiGroupHeader.vue";
import { editMarketItem, runsLow } from "#/controllers/widgets/market.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="ui-supplies">
    <UiEmpty v-if="state.data.empty" text="Nothing bought twice yet" />
    <template v-for="g in state.data.groups" :key="g.label">
      <UiGroupHeader :label="g.label" />
      <div
        v-for="r in g.rows"
        :key="r.id ?? r.name"
        :class="['ui-supplies__row ui-row ui-gap-l', { 'ui-supplies__row--due': r.due }]"
      >
        <span class="ui-supplies__name ui-grow">{{ r.name }}</span>
        <span class="ui-supplies__info">{{ r.info }}</span>
        <UiButton v-if="r.id" title="edit item" @click="editMarketItem(r.id)">
          <span class="ui-pencil">✎</span>
        </UiButton>
        <UiButton
          v-if="!r.listed"
          kind="pill"
          @click="runsLow(r.name, r.tag, r.id)"
        >running low</UiButton>
      </div>
    </template>
  </div>
</template>
