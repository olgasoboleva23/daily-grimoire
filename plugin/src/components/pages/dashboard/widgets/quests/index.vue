<!-- Quests: the tab's day, what is left of its plan (open tasks due that day), then what was done
     that day; a box ticks a task through the Tasks plugin, a done one's box takes it back -->
<script setup>
import UiCheckbox from "#/components/uikit/UiCheckbox/index.vue";
import UiEmpty from "#/components/uikit/UiEmpty/index.vue";
import { tickTask } from "#/controllers/tasks.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="ui-quests">
    <UiEmpty
      v-if="!state.data.open.length && !state.data.done.length"
      text="Nothing planned for this day"
    />
    <div
      v-for="r in [...state.data.open, ...state.data.done]"
      :key="r.key"
      class="ui-quests__row ui-row ui-gap-s"
      :class="r.done && 'ui-quests__row--done'"
    >
      <UiCheckbox
        :mark="r.done ? '✅' : '☐'"
        size="s"
        @tick="tickTask(r.t)"
      />
      <span class="ui-quests__label">{{ r.label }}</span>
    </div>
  </div>
</template>
