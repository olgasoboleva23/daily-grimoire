<!-- A dish's window content (block ui-dish; DishWindow/index.ts opens it): its marks, its
     ingredients with their amounts («beef / chicken»: an alternative; a product gone: struck
     out), the buttons (🛒 its products onto the shopping list, asked first; ✏️ the dish form, 📄
     the recipe note, 🗑), then the note's steps drawn by Obsidian (without its properties). An
     ordered dish has no note -->
<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { MarkdownRenderer, Notice } from "obsidian";
import { Form } from "#/components/uikit/Form/index.ts";
import { openNote } from "#/components/app/open.ts";
import { app } from "#/helpers/app.js";
import { askDish, loadRecipes, removeDish } from "#/controllers/dishes.js";
import { toList } from "../cart.js";

const props = defineProps({
  dish: { type: String, required: true },
  owner: { type: Object, required: true },   // the window's Component: the note's drawing's owner
});
const emit = defineEmits(["title", "close"]);

const data = ref(null);
const d = computed(() => data.value?.dishes.find(x => x.id === props.dish) ?? null);
const marks = computed(() =>
  (data.value?.marks ?? []).filter(m => d.value?.marks.includes(m.tag)));
const steps = ref(null);

const noteName = path => path.split("/").pop().replace(/\.md$/i, "");

async function load() {
  data.value = await loadRecipes();
  if (d.value) emit("title", d.value.name);
}

// the recipe note, its properties cut off, drawn as Obsidian draws a note
async function draw() {
  await nextTick();
  const file = d.value?.link && app.vault.getFileByPath(d.value.link);

  if (!steps.value || !file) return;
  const text = (await app.vault.cachedRead(file)).replace(/^---\n[\s\S]*?\n---\n/, "");

  steps.value.replaceChildren();
  await MarkdownRenderer.render(app, text, steps.value, file.path, props.owner);
}

onMounted(load);
watch(() => d.value?.link, draw);

// a write: a failure said
const act = async write => {
  try { await write(); } catch (e) { console.error(e); new Notice(`✦ Not saved (${e.message})`); }
};

const cart = () => act(() => toList(d.value));

const edit = () => act(async () => {
  if (await askDish(app, { ...d.value, ingredients: d.value.ingredients
    .map(({ item, amount }) => ({ item, amount })) })) await load();
});

function open(e) {
  openNote(d.value.link, "", e);
  emit("close");
}

const remove = () => act(async () => {
  const yes = await Form.ask(app, "Delete dish?", [{ name: "Dish", key: "name", label: true }],
    { values: { name: d.value.name }, submit: "Delete" });

  if (yes && await removeDish(props.dish)) emit("close");
});
</script>

<template>
  <div v-if="data && !d" class="ui-dish__empty">This dish is gone</div>
  <div v-else-if="d" class="ui-dish">
    <div v-if="marks.length" class="ui-dish__marks">
      <span v-for="m in marks" :key="m.tag" class="ui-dish__mark">{{ m.icon }} {{ m.name }}</span>
    </div>
    <ul class="ui-dish__ingredients">
      <li
        v-for="(i, n) in d.ingredients"
        :key="n"
        :class="['ui-dish__ingredient', { 'ui-dish__ingredient--gone': i.name === i.item }]"
      >
        <span class="ui-dish__product">{{ i.alt ? `${i.name} / ${i.altName}` : i.name }}</span>
        <span v-if="i.amount" class="ui-dish__amount">{{ i.amount }}</span>
      </li>
    </ul>
    <div class="ui-dish__bar">
      <button class="mod-cta ui-dish__cart" @click="cart">🛒 To the list</button>
      <button class="ui-dish__edit" @click="edit">✏️ Edit</button>
      <button v-if="d.link" class="ui-dish__note" @click="open">📄 {{ noteName(d.link) }}</button>
      <button class="ui-dish__delete" title="Delete" @click="remove">🗑</button>
    </div>
    <div v-if="d.link" ref="steps" class="ui-dish__steps markdown-rendered" />
  </div>
</template>
