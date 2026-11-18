<!-- the cycles: when and how long, and a pill per day (its kind from cycle.js pill()) -->
<script setup>
defineProps({ rows: { type: Array, required: true } });
</script>

<template>
  <div class="ui-cycle__rows">
    <div v-for="r in rows" :key="r.start" class="ui-cycle__row">
      <div
        class="ui-cycle__when ui-flex ui-between ui-gap-s"
      ><span>{{ r.when }}</span><span>{{ r.length }}</span></div>
      <div class="ui-cycle__pills ui-flex ui-gap-2xs">
        <i v-for="(p, i) in r.pills" :key="i" :class="`ui-cycle__pill ui-cycle__pill--${p}`" />
      </div>
    </div>
  </div>
</template>
