<!-- Regulars: by area, the most neglected first; paused last. ⏸ pause: drop its dates;
     ▶ resume: from today -->
<script setup>
import { computed, inject } from "vue";
import { vHoldAction } from "#/shared/lib/holdAction.js";
import UiButton from "#/shared/ui/UiButton/index.vue";
import GroupCard from "./GroupCard.vue";
import TaskText from "#/components/pages/calendar/TaskText.vue";
import TaskCard from "#/components/pages/calendar/TaskCard/index.vue";
import { T } from "#/entities/task/index.js";
import { dm } from "#/shared/lib/dates.js";
import { ruleText } from "#/entities/task/index.js";
import { byArea } from "#/helpers/panelGroups.js";

const RESUME = "resume: from today, on the first day its rule allows";
const view = inject("calendar");
const ctx = computed(() => view.ctx);
// paused / resumed at once (the panel's, kept across a tab switch)
const flipped = inject("flipped");

const groups = computed(() => {
  const { model, today, config } = ctx.value;

  return byArea(model.regulars, t => {
    const next = T(t).date, task = view.info(t), flip = flipped.has(task.key);
    const variants = T(t).variants, variant = T(t).currVariant;

    return {
      task, variants, name: T(t).name, flip, paused: flip ? !T(t).isPaused : !next,
      rule: `${ruleText(T(t).rule)}  ·  `,
      history: `  ·  ${model.regularHistory(t)}`,
      when: variants.length ? `next: ${variant} · ${next ? dm(next) : "⏸ paused"}`
        : next ? `next ${dm(next)}` : "⏸ paused",
      late: !!next && next < today,
      button: next ? { icon: "⏸", title: "pause: drop its dates" } : { icon: "▶", title: RESUME },
    };
  }, config);
});

// at once; the new data follows the write
const pause = c => {
  const t = view.task(c.task.key);

  if (!t) return;
  flipped.add(c.task.key);
  view.actions.pauseOrResume(t);
};
</script>

<template>
  <GroupCard v-for="g in groups" :key="g.key" :title="g.title">
    <TaskCard
      v-for="c in g.cards"
      :key="c.task.key"
      :task="c.task"
      :paused="c.paused"
    >
      <template v-if="c.variants.length" #text>
        <TaskText :task="{ ...c.task, text: c.name }" /> · {{ c.variants.join(" ↔ ") }}
      </template>
      <!-- one line: the rule, when (late: in red), the history; no spaces between them -->
      <template #meta>{{ c.rule }}<span
        v-if="c.late"
        class="ui-cal__late"
      >{{ c.when }}</span><span
        v-else
      >{{ c.when }}</span>{{ c.history }}</template>
      <template #extra>
        <UiButton
          v-hold-action="() => pause(c)"
          :title="c.button.title"
          :disabled="c.flip"
          @click="pause(c)"
        >{{ c.button.icon }}</UiButton>
      </template>
    </TaskCard>
  </GroupCard>
</template>
