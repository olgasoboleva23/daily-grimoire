<!-- A dish's viewer (block ui-dish; open.js opens it): its marks, its
     ingredients with their amounts (an alternative's products under theirs, «↳ chicken 500 г»;
     a product gone: struck out), the buttons (🛒 its products onto the shopping list, asked
     first; ✏️ the dish form, 📄 the recipe note, 🗑), then the note's steps drawn by Obsidian
     (without its properties). An ordered dish has no note -->
<script setup>
import { computed, inject, nextTick, onMounted, ref, watch } from "vue";
import { MarkdownRenderer, Notice } from "obsidian";
import { confirm } from "#/components/uikit/ConfirmWindow/confirm.js";
import { openNote } from "#/components/app/open.ts";
import { app } from "#/helpers/app.js";
import { openWindow, WINDOW } from "#/components/uikit/Window/open.ts";
import UiWindow from "#/components/uikit/UiWindow/index.vue";
import { openDishForm } from "#/components/windows/recipes/DishFormWindow/open.js";
import CartWindow from "#/components/windows/recipes/CartWindow/index.vue";
import { loadRecipes, removeDish } from "#/controllers/dishes.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  dish: { type: String, required: true },
});
const ctx = inject(WINDOW);

const data = ref(null);
const d = computed(() => data.value?.dishes.find(x => x.id === props.dish) ?? null);
const marks = computed(() =>
  (data.value?.marks ?? []).filter(m => d.value?.marks.includes(m.tag)));
const steps = ref(null);

const noteName = path => path.split("/").pop().replace(/\.md$/i, "");

async function load() {
  data.value = await loadRecipes();
}

// the recipe note, its properties cut off, drawn as Obsidian draws a note
async function draw(link, _previous, onCleanup) {
  let cancelled = false;

  onCleanup(() => { cancelled = true; });
  await nextTick();
  const target = steps.value;
  const file = link && app.vault.getFileByPath(link);

  if (cancelled || !target || !file) return;
  const text = (await app.vault.cachedRead(file)).replace(/^---\n[\s\S]*?\n---\n/, "");

  if (cancelled) return;
  target.replaceChildren();
  await MarkdownRenderer.render(app, text, target, file.path, ctx.owner);
}

onMounted(load);
watch(() => d.value?.link, draw);

// a write: a failure said
const act = async write => {
  try { await write(); } catch (e) { console.error(e); new Notice(`✦ Not saved (${e.message})`); }
};

const cart = () => act(() => openWindow(CartWindow, { dish: d.value }));

const edit = () => act(async () => {
  if (await openDishForm(d.value)) await load();
});

function open(e) {
  openNote(d.value.link, "", e);
  ctx.close();
}

const remove = () => act(async () => {
  const yes = await confirm("Delete dish?", [{ name: "Dish", text: d.value.name }]);

  if (yes && await removeDish(props.dish)) ctx.close();
});
</script>

<template>
  <UiWindow :title="d ? `🍲 ${d.name}` : '🍲'" frame-class="ui-dish-window">
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
          <span class="ui-dish__product">{{ i.name }}</span>
          <span v-if="i.amount" class="ui-dish__amount">{{ i.amount }}</span>
          <div
            v-for="(a, k) in i.alt"
            :key="k"
            :class="['ui-dish__alt', { 'ui-dish__alt--gone': a.name === a.item }]"
          >
            ↳ <span class="ui-dish__product">{{ a.name }}</span>
            <span v-if="a.amount" class="ui-dish__amount">{{ a.amount }}</span>
          </div>
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
  </UiWindow>
</template>
