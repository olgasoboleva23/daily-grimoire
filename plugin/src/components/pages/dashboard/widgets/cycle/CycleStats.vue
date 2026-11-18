<!-- the stats: the cycles' and the periods' lengths as columns, the average as a line across -->
<script setup>
defineProps({ charts: { type: Array, required: true } });
</script>

<template>
  <div v-for="c in charts" :key="c.kind" :class="`ui-cycle__chart ui-cycle__chart--${c.kind}`">
    <div
      class="ui-cycle__chart-title ui-flex ui-between"
    >{{ c.title }}<span class="ui-cycle__chart-avg">{{ c.avg }}</span></div>
    <div class="ui-cycle__cols">
      <b class="ui-cycle__avg-line" :style="`bottom: ${c.line}%`" />
      <i
        v-for="(col, i) in c.cols"
        :key="i"
        class="ui-cycle__col ui-grow"
        :style="`height: ${col.height}%`"
      >
        <span class="ui-cycle__col-value ui-text-center">{{ col.v }}</span>
      </i>
    </div>
  </div>
</template>
