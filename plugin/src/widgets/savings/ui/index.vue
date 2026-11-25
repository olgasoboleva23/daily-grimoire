<!-- Savings: a jar per goal (its picture greyed above what's saved, the bar, a ✦ stamp per
     deposit), the payday's "put in" with ✓ done until the deposit is in, the next paydays -->
<script setup>
import UiButton from "#/shared/ui/UiButton/index.vue";
import UiEmpty from "#/shared/ui/UiEmpty/index.vue";
import { askValue } from "#/shared/ui/Window/index.ts";
import { deposit, paydaySum } from "../model/repository/savings.js";

defineProps({ state: { type: Object, required: true } });

// ✓ done: the jar's per_payday; without one ("your part") the sum is asked
async function done(path) {
  const sum = paydaySum(path) ?? await askValue({ title: "✦ Deposit", name: "Sum", type: "number",
    placeholder: "how much", required: true, submit: "Put in" });

  if (sum !== null) await deposit(path, sum);
}
</script>

<template>
  <UiEmpty v-if="!state.data.jars.length" :text="state.data.empty" />
  <div v-else class="ui-savings">
    <div v-for="j in state.data.jars" :key="j.path" class="ui-jar">
      <div class="ui-jar__goal ui-row ui-gap-xl">
        <div class="ui-jar__pic">
          <template v-if="j.img">
            <img class="ui-jar__img" :src="j.img" alt="">
            <img
              class="ui-jar__img ui-jar__img--grey"
              :src="j.img"
              alt=""
              :style="j.greyed"
            >
          </template>
        </div>
        <div>
          <div class="ui-jar__name">✦ {{ j.name }}</div>
          <div class="ui-jar__big">{{ j.big }}</div>
          <div class="ui-jar__note">{{ j.note }}</div>
        </div>
      </div>
      <div v-if="j.fill !== null" class="ui-jar__bar">
        <i class="ui-jar__fill" :style="`width: ${j.fill}%`" />
      </div>
      <div class="ui-jar__stamps ui-flex ui-wrap ui-gap-s">
        <span
          v-for="(on, i) in j.stamps"
          :key="i"
          :class="['ui-jar__stamp ui-center', { 'ui-jar__stamp--on': on }]"
        >✦</span>
      </div>
      <div v-if="j.due" class="ui-jar__due ui-row ui-between ui-gap-m">
        <span>{{ j.due.when }}: <b class="ui-jar__due-sum">put in {{ j.due.sum }}</b></span>
        <UiButton kind="pill" @click="done(j.path)">✓ done</UiButton>
      </div>
      <div class="ui-jar__next ui-text-center">next payday: {{ j.next }}</div>
    </div>
  </div>
</template>
