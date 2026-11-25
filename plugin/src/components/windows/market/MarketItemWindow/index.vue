<!-- A market item's window (opened by open.js). New product (the food page's + new product, the
     product search's): Name (prefilled with what was typed), a check per food mark; Add greyed
     until a name; resolves the new id (addProduct). Edit item (the market's and supplies' ✎, an
     eaten product, a dish's chosen product): Name, Category, the marks' checks only when it was
     food (`marks` is empty otherwise); Save greyed until a name and a category; resolves true
     (editMarketItem, against `before`: the record as it was on disk when it opened) -->
<script setup>
import { computed, reactive } from "vue";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import UiField from "#/components/uikit/UiField/index.vue";
import UiFieldText from "#/components/uikit/UiFieldText/index.vue";
import UiFieldChoice from "#/components/uikit/UiFieldChoice/index.vue";
import { filled } from "#/components/uikit/UiWindow/ready.js";
import { useWrite } from "#/components/uikit/UiWindow/write.js";
import { marketCats } from "#/models/market.js";
import { addProduct, editMarketItem } from "#/controllers/widgets/market.js";

const props = defineProps({
  name: { type: String, default: "" },        // new: the name typed in the search
  id: { type: String, default: null },        // edit: its id
  before: { type: Object, default: null },    // edit: the record read from disk
  marks: { type: Array, default: () => [] },  // the food marks ({ tag, icon, name })
});
const emit = defineEmits(["done"]);

const CATEGORIES = marketCats.map(c => ({ label: c.label, value: c.type }));
const editing = !!props.id;
const was = props.before ?? {};
const v = reactive({
  name: editing ? was.name : props.name, type: was.type ?? null,
  checked: Object.fromEntries(props.marks.map(m => [m.tag, (was.marks ?? []).includes(m.tag)])),
});
const ready = computed(() => filled(v.name) && (!editing || filled(v.type)));
const { busy, run } = useWrite(emit);
const label = m => `${m.icon} ${m.name}`;

const save = () => run(() => {
  const marks = props.marks.filter(m => v.checked[m.tag]).map(m => m.tag);

  return editing
    ? editMarketItem(props.id, {
      name: v.name, type: v.type, marks: was.type === "food" ? marks : undefined,
    }, props.before)
    : addProduct({ name: v.name, marks });
});
</script>

<template>
  <UiWindow
    :title="editing ? 'Edit item' : 'New product'"
    :submit="editing ? 'Save' : 'Add'"
    :ready="ready"
    :busy="busy"
    @submit="save"
  >
    <UiField name="Name">
      <UiFieldText v-model="v.name" :placeholder="editing ? 'Item name' : 'Product name'" />
    </UiField>
    <UiField v-if="editing" name="Category">
      <UiFieldChoice v-model="v.type" :choices="CATEGORIES" />
    </UiField>
    <UiField
      v-for="m in marks"
      :key="m.tag"
      :name="label(m)"
      description=""
      toggle
    >
      <input v-model="v.checked[m.tag]" type="checkbox" :aria-label="label(m)">
    </UiField>
  </UiWindow>
</template>
