<!-- Instead of … (the dish form's Or on an ingredient's line): the products that can stand in for
     it, a table (Product: picked or edited through the dish form's `pick`, shown by its `show`;
     Amount), + one more, × one off. OK resolves the lines with a product ([{ item, amount }]);
     the dish form keeps them on the line, the dish's write saves them -->
<script setup>
import { reactive } from "vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import UiFieldPick from "#/shared/ui/UiFieldPick/index.vue";
import UiFieldList from "#/shared/ui/UiFieldList/index.vue";

const props = defineProps({
  item: { type: String, default: null },     // the ingredient's name (none picked yet: …)
  alt: { type: Array, default: () => [] },   // [{ item, amount }]
  pick: { type: Function, required: true },  // a line → its product's id (null: kept)
  show: { type: Function, required: true },  // a product's id → its name
});
const emit = defineEmits(["done"]);

const COLUMNS = [
  { key: "item", name: "Product", wide: true }, { key: "amount", name: "Amount", wide: true },
];
const v = reactive({ alt: props.alt.map(({ item, amount }) => ({ item, amount })) });

const ok = () => emit("done", v.alt.filter(line => line.item));
</script>

<template>
  <UiWindow :title="`Instead of ${item ?? '…'}`" submit="OK" @submit="ok">
    <UiFieldList v-model="v.alt" name="Products" :columns="COLUMNS">
      <template #item="{ group }">
        <UiFieldPick v-model="group.item" :pick="() => pick(group)" :show="show" />
      </template>
      <template #amount="{ group }">
        <UiFieldText v-model="group.amount" placeholder="500 г" />
      </template>
    </UiFieldList>
  </UiWindow>
</template>
