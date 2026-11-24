<!-- The recipe book (block ui-recipes; dishes.json through loadRecipes): a search (a dish's name
     or an ingredient) and ＋ Dish, the tabs (All, the dish types from ⚙ Settings, Other;
     the counts follow the search; the tab picked: the app tab's
     saved ui.state.recipes), then a row a dish by name: 🍲 its name (📄: it has a recipe
     note; a click opens its window), its ingredients, its marks' icons, 🛒 its products onto the
     shopping list (asked first), ✏️ the dish form. A cooked dish and an ordered one look alike -->
<script setup>
import { computed, inject, ref } from "vue";
import { Notice } from "obsidian";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiEmpty from "#/components/uikit/UiEmpty/index.vue";
import UiInput from "#/components/uikit/UiInput/index.vue";
import UiTable from "#/components/uikit/UiTable/index.vue";
import UiTabs from "#/components/uikit/UiTabs/index.vue";
import { app } from "#/helpers/app.js";
import config from "#/helpers/config.js";
import { askDish } from "#/controllers/dishes.js";
import { ingredientText, toList } from "./cart.js";
import { openDish } from "./DishWindow/index.ts";

const props = defineProps({ state: { type: Object, required: true } });
const d = computed(() => props.state.data);
const query = ref("");
const saved = inject("ui").state.recipes;
const courses = computed(() => [
  { key: "all", text: "All" }, ...config.dishTypes.map(t => ({ key: t.key, text: t.name })),
  { key: "other", text: "Other" },
]);
// the tab shown: the saved one while ⚙ Settings has it, else all
const course = computed(() =>
  courses.value.some(c => c.key === saved.course) ? saved.course : "all");

const icons = computed(() => new Map(d.value.marks.map(m => [m.tag, m.icon])));
const rows = computed(() => d.value.dishes.map(x => ({
  ...x, ingredients: x.ingredients.map(ingredientText).join(", "),
  icons: x.marks.map(t => icons.value.get(t) ?? "").join(""),
})));
const found = computed(() => {
  const q = query.value.trim().toLowerCase();

  return q ? rows.value.filter(r => `${r.name} ${r.ingredients}`.toLowerCase().includes(q))
    : rows.value;
});
const inCourse = (r, c) => c === "all" || (r.type || "other") === c;
const tabs = computed(() => courses.value.map(({ key, text }) =>
  ({ key, text: `${text} ${found.value.filter(r => inCourse(r, key)).length}` })));
const shown = computed(() => found.value.filter(r => inCourse(r, course.value)));
const columns = [
  { key: "name", label: "Dish", class: "ui-recipes__dish" },
  { key: "ingredients", label: "Ingredients" },
  { key: "icons", label: "Marks", align: "center" },
  { key: "actions", label: "" },
];

// a write: a failure said (the page draws again from the files when one works)
const act = async write => {
  try { await write(); } catch (e) { console.error(e); new Notice(`✦ Not saved (${e.message})`); }
};

const cart = id => act(() => toList(d.value.dishes.find(x => x.id === id)));

const edit = id => act(() => askDish(app, d.value.dishes.find(x => x.id === id)));
</script>

<template>
  <div class="ui-recipes">
    <div class="ui-recipes__head ui-row ui-gap-m">
      <UiInput
        v-if="rows.length"
        v-model="query"
        class="ui-recipes__search ui-grow"
        placeholder="dish or ingredient…"
      />
      <span v-else class="ui-grow" />
      <UiButton kind="pill" class="ui-recipes__add" @click="act(() => askDish(app))">
        ＋ Dish
      </UiButton>
    </div>
    <UiEmpty v-if="!rows.length" text="No dishes yet" />
    <UiTabs
      v-else
      :model-value="course"
      class="ui-recipes__tabs"
      :tabs="tabs"
      @update:model-value="c => saved.course = c"
    />
    <div v-if="rows.length && !shown.length" class="ui-recipes__none">
      {{ query.trim() ? "Nothing found" : "Nothing here yet" }}
    </div>
    <UiTable
      v-else-if="rows.length"
      :columns="columns"
      :rows="shown"
      :row-key="r => r.id"
    >
      <template #cell="{ row, col }">
        <span
          v-if="col.key === 'name'"
          class="ui-recipes__name"
          @click="openDish(app, row.id)"
        >🍲 {{ row.name }}{{ row.link ? " 📄" : "" }}{{ row.missing ? " ⚠" : "" }}</span>
        <span
          v-else-if="col.key === 'ingredients'"
          class="ui-recipes__ingredients"
        >{{ row.ingredients }}</span>
        <span v-else-if="col.key === 'icons'" class="ui-recipes__marks">{{ row.icons }}</span>
        <span v-else class="ui-row ui-gap-xs">
          <UiButton
            kind="text"
            title="to the shopping list"
            class="ui-recipes__cart"
            @click="cart(row.id)"
          >🛒</UiButton>
          <UiButton kind="text" title="edit the dish" @click="edit(row.id)">✏️</UiButton>
        </span>
      </template>
    </UiTable>
  </div>
</template>
