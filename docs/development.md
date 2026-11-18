[← Docs](index.md)

# 🛠 Development

## 🗂 Structure

```
├── 📁 plugin — the Daily Grimoire plugin
│   ├── 📁 src
│   │   ├── main.ts               — loads everything: the Daily Grimoire tab (view type `ui-app`), ✨,
│   │   │                           the commands
│   │   ├── 📁 components         — every .vue (a styled one: a folder with index.vue and its index.scss)
│   │   │   ├── 📁 uikit          — the shared parts: UiButton (round, nav, pill, chip, toggle, text),
│   │   │   │                       UiCard, UiChart, UiTable, UiInput, UiCheckbox, UiNoteLink,
│   │   │   │                       UiEmpty / UiMissing / UiFailed, tooltip.js (the v-tip directive),
│   │   │   │                       UiGroupHeader, UiAddForm, UiNav (the pill and the phone's bar), UiDrawer (the left drawer, the phone's sheet); Obsidian's windows: Form, Search, SettingsWindow,
│   │   │   │                       TaskWindow (a task's difficulty, area, time, sticker, variants), TaskSearch
│   │   │   ├── UiWidget.vue   — loads widget data, follows changes, shows loading/error/card states
│   │   │   ├── 📁 app           — view.ts (UiView, the Obsidian tab: saved state, Back/Forward), index.vue (Vue pages
│   │   │   │                       and KeepAlive), pages.js (the pages: titles, widgets, notes; pageOf), PageNavigation (pill,
│   │   │   │                       drawer), open.ts (open/reveal a tab)
│   │   │   └── 📁 pages
│   │   │       ├── 📁 dashboard  — index.vue (date, card layout, busy indicator), DashboardDate.vue,
│   │   │       │                   widgets/<topic>/ (each widget's markup and styles)
│   │   │       ├── 📁 calendar   — index.vue (state, model, subscriptions), CalendarTab, CalendarHeader,
│   │   │       │                   CalendarMissed, CalendarGrid, CalendarPanel, TaskRow, TaskCard…
│   │   │       └── 📁 projects, finance, shop, supplies, food, meds — the other pages
│   │   ├── 📁 controllers        — per topic, what a widget shows (its load) and what it writes
│   │   │                           (widgets/: weight, cycle, savings, shop, market, finance, goals, xp,
│   │   │                           quests, pomodoro, dailyNote), tasks.js (a task's line with undo, new
│   │   │                           tasks and pool lines), calendar.js (what the calendar writes), meds.js,
│   │   │                           food.js, journals.js, projects.js, settings.js, theme.js, notes.js,
│   │   │                           mobileConfig.js, blocks.js (the widgets: names → { view, load, watches })
│   │   ├── 📁 models             — the things and their rules, no Obsidian in them: lineItem (a log's line
│   │   │                           and its JSON record by id), Task (with its variants in turn), Note, Goal,
│   │   │                           SavingsJar, the weight / body / cycle logs, CalendarData, repeats (🔁
│   │   │                           rules), ledger (finance), timer (pomodoro), vitals (HP / MP), xp, course (medication), food, settings, market
│   │   │                           (MarketItem, the categories, supply stats), kinds (watch / read / game /
│   │   │                           recipe notes), taskFile (a task note's lines as tasks and pool lines)
│   │   ├── 📁 migrations         — tasks.js: the one-off Daily Grimoire: Migrate tasks
│   │   ├── 📁 composables        — use.js (useRedraw, useDataviewChanges, useWhenIndexed, useNewDay,
│   │   │                           useBusy, useLater…), vueApp.ts (useVueApp: a Vue app owned by an Obsidian
│   │   │                           component; useObsidian: subscriptions owned by a Vue scope), drag.js / swipe.js (the
│   │   │                           calendar's), notify.js (desktop reminders)
│   │   ├── 📁 store              — tasks.js (the tasks of 00 System/Data/Tasks, read by the plugin itself and
│   │   │                           kept up to date on Obsidian's own file events: no Dataview, no wait for its
│   │   │                           index), calendar.js (the calendar's state: its saved and data keys), router.js (the Daily Grimoire tab's pages and Back / Forward history)
│   │   ├── 📁 helpers            — paths (where the data lives), app, dates, files (edit / editLine /
│   │   │                           appendLine), config, format (money, amount), sounds, chart, plugins
│   │   │                           (Dataview, Tasks, blockDv), find, name (APP_NAME, from manifest.json), panelGroups
│   │   ├── 📁 styles             — main.scss (the document sheet, see below) and the shared look: tokens,
│   │   │                           mixins ($space-*, $text-*, $radius-*, $btn-*, row / center, sparkles: stars flying out on hover, drawn from `--ui-sparkles-svg` in `_assets.scss`), fonts,
│   │   │                           layout, the cards' grid, nav, busy, syncing, utilities (_utilities.scss);
│   │   │                           shadow.scss: the tab's own sheet (see below)
│   │   └── 📁 commands           — commands.ts (the Cmd+P commands, the Alt+T menu)
│   └── 📁 tests                  — npm test; tests/obsidian/ checks styles inside Obsidian
├── 📁 00 System
│   ├── 📁 Assets                 — sounds, task stickers (stickers/)
│   └── 📁 Data                   — everything Daily Grimoire reads and writes (paths: plugin/src/helpers/paths.js):
│                                   Tasks/ (Master.md: the lines, tasks.json: Daily Grimoire's fields by id), Goals.md, Finance/ (Ledger/, rules.json),
│                                   Shop.md, Celestial Market.md (the log; Market/items.json: the items by id;
│                                   Celestial Market (old).md: the copy before the migration), Supplies.md, Cycle.md, Weight.md, Body log.md, Savings/
├── 📁 02 Areas/Personal/Daily Notes — daily notes (the folder set in Obsidian's Daily notes)
├── 📁 03 Resources/Collections   — Readlist, Gamelist, Watchlist, Recipes (Obsidian Bases)
```

