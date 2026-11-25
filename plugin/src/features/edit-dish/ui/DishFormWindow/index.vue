<!-- A dish's form, new or edit (opened by open.js): Name, the Ingredients (a table: Product, Or,
     Amount; + one more, × one off), Type (— none, or one of ⚙ Settings' dish types), Note (the
     recipe note: any note, or a new one from the recipe template). A line's product: none yet,
     the product search (+ new → New product); chosen, its Edit item window, its name read again.
     Or: the products that can stand in for it, in their own window (AlternativesWindow). Save
     greyed until a name and every line has a product. Resolves the dish's id (addDish; editDish
     against `before`: the dish as it was on disk when the window opened) -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/shared/ui/UiWindow/index.vue";
import UiField from "#/shared/ui/UiField/index.vue";
import UiFieldText from "#/shared/ui/UiFieldText/index.vue";
import UiFieldChoice from "#/shared/ui/UiFieldChoice/index.vue";
import UiFieldPick from "#/shared/ui/UiFieldPick/index.vue";
import UiFieldList from "#/shared/ui/UiFieldList/index.vue";
import { filled, groupsFilled, useWrite, openWindow } from "#/shared/ui/Window/index.ts";
import { readMarks } from "#/entities/food-log/index.js";
import { openEditItem, pickOrAddProduct, readMarketItem } from "#/entities/product/index.js";
import AlternativesWindow from "../AlternativesWindow/index.vue";
import { addDish, editDish } from "#/entities/dish/index.js";
import { noteName, pickRecipeNote } from "../pickRecipeNote.js";

const props = defineProps({
  id: { type: String, default: null },            // edit: its id
  dish: { type: Object, default: () => ({}) },     // the record, or { name } for a new one
  before: { type: String, default: null },         // edit: the record as read, JSON
  products: { type: Map, required: true },         // the food products' names by id
  types: { type: Array, required: true },          // [{ label, value }]: ⚙ Settings' dish types
});
const emit = defineEmits(["done"]);

const COLUMNS = [
  { key: "item", name: "Product", wide: true }, { key: "alt", name: "Or", wide: true },
  { key: "amount", name: "Amount", wide: true },
];
const TYPES = [{ label: "—", value: "" }, ...props.types];
const names = reactive(new Map(props.products));
const d = props.dish;
const v = reactive({
  name: d.name ?? "",
  ingredients: (d.ingredients ?? []).map(({ item, amount, alt }) => ({
    item, amount, alt: Array.isArray(alt) ? alt.map(a => ({ ...a })) : [],
  })),
  type: props.types.some(t => t.value === d.type) ? d.type : "",
  link: d.link ?? "",
});
const ready = computed(() => filled(v.name) && groupsFilled(v.ingredients, ["item"]));
const { busy, run } = useWrite(emit);

const show = id => names.get(id) ?? id;
const showAlt = alt => alt.map(a => show(a.item)).join(" + ");
const named = async id => {
  names.set(id, (await readMarketItem(id))?.name ?? id);
  return id;
};

// a line's product: chosen, its own Edit item window (its name read again after); none yet, the
// product search
async function product(line) {
  if (line.item) {
    await openEditItem(line.item, readMarks);
    return named(line.item);
  }

  const id = await pickOrAddProduct(readMarks);

  return id && !names.has(id) ? named(id) : id;
}

const alternatives = line => openWindow(AlternativesWindow, {
  item: line.item ? show(line.item) : null, alt: line.alt, pick: product, show,
});

const save = () => run(async () => {
  if (!props.id) return addDish(v);
  const offeredTypes = props.types.map(t => t.value);

  return await editDish(props.id, v, { before: props.before, offeredTypes }) && props.id;
});
</script>

<template>
  <UiWindow
    :title="id ? 'Edit dish' : 'New dish'"
    submit="Save"
    :ready="ready"
    :busy="busy"
    @submit="save"
  >
    <UiField name="Name">
      <UiFieldText v-model="v.name" placeholder="Dish name" />
    </UiField>
    <UiFieldList
      v-model="v.ingredients"
      name="Ingredients"
      :columns="COLUMNS"
      :fresh="() => ({ alt: [] })"
    >
      <template #item="{ group }">
        <UiFieldPick v-model="group.item" :pick="() => product(group)" :show="show" />
      </template>
      <template #alt="{ group }">
        <UiFieldPick v-model="group.alt" :pick="() => alternatives(group)" :show="showAlt" />
      </template>
      <template #amount="{ group }">
        <UiFieldText v-model="group.amount" placeholder="500 г" />
      </template>
    </UiFieldList>
    <UiField name="Type">
      <UiFieldChoice v-model="v.type" :choices="TYPES" />
    </UiField>
    <UiField name="Note">
      <UiFieldPick v-model="v.link" :pick="() => pickRecipeNote(v.name)" :show="noteName" />
    </UiField>
  </UiWindow>
</template>
