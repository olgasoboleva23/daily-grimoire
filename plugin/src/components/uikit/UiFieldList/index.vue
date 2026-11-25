<!-- A window's list of groups (block ui-field-list): v-model the groups (an array of objects), a
     × each and a + under them (`fresh()`: a new group); `fixed`: neither, the groups as given. One
     empty group to start when it is not fixed and empty, unless `startEmpty`. `name` is the
     heading row. With `columns` ({ key, name, title?, narrow?, wide? }) a table: one grid
     (--ui-field-list-cols: a `wide` column shares the width, the others fit what's in them), a
     line of the names (`title`: a checkbox's description, its tip; `narrow`: centred), then a
     line a group, a cell a column through the slot #<key>="{ group, index }"; a text box fills
     its cell, a pick there has no Clear. Without columns the groups are stacked, the default
     slot { group, index } in each (UiField rows). Its look: index.scss -->
<script setup>
import { computed, provide } from "vue";

const props = defineProps({
  name: { type: String, default: null },
  columns: { type: Array, default: null },
  fixed: { type: Boolean, default: false },
  startEmpty: { type: Boolean, default: false },
  fresh: { type: Function, default: () => ({}) },
});
const groups = defineModel({ type: Array, required: true });

if (!props.fixed && !props.startEmpty && !groups.value.length) groups.value = [props.fresh()];

const cols = computed(() => props.columns?.map(c => c.wide ? "minmax(0, 1fr)" : "auto")
  .concat(props.fixed ? [] : "auto").join(" "));
const cell = c => ["ui-field-list__cell", { "ui-field-list__cell--narrow": c.narrow }];
const add = () => { groups.value = [...groups.value, props.fresh()]; };

const remove = n => { groups.value = groups.value.filter((_, i) => i !== n); };

// UiFieldPick in a line has no Clear of its own: the line's × takes the group off
provide("inField", props.columns ? "cell" : null);
</script>

<template>
  <div v-if="name" class="setting-item">
    <div class="setting-item-info"><div class="setting-item-name">{{ name }}</div></div>
  </div>
  <div
    v-if="columns"
    class="ui-field-list ui-field-list--lines"
    :style="{ '--ui-field-list-cols': cols }"
  >
    <div v-if="groups.length" class="ui-field-list__line ui-field-list__line--head">
      <div
        v-for="c in columns"
        :key="c.key"
        :class="cell(c)"
        :title="c.title"
      >{{ c.name }}</div>
      <div v-if="!fixed" class="ui-field-list__cell ui-field-list__cell--narrow" />
    </div>
    <div v-for="(g, n) in groups" :key="n" class="ui-field-list__line">
      <div v-for="c in columns" :key="c.key" :class="cell(c)">
        <slot :name="c.key" :group="g" :index="n" />
      </div>
      <div v-if="!fixed" class="ui-field-list__cell ui-field-list__cell--narrow">
        <button title="Remove" @click="remove(n)">×</button>
      </div>
    </div>
  </div>
  <div v-else class="ui-field-list">
    <div v-for="(g, n) in groups" :key="n" class="ui-field-list__group">
      <slot :group="g" :index="n" />
      <button v-if="!fixed" title="Remove" @click="remove(n)">×</button>
    </div>
  </div>
  <div v-if="!fixed" class="ui-field-list__more">
    <button title="One more" @click="add">+</button>
  </div>
</template>
