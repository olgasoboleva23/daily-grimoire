[← Docs](index.md)

# 🛠 Development

## 🗂 Structure

The plugin lives in `plugin/`. Its [architecture](architecture.md) describes the six source layers, import rules and data ownership.

```
├── 📁 plugin
│   ├── 📁 src                    — app, pages, widgets, features, entities, shared
│   └── 📁 tests                  — node:test suites and tests/obsidian/ snapshot scripts
├── 📁 00 System
│   ├── 📁 Assets                 — sounds, task stickers (stickers/)
│   └── 📁 Data                   — plugin data (paths in plugin/src/shared/config/paths.js)
│                                   Tasks/ (Master.md: the lines, tasks.json: Daily Grimoire's fields by id), Goals.md, Finance/ (Ledger/, rules.json),
│                                   Shop.md, Celestial Market.md (the log; Market/items.json: the items by id;
│                                   Celestial Market (old).md: the copy before the migration), Supplies.md, Cycle.md, Weight.md, Journals/, Savings/
├── 📁 02 Areas/Personal/Daily Notes — daily notes (the folder set in Obsidian's Daily notes)
├── 📁 03 Resources/Collections   — Readlist, Gamelist, Watchlist, Recipes (Obsidian Bases)
```

## Build and test

```sh
cd plugin
npm ci
npm test                                   # unit tests
npm run check                              # types (vue-tsc: .ts, .js and .vue)
npm run lint                               # ESLint, Stylelint, Knip, Steiger
WINX_VAULT=/path/to/your/vault npm run dev # build into <vault>/.obsidian/plugins/daily-grimoire on every save
```

After a rebuild run **Daily Grimoire: Reload** (Cmd+P) (the tab loads the new build). `npm run build` makes `plugin/dist/` (`main.js`, `styles.css`, `manifest.json`); a Sass error fails it.

The scripts in `tests/obsidian/` capture computed styles in Obsidian. Use `styles-snapshot.js` for notes, `shadow-snapshot.js` for the visible desktop tab, and `window-snapshot.js` for windows. `compare-snapshots.mjs --no-classes` diffs two such records, to check a style change moved nothing it shouldn't.

## A widget

For the Weight card, start at `plugin/src/widgets/weight/index.js`. It exports the description consumed by `pages/dashboard/model/cards.js`. The description pairs `ui/index.vue` with the loader in `model/store.js`. The form saves through `logWeight` in the public entry of `entities/weight`.

```js
// The description exported by widgets/weight/index.js
export const weight = {
  view: WeightCard, load: loadWeight, dataview: [CYCLE], watches: [WEIGHT, `${JOURNALS}/`, CYCLE],
};
```

