<!-- Supplies: by category, each with how long since the last time (or that it's listed) and
     "running low" -->
<script setup>
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiEmpty from "#/components/uikit/UiEmpty/index.vue";
import UiGroupHeader from "#/components/uikit/UiGroupHeader.vue";
import { runsLow } from "#/controllers/widgets/market.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="winx-supplies">
    <UiEmpty v-if="state.data.empty" text="Nothing bought twice yet" />
    <template v-for="g in state.data.groups" :key="g.label">
      <UiGroupHeader :label="g.label" />
      <div
        v-for="r in g.rows"
        :key="r.id ?? r.name"
        :class="['winx-supplies__row winx-row winx-gap-l', { 'winx-supplies__row--due': r.due }]"
      >
        <span class="winx-supplies__name winx-grow">{{ r.name }}</span>
        <span class="winx-supplies__info">{{ r.info }}</span>
        <UiButton
          v-if="!r.listed"
          kind="pill"
          @click="runsLow(r.name, r.tag, r.id)"
        >running low</UiButton>
      </div>
    </template>
  </div>
</template>
