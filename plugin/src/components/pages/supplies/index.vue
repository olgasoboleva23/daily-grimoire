<!-- Supplies: by category, each with how long since the last time (or that it's listed) and
     "running low" -->
<script setup>
import UiButton from "#/shared/ui/UiButton/index.vue";
import UiEmpty from "#/shared/ui/UiEmpty/index.vue";
import UiGroupHeader from "#/shared/ui/UiGroupHeader.vue";
import { runsLow } from "#/controllers/widgets/market.js";
import { readMarks } from "#/entities/food-log/index.js";
import { openEditItem } from "#/entities/product/index.js";

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
        <UiButton v-if="r.id" title="edit item" @click="openEditItem(r.id, readMarks)">
          <span class="ui-pencil">✎</span>
        </UiButton>
        <UiButton
          v-if="!r.listed"
          kind="pill"
          @click="runsLow(r.name, r.type, r.id)"
        >running low</UiButton>
      </div>
    </template>
  </div>
</template>