- `shared/ui/UiWidget.vue` loads on mount and passes the result to the view as `state.data`. A description can subscribe to vault paths (`watches`, with a trailing slash for folders), Dataview index updates (`dataview`), or Vue refs (`stores`, such as the task store's version). The frame discards stale results, shows a loading placeholder, and offers a retry after an error. `follows: false` loads once. `cardButton` adds a button beside the card title. A view can inject `retry` to refresh after a write.
- The parts in `plugin/src/shared/ui/` are reusable: `UiButton` with a kind (`round`, `nav`, `pill`, `chip`,
  `toggle`, `text`) and its tooltip (`title`; `tip="pink"` on a blue place), `UiCard`, `UiChart` (a Charts
  plugin chart, destroyed with it), `UiTable` (columns with a key, label, align, class and tip; rows; a cell
  slot; a row's key and class), `UiInput` (a text field: `field`, or `inline` in a table's row), `UiCheckbox`
  (a box with a mark ☐ / ✅ / ❌ and its sound; `static` for a legend), `UiEmpty` / `UiMissing` /
  `UiFailed`, `UiNoteLink`, `UiGroupHeader`, `UiAddForm`.
- A hint on hover is the `v-tip` directive (`shared/ui/tooltip.js`), not a component: it asks Obsidian for its tooltip
  (`setTooltip`), which is drawn on the body, so a card's edge or a table's scroll never clips it, and it goes
  on any element (a `th`, a `div`, a button) without a wrapper in the DOM. `v-tip="text"`, `v-tip:bottom`,
  `v-tip.pink` on a blue place (Missed, today); the look is `shared/styles/_tooltip.scss` (`.tooltip.ui-tooltip`).
  No `title` attributes: a button's `title` prop becomes its tooltip and `aria-label`.
- The data comes ready from `load` (labels, sums, dates); the template has values, `v-for` with a `:key` and
  `v-if`. A click is `@click` calling an action; what a card only shows (a mode, a fold, a picked level) is the
  component's own state.
- Class names are BEM: `ui-block__element--modifier` (`ui-weight__now`, `ui-cal__day--today`, `ui-btn--on`), one block per `index.scss` next to its component (shared ones in `plugin/src/shared/styles/`); states the code sets are modifiers; layout utilities (`ui-row`, `ui-gap-*`…) are in `plugin/src/shared/styles/_utilities.scss`.
- Two style builds from the same partials (`_context.scss` switches `:root` / `body.is-mobile` to `.ui-view` / `:host([data-mobile])`):
  - `app/styles/main.scss` → `styles.css`, the **document sheet**: only what Obsidian's own windows draw (Vue windows, Search, the tooltip, the syncing badge, their tokens, the file explorer's colours). Cards and pages are not there: the tab draws them (`UiCard` renders the `ui-card` block, styled in the tab's sheet only), no note uses Markdown callouts with our look. Two `!important` are left, both in `_themes.scss`.
  - `app/styles/shadow.scss` → compiled to text and inlined into `main.js`, adopted by the tab's Shadow DOM root. It is in cascade layers: `@layer base, components;` with `tokens` and `utilities` as sublayers of `components` (the `layer` mixin in `_context.scss` puts a partial in its layer), so a later layer wins whatever the selector's weight.
- A page is a component of the tab (see [Dashboard](dashboard.md)); notes are only data.

## The calendar

The calendar is a Vue page of the Daily Grimoire tab (`plugin/src/pages/calendar/ui/index.vue`, containing
`CalendarTab`). Its state (date, view, tab, folds; `pages/calendar/model/store.js`) is Vue's `reactive`, saved
with the layout; the model (`pages/calendar/model/calendarData.js`) is recomputed
when the date, the view or a filter changes, or when a task file does (`app/tasksSync.js` updates the task store as soon as
it's saved; the calendar needs no Dataview); the parts (`CalendarHeader`,
`CalendarMissed`, `CalendarGrid`, `CalendarPanel`) and the tasks (`TaskRow`, `TaskCard`…) are `.vue` files.
An element's task is its `:key` (the id, `t12`) and the props of its component; the drag
(`pages/calendar/ui/drag.js`: a row and a zone set their own listeners) needs no selector; a swipeable row carries
`data-swipeable`, which `shared/lib/swipe.js` finds it by.


## Product name and stable identifiers

The plugin is called **Daily Grimoire**. Winx, Winx dark, Gothic and Dragon Age 2 are its visual themes.

The plugin ID is `daily-grimoire`, the installation folder is `.obsidian/plugins/daily-grimoire/`,
and Obsidian command IDs start with `daily-grimoire:`. When moving an existing installation, back up
its config first, move the plugin folder with its `data.json`, and update the enabled-plugin list
and hotkey command IDs. The visible mobile config copy needs the same changes before syncing.

The visible name is read from `manifest.json` by `src/shared/config/name.js` (`APP_NAME`). The repository is
[`daily-grimoire`](https://github.com/olgasoboleva23/daily-grimoire). The theme ids `winx` / `winx-dark`, the data paths and the `WINX_VAULT` development variable
(the build destination) stay. The tab's view type is `ui-app` (class `UiView`, `app/tab/`);
CSS classes are `ui-*`, custom properties `--ui-*`, uikit components `Ui*`.