## Build and test

```sh
cd plugin
npm ci
npm test                                   # unit tests
npm run check                              # types (vue-tsc: .ts, .js and .vue)
npm run lint                               # ESLint with Obsidian's rules (eslint-plugin-obsidianmd), lines ≤ 100,
                                           # blank lines between blocks; Stylelint (standard SCSS, BEM names)
WINX_VAULT=/path/to/your/vault npm run dev # build into <vault>/.obsidian/plugins/daily-grimoire on every save
```

After a rebuild run **Daily Grimoire: Reload** (Cmd+P) (the tab loads the new build). `npm run build` makes `plugin/dist/` (`main.js`, `styles.css`, `manifest.json`); a Sass error fails it.

Two style snapshots record the computed styles of every element (run them inside Obsidian, with `obsidian eval`): `tests/obsidian/styles-snapshot.js` for notes and `shadow-snapshot.js` for the tab (its Shadow DOM; the tab must be on screen; desktop only, never call `app.emulateMobile`). `compare-snapshots.mjs --no-classes` diffs two such records, to check a style change moved nothing it shouldn't.

## A widget

A widget is a `.vue` file for its markup (`components/pages/dashboard/widgets/`; a page on a note of its own: `components/pages/<page>/`) and its controller
(`controllers/<topic>.js`: what it loads and what it writes), registered by name in
`plugin/src/controllers/blocks.js` (a page names its widget in `components/app/pages.js`; the dashboard lists its cards):

```js
// controllers/widgets/weight.js
export async function loadWeight({ dv, app, sourcePath }) { … }     // what it shows (dv: Dataview for the page's note)
export async function logWeight(typed) { … }                  // what it writes: the .vue imports it
// blocks.js
weight: { view: WeightCard, load: loadWeight, watches: [WEIGHT, BODY_LOG, CYCLE] },
```

```vue
<!-- components/pages/dashboard/widgets/weight/index.vue -->
<script setup>
import { logWeight } from "#/controllers/widgets/weight.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="ui-weight">
    <span class="ui-weight__now">{{ state.data.weight.last.kg }} kg</span>
    <UiNoteLink path="00 System/Data/Weight.md">✦ list</UiNoteLink>
  </div>
</template>
```

