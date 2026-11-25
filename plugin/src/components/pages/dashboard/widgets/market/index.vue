<!-- Celestial Market: the list by category, a round ✓ per item (the sparkle plays, then it's
     written as bought), what runs low soon, and links to the market and the supplies. 🗑 takes a
     line off unbought: shown on a row's hover (the phone: a tap on its name), UiDeleteButton (the
     first click arms it, the second one removes). The amounts the recipes put (🛒): one after
     the name, several a ⚖ count, each «dish — amount» in its tooltip and, on the tap, listed
     under the name -->
<script setup>
import { inject, reactive, ref, watch } from "vue";
import { Keymap } from "obsidian";
import { openUi } from "#/shared/host/index.js";
import UiEmpty from "#/components/uikit/UiEmpty/index.vue";
import UiMissing from "#/components/uikit/UiMissing.vue";
import UiGroupHeader from "#/components/uikit/UiGroupHeader.vue";
import UiNoteLink from "#/components/uikit/UiNoteLink.vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiDeleteButton from "#/components/uikit/UiDeleteButton/index.vue";
import { vTip } from "#/components/uikit/tooltip.js";
import { MARKET } from "#/shared/config/index.js";
import { buyMarketItem, removeMarketItem } from "#/controllers/widgets/market.js";
import { openEditItem } from "#/components/windows/market/MarketItemWindow/open.js";

const props = defineProps({ state: { type: Object, required: true } });
const ui = inject("ui", null);
const supplies = e => ui ? ui.go("supplies", {}, e)
  : openUi("supplies", {}, Keymap.isModEvent(e));
// rows being bought: sparkling from the click until the list no longer has them (written), or the
// write didn't happen (the line moved meanwhile)
const bought = reactive(new Set());
const key = r => `${r.line}|${r.id ?? r.name}`;

async function buy(r) {
  if (bought.has(key(r))) return;
  bought.add(key(r));
  await new Promise(done => setTimeout(done, 650));   // the sparkle first
  let written = false;

  try {
    written = await buyMarketItem(r);
  } finally {
    if (!written) bought.delete(key(r));
  }
}

// 🗑 and the amounts' list: the row whose name was tapped (the phone has no hover)
const open = ref(null);
// a dish's need of a row's product: "Pilaf — 900 g", or the dish alone
const need = n => n.amount ? `${n.dish} — ${n.amount}` : n.dish;

// a row gone from the list lets go of its mark: back on the list later, it can be bought again
watch(() => props.state.data.groups, groups => {
  const shown = new Set((groups ?? []).flatMap(g => g.rows.map(key)));

  for (const k of bought) if (!shown.has(k)) bought.delete(k);
});
</script>

<template>
  <UiMissing v-if="state.data.missing" :path="state.data.path" />
  <div v-else class="ui-market">
    <div class="ui-market__list">
      <UiEmpty v-if="state.data.empty" text="Merchant inventory cleared" />
      <template v-for="g in state.data.groups" :key="g.label">
        <UiGroupHeader :label="g.label" :count="g.rows.length" />
        <div
          v-for="r in g.rows"
          :key="key(r)"
          class="ui-market__item ui-row ui-gap-l"
          :class="{
            'ui-market__item--bought': bought.has(key(r)),
            'ui-market__item--open': open === key(r),
          }"
        >
          <div class="ui-market__text ui-grow" @click="open = open === key(r) ? null : key(r)">
            {{ r.name }}
            <span
              v-if="r.needs?.length > 1"
              v-tip="r.needs.map(n => `• ${need(n)}`).join('\n')"
              class="ui-market__need"
            >⚖{{ r.needs.length }}</span>
            <span
              v-else-if="r.needs?.[0]?.amount"
              v-tip="need(r.needs[0])"
              class="ui-market__need"
            >{{ r.needs[0].amount }}</span>
            <ul v-if="open === key(r) && r.needs?.length" class="ui-market__needs">
              <li v-for="(n, k) in r.needs" :key="k">{{ need(n) }}</li>
            </ul>
          </div>
          <UiDeleteButton
            title="off the list"
            class="ui-market__del"
            @delete="removeMarketItem(r)"
          />
          <UiButton v-if="r.id" title="edit item" @click="openEditItem(r.id)">
            <span class="ui-pencil">✎</span>
          </UiButton>
          <UiButton
            kind="add"
            jump
            title="bought"
            @click="buy(r)"
          >
            <svg class="ui-market__tick" viewBox="0 0 40 26" aria-hidden="true">
              <path
                d="M14 13.5l4 4 8-8.5"
                fill="none"
                stroke="#fff"
                stroke-width="2.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </UiButton>
        </div>
      </template>
    </div>
    <div
      v-if="state.data.soon"
      class="ui-market__soon"
    >⏳ running low soon: {{ state.data.soon }}</div>
    <div class="ui-market__footer">
      <span>{{ state.data.left }}</span>
      <UiNoteLink :path="MARKET" kind="text" class="ui-market__link">
        ✦ open market
      </UiNoteLink>
      <UiButton kind="text" class="ui-market__link" @click="supplies">
        ✦ supplies
      </UiButton>
    </div>
  </div>
</template>
