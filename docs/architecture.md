# Plugin architecture

## Changes at a glance

- `plugin/src/app` mounts Vue pages in one Obsidian tab. Dashboard assembles its cards in `pages/dashboard/model/cards.js`.
- `plugin/src` groups code by what it owns. A **layer** sets import direction, a **slice** groups one subject such as `entities/task`, and a **segment** groups one role within it, such as `ui`.

## Finding the owner

Paths below are relative to `plugin/src/`. The table lists layers from top to bottom. Import from lower layers through the slice's public `index.js`, for example `#/entities/task/index.js`. Inside a slice use relative paths. Review imports between slices on the same layer as errors. In `shared`, import UI components and library files directly. Use the public entries for config, host and vault.

| Layer | Segments and responsibilities |
|---|---|
| `app` | `main.ts` starts the plugin. `tab/` mounts the view, `model/` holds router state and `styles/` builds the document and tab sheets. Commands and vault subscriptions live here. |
| `pages` | `ui/` draws a screen, `model/` supplies its data, and `operation/` coordinates a write used only on that page. |
| `widgets` | `ui/` and `model/` own a card or reusable window. A dashboard card exports a description with its view, loader and update sources. A widget can own its own data and operations. |
| `features` | `ui/` presents a user action, and `operation/` coordinates its steps when several screens share them. |
| `entities` | `model/` holds records, rules and actions. `contract/` checks what can be saved. `ui/` holds shared views of the entity. |
| `shared` | `ui/` and `styles/` provide the component kit and design system. `lib/` holds reusable helpers, `config/` owns settings and their contract, `host/` talks to Obsidian and its plugins, and `vault/` supplies generic file access. |

A **store** (`model/store.js`) holds in-memory state or gathers data for a view. A **repository** (`model/repository/`) owns access to a data file. Name it after the file, such as `tasks.js` for `tasks.json`. Name model files after a single concept (`task.js`), entity slices with singular nouns, and features with a verb and noun (`buy-reward`).

An entity action checks its input and makes one write. Put multi-step work such as reading the available gold before recording a purchase in an operation. Call the data owner's public actions. Keep data and operations with their only consumer. When a second screen needs them, move reusable data into an entity or a shared action into a feature.

`npm run lint` runs Steiger with `plugin/steiger.config.js`. The single-consumer rule warns across all layers so imports from widgets still count. Ten dashboard widget slices intentionally have one consumer. They own the views and reload rules for their cards. These slices are `cycle`, `daily-note`, `finance`, `goals`, `market`, `pomodoro`, `quests`, `savings`, `weight` and `xp`. Review additional warnings against the ownership rule.
