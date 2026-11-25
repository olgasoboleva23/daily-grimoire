<!-- 🛒 To the shopping list? (the recipes page's and a dish's window's 🛒): the dish, then a fixed
     table, a line a product (Buy, the product, its amount): the main ones ticked, an
     alternative's products under theirs (↳) unticked: tick what you'll cook with, untick what's
     at home, change an amount. Add puts the ticked ones on the list, each with the dish and its
     amount (productsToList), and says how many went on and how many were there already (those
     got the amount); nothing ticked: the notice, the window stays. Resolves { added, joined } -->
<script setup>
import { reactive } from "vue";
import { Notice } from "obsidian";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import UiField from "#/components/uikit/UiField/index.vue";
import UiFieldText from "#/components/uikit/UiFieldText/index.vue";
import UiFieldList from "#/components/uikit/UiFieldList/index.vue";
import { useWrite } from "#/components/uikit/UiWindow/write.js";
import { productsToList } from "#/controllers/dishes.js";

// loadRecipes's: { name, ingredients: [{ item, amount, name, alt: [{ item, amount, name }] }] }
const props = defineProps({ dish: { type: Object, required: true } });
const emit = defineEmits(["done"]);

const COLUMNS = [
  { key: "on", name: "Buy", title: "", narrow: true }, { key: "name", name: "Product" },
  { key: "amount", name: "Amount", wide: true },
];
const v = reactive({ lines: props.dish.ingredients.flatMap(i => [
  { item: i.item, on: true, name: i.name, amount: i.amount },
  ...i.alt.map(a => ({ item: a.item, on: false, name: `↳ ${a.name}`, amount: a.amount })),
]) });
const { busy, run } = useWrite(emit);

const add = () => run(async () => {
  const lines = v.lines.filter(l => l.on)
    .map(l => ({ item: l.item, amount: l.amount?.trim() ?? "", dish: props.dish.name }));

  if (!lines.length) return void new Notice("✦ nothing ticked, nothing added");
  const counts = await productsToList(lines);
  const { added, joined } = counts;
  const said = [added && `${added} → Celestial Market`, joined && `${joined} on the list already`];

  new Notice(`✦ ${said.filter(Boolean).join(", ") || "all of it is on the list already"}`
    + (joined ? " (amount added)" : ""));
  return counts;
});
</script>

<template>
  <UiWindow
    title="To the shopping list?"
    submit="Add"
    :busy="busy"
    @submit="add"
  >
    <UiField name="Dish" :text="dish.name" />
    <UiFieldList
      v-model="v.lines"
      name="Products"
      :columns="COLUMNS"
      fixed
    >
      <template #on="{ group }">
        <input v-model="group.on" type="checkbox" aria-label="Buy">
      </template>
      <template #name="{ group }">
        <span class="ui-field__label">{{ group.name }}</span>
      </template>
      <template #amount="{ group }">
        <UiFieldText v-model="group.amount" placeholder="500 г" />
      </template>
    </UiFieldList>
  </UiWindow>
</template>