- `UiWidget.vue` loads the data now and again when
  a file it names (`watches`) changes: the task files at once, from the plugin's own store, the rest a moment
  after Dataview's index has them (or the page's own note changes; a hidden widget when it shows), drops a stale result,
  shows an error with retry, a card's placeholder until the first data, and the card itself (`card` in the
  definition). `follows: false` loads once (the pomodoro); `cardButton` puts a button by the card's title. The view
  gets `state` as its prop; a widget that must load again after its own write (the shop's balance) takes
  `retry` by `inject("retry")`. Pages render this component directly inside the tab's single Vue app.
  `useObsidian` releases registered events and timers when its Vue scope ends.
- The parts in `plugin/src/components/uikit/` are reusable: `UiButton` with a kind (`round`, `nav`, `pill`, `chip`,
  `toggle`, `text`) and its tooltip (`title`; `tip="pink"` on a blue place), `UiCard`, `UiChart` (a Charts
  plugin chart, destroyed with it), `UiTable` (columns with a key, label, align, class and tip; rows; a cell
  slot; a row's key and class), `UiInput` (a text field: `field`, or `inline` in a table's row), `UiCheckbox`
  (a box with a mark ☐ / ✅ / ❌ and its sound; `static` for a legend), `UiEmpty` / `UiMissing` /
  `UiFailed`, `UiNoteLink`, `UiGroupHeader`, `UiAddForm`.
- A hint on hover is the `v-tip` directive (`uikit/tooltip.js`), not a component: it asks Obsidian for its tooltip
  (`setTooltip`), which is drawn on the body, so a card's edge or a table's scroll never clips it, and it goes
  on any element (a `th`, a `div`, a button) without a wrapper in the DOM. `v-tip="text"`, `v-tip:bottom`,
  `v-tip.pink` on a blue place (Missed, today); the look is `styles/_tooltip.scss` (`.tooltip.ui-tooltip`).
  No `title` attributes: a button's `title` prop becomes its tooltip and `aria-label`.
- The data comes ready from `load` (labels, sums, dates); the template has values, `v-for` with a `:key` and
  `v-if`. A click is `@click` calling an action; what a card only shows (a mode, a fold, a picked level) is the
  component's own state.
- Class names are BEM: `ui-block__element--modifier` (`ui-weight__now`, `ui-cal__day--today`, `ui-btn--on`), one block per `index.scss` next to its component (shared ones in `plugin/src/styles/`); states the code sets are modifiers; layout utilities (`ui-row`, `ui-gap-*`…) are in `plugin/src/styles/_utilities.scss`.
- Two style builds from the same partials (`_context.scss` switches `:root` / `body.is-mobile` to `.ui-view` / `:host([data-mobile])`):
  - `main.scss` → `styles.css`, the **document sheet**: only what Obsidian's own windows draw (Form, Search, the tooltip, the syncing badge, tokens and themes for them, the Finance note's `> [!card]` callout cards). There `!important` still fights Obsidian's rules.
  - `shadow.scss` → compiled to text and inlined into `main.js`, adopted by the tab's Shadow DOM root. It is in cascade layers: `@layer base, components;` with `tokens` and `utilities` as sublayers of `components` (the `layer` mixin in `_context.scss` puts a partial in its layer), so a later layer wins whatever the selector's weight.
- A page is a component of the tab (see [Dashboard](dashboard.md)); notes are only data.

## The calendar

The calendar is a Vue page of the Daily Grimoire tab (`plugin/src/components/pages/calendar/index.vue`, containing
`CalendarTab`). Its state (date, view, tab, folds; `store/calendar.js`) is Vue's `reactive`, saved
with the layout; the model (`models/calendarData.js`) is recomputed
when the date, the view or a filter changes, or when a task file does (`store/tasks.js` reads it again as soon as
it's saved; the calendar needs no Dataview); the parts (`CalendarHeader`,
`CalendarMissed`, `CalendarGrid`, `CalendarPanel`) and the tasks (`TaskRow`, `TaskCard`…) are `.vue` files.
Elements carry the task's key (`data-task`: file, line, status, words), the `:key` Vue keeps them by, and what
the tab's drag (`data-drag` → `data-drop`) and swipe (`data-swipeable`) listeners
(`composables/drag.js`, `swipe.js`) find the task by.


## Product name and stable identifiers

The plugin is called **Daily Grimoire**. Winx, Winx dark, Gothic and Dragon Age 2 are its visual themes.

The plugin ID is `daily-grimoire`, the installation folder is `.obsidian/plugins/daily-grimoire/`,
and Obsidian command IDs start with `daily-grimoire:`. When moving an existing installation, back up
its config first, move the plugin folder with its `data.json`, and update the enabled-plugin list
and hotkey command IDs. The visible mobile config copy needs the same changes before syncing.

The visible name is read from `manifest.json` by `src/helpers/name.js` (`APP_NAME`). The repo name
`winx-vault`, the theme ids `winx` / `winx-dark`, the data paths and the `WINX_VAULT` development variable
(the build destination) stay. The tab's view type is `ui-app` (class `UiView`, `components/app/`);
CSS classes are `ui-*`, custom properties `--ui-*`, uikit components `Ui*`.
