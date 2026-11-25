<!-- The food journal (block ui-food): a week, ‹ › to step it, today back; a row a day: what was
     eaten (a product: its name edits it; a dish 🍲: its name opens its window; × takes it off, ＋
     adds one: a fuzzy search of products and dishes, or a new one), the marks counted, each free
     journal's level after its lag (the reasons in the tip), 💊 the medication courses on that
     day, the day's note. ⚙ edits the marks -->
<script setup>
import { computed, inject, ref } from "vue";
import { Keymap, Notice } from "obsidian";
import UiButton from "#/shared/ui/UiButton/index.vue";
import UiInput from "#/shared/ui/UiInput/index.vue";
import UiTable from "#/shared/ui/UiTable/index.vue";
import { openUi } from "#/shared/host/index.js";
import { vTip } from "#/shared/ui/tooltip.js";
import { addDays, weekOf } from "#/shared/lib/dates.js";
import { dayLabel } from "#/models/course.js";
import { foodWeek } from "#/models/food.js";
import { pickTask } from "#/components/uikit/TaskSearch/index.js";
import { removeEaten, setFoodNote, setTrainingTask } from "#/controllers/food.js";
import { readMarks } from "#/controllers/widgets/market.js";
import { openWindow } from "#/shared/ui/Window/index.ts";
import { addEaten, editEaten } from "#/components/windows/food/eaten.js";
import MarksWindow from "#/components/windows/food/MarksWindow/index.vue";
import { openDish } from "#/components/pages/recipes/DishWindow/open.js";

const ui = inject("ui", null);
const openMeds = e => ui ? ui.go("meds", {}, e)
  : openUi("meds", {}, Keymap.isModEvent(e));

const props = defineProps({ state: { type: Object, required: true } });
const d = computed(() => props.state.data);
const monday = ref(weekOf(d.value.today)[0]);
const days = computed(() => weekOf(monday.value));
const short = date => dayLabel(date).split(",")[0];
const step = n => { monday.value = n ? addDays(monday.value, 7 * n) : weekOf(d.value.today)[0]; };

const rows = computed(() => foodWeek({
  ...d.value, days: days.value, task: d.value.task,
}).map(r => ({ ...r, label: dayLabel(r.date), when: r.date === d.value.today ? "today" : "" })));
const columns = computed(() => [
  { key: "label", label: "День", class: "ui-food__day" },
  { key: "items", label: "Еда", class: "ui-food__items" },
  ...d.value.marks.map(m => ({
    key: `mark:${m.tag}`, label: m.icon, align: "center", tip: m.name, tag: m.tag,
  })),
  ...d.value.journals.map((j, i) => ({
    key: `journal:${i}`, label: j.lag ? `${j.name} +${j.lag}д` : j.name, align: "center", i,
    tip: j.lag ? `уровень через ${j.lag} дн. после еды` : "уровень в тот же день",
  })),
  ...(d.value.task
    ? [{ key: "trained", label: "🏋", align: "center", tip: d.value.task.name }] : []),
  { key: "courses", label: "💊", align: "center", tip: "курс лекарств в этот день" },
  { key: "note", label: "Заметка", class: "ui-food__note" },
]);

const editMarks = async () => openWindow(MarksWindow, { marks: await readMarks() });

async function pickTrainingTask() {
  const pick = await pickTask();

  if (!pick) return;
  if (pick.isNew) return void new Notice("✦ pick a task you already have");
  await setTrainingTask(pick.id);
}

// a write: a failure said (the page draws again from the files when one works)
const act = async (write) => {
  try { await write(); } catch (e) { console.error(e); new Notice(`✦ Not saved (${e.message})`); }
};
</script>

<template>
  <div class="ui-food">
    <div class="ui-food__head ui-row ui-gap-m">
      <UiButton
        kind="nav"
        title="previous week"
        class="ui-food__prev"
        @click="step(-1)"
      >‹</UiButton>
      <span class="ui-food__week">{{ short(days[0]) }} – {{ short(days[6]) }}</span>
      <UiButton
        kind="nav"
        mirrored
        title="next week"
        class="ui-food__next"
        @click="step(1)"
      >‹</UiButton>
      <UiButton kind="chip" title="this week" @click="step(0)">today</UiButton>
      <span class="ui-grow" />
      <UiButton kind="text" title="the training task" @click="act(pickTrainingTask)">
        🏋
      </UiButton>
      <UiButton kind="text" title="the marks" @click="act(editMarks)">⚙</UiButton>
    </div>
    <div class="ui-food__grid">
      <UiTable
        :columns="columns"
        :rows="rows"
        bordered
        :row-key="r => r.date"
        :row-class="r => (r.when ? `ui-food__row--${r.when}` : null)"
      >
        <template #cell="{ row, col }">
          <template v-if="col.key === 'label'">{{ row.label }}</template>
          <div v-else-if="col.key === 'items'" class="ui-flex ui-wrap ui-gap-xs">
            <span v-for="(f, n) in row.items" :key="n" class="ui-food__item">
              <span
                v-if="f.kind === 'dish'"
                v-tip="'open the dish'"
                class="ui-food__item-name"
                @click="openDish(f.id)"
              >🍲 {{ f.name }}{{ f.icons ? ` ${f.icons}` : "" }}</span>
              <span
                v-else
                v-tip="'edit the product'"
                class="ui-food__item-name"
                @click="act(() => editEaten(f.id))"
              >{{ f.name }}{{ f.icons ? ` ${f.icons}` : "" }}</span>
              <span class="ui-food__off" @click="act(() => removeEaten(row.date, n))">×</span>
            </span>
            <UiButton
              kind="add"
              title="add what was eaten"
              @click="act(() => addEaten(row.date))"
            >＋</UiButton>
          </div>
          <span v-else-if="col.tag" class="ui-food__count">{{ row.counts[col.tag] || "" }}</span>
          <span
            v-else-if="col.key.startsWith('journal:') && row.journals[col.i].level !== null"
            v-tip="row.journals[col.i].reasons.join(', ')"
            class="ui-food__level"
          >{{ row.journals[col.i].level }}</span>
          <span v-else-if="col.key === 'trained'" class="ui-food__trained">
            {{ row.trained ? "✓" : "" }}
          </span>
          <template v-else-if="col.key === 'courses'">
            <span v-for="c in row.courses" :key="c.id" class="ui-row ui-gap-xs">
              <UiButton
                kind="text"
                title="open medication"
                class="ui-food__course"
                @click="openMeds"
              >💊</UiButton>
              <span
                v-for="m in c.meds"
                :key="m.code"
                v-tip="m.taken ? m.name : `${m.name}: не принято`"
                :class="['ui-food__med', { 'ui-food__med--not': !m.taken }]"
              >{{ m.code }}</span>
            </span>
          </template>
          <UiInput
            v-else-if="col.key === 'note'"
            kind="inline"
            :model-value="row.note"
            placeholder="…"
            @change="act(() => setFoodNote(row.date, $event.target.value))"
          />
        </template>
      </UiTable>
    </div>
  </div>
</template>
