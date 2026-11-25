// Run inside Obsidian (obsidian eval): opens each window the way its opener does, then writes the
// computed styles of every visible element of the topmost window (`.modal-container .modal`, its
// ::before / ::after with content too) to OUT as JSON, keyed "<name> <path below .modal>"; a
// window with tabs (UiTabs) is recorded once per tab ("<name> [<tab>] <path>"). Then it closes
// every window it opened with its ×: a closed window resolves null, so nothing is written (it
// never presses a window's button). Same properties and JSON shape as styles-snapshot.js: two
// snapshots (the old build, the new one, taken one right after the other) are compared with
//   node tests/obsidian/compare-snapshots.mjs old.json new.json --no-classes
// Desktop only (app.emulateMobile hangs Obsidian); steps in the app tab need it open (ui-app).
//   obsidian vault="…" eval code="($(cat tests/obsidian/window-snapshot.js))('/tmp/old.json', {
//     'Rename stage': ['tab:projects', 'click:.ui-projects__card',
//       'click:.ui-project__stage button[aria-label=rename]'] })"
// Returns { count, errors } (an opener that failed: its error, the others still recorded).
//
// An opener is a list of steps, each followed by a short wait:
//   cmd:<id>               the Daily Grimoire command daily-grimoire:<id>
//   tab:<page>[|<json>]    the app tab on that page, that state merged in
//   click:<css>[@<text>]   the first visible match in the app tab (its shadow roots), with that
//                          text when given
//   modal:<css>[@<text>]   the same in the topmost window (a viewer's button, a suggestion)
//   type:<text>            typed into the topmost window's input (a search's query)
// Selectors that reach into a window list the old Form class and the kit's (`:is(…)`), so one
// opener works on both builds. The data must have what a step clicks (a project with a stage, a
// dish, a journal entry, a jar due …): check each opener once on the first run.
//
// The openers, per batch of the windows plan:
// 1  'Rename stage': [P, P1, 'click:.ui-project__stage button[aria-label=rename]']
//    'Result': [P, P1, 'click:.ui-project__result .ui-project__edit']
//    'Notes': [P, P1, 'click:.ui-project__notes .ui-project__edit']
//    'Start': [P, P1, 'click:button.ui-btn@🚀 Start']
//    'Delete project?': [P, P1, 'click:button.ui-btn@Delete project']
//    'Delete entry?': [P, P1, 'click:.ui-project__journal-open', 'modal:button[title=Delete]']
//    'Delete dish?': ['tab:recipes', 'click:.ui-recipes__name', 'modal:.ui-dish__delete']
//    'Delete the journal': ['tab:dashboard',
//      'click:.ui-weight button.ui-btn--toggle:not(.ui-btn--on)', 'click:.ui-weight__delete']
//    'Deposit': ['tab:dashboard', 'click:.ui-jar__due button']   ⚠ only with a jar due that has
//      no per-payday sum: with one, ✓ done deposits at once, no window
// 2  'New project': ['cmd:new-project']
//    'Edit project': [P, P1, 'click:button.ui-btn@Edit project']
//    'Delete stage?': [P, P1, 'click:.ui-project__stage button[aria-label=delete]']
//    'New link': [P, P1, 'click:button.ui-btn@+ link']
//    'New entry': [P, P1, 'click:.ui-project__journal-open', 'modal:button.mod-cta@+ Entry']
//    'Edit entry': [P, P1, 'click:.ui-project__journal-open', 'modal:button[title=Edit]']
//    'Промпты проекта': [P, 'click:button.ui-btn@Промпты']   (both tabs)
// 3  'New watch item': ['cmd:new-watch-item'], 'New read item': ['cmd:new-read-item'],
//    'New game': ['cmd:new-game-item'], 'New recipe': ['cmd:new-recipe'],
//    'New work task': ['cmd:new-work-task'], 'New journal': ['cmd:new-journal'],
//    'Buy reward': ['cmd:buy-reward'],
//    'Pomodoro': ['tab:dashboard', 'click:.ui-pomodoro__gear']
// 4  'New product': ['tab:food', 'click:button[aria-label="add what was eaten"]',
//      'type:zz test product', 'modal:.suggestion-item@+ new']
//    'Edit item (food)': ['tab:food', 'click:.ui-food__item-name']   (the first eaten thing must
//      be a product, not a 🍲 dish: else name another one with @<its text>)
//    'Edit item': ['tab:dashboard', 'click:.ui-market button[aria-label="edit item"]']
//    'Category': ['cmd:new-market-item', 'type:zz test item', 'modal:.suggestion-item@+ new']
//    'Marks': ['tab:food', 'click:button[aria-label="the marks"]']
// 5  'New dish': ['tab:recipes', 'click:.ui-recipes__add']
//    'Edit dish': ['tab:recipes', 'click:button[aria-label="edit the dish"]']
//    'Instead of': ['tab:recipes', 'click:button[aria-label="edit the dish"]',
//      'modal::is(.ui-form__line, .ui-field-list__line):nth-child(2) '
//        + ':is(.ui-form__cell, .ui-field-list__cell):nth-child(2) button']
//    'To the shopping list?': ['tab:recipes', 'click:.ui-recipes__cart']
// 6  'New medication course': ['cmd:new-meds']
//    'Edit medication course': ['tab:meds', 'click:button[aria-label="edit course"]']
// 7  'New task': ['cmd:new-task', 'type:zz test task', 'modal:.suggestion-item@+ new']
//    'Edit task': ['tab:calendar', 'click:.ui-task__btns-edit']
//    'Edit pool task': ['tab:calendar', 'click:button[aria-label="edit pool task"]']
// 8  'Settings': ['cmd:settings']   (every tab)
// 9  'Dish': ['tab:recipes', 'click:.ui-recipes__name']
//    'Journal': [P, P1, 'click:.ui-project__journal-open']
// with P = 'tab:projects', P1 = 'click:.ui-projects__card' (the first project's page)
(async (OUT, OPENERS) => {
  const PROPS = ["display", "position", "top", "left", "width", "height", "margin", "padding",
    "color", "background-color", "background-image", "border", "border-radius", "box-shadow",
    "font-family", "font-size", "font-weight", "line-height", "text-transform", "letter-spacing",
    "opacity", "transform", "filter", "gap", "flex-direction", "justify-content", "align-items",
    "grid-template-columns", "z-index", "visibility", "content", "text-shadow", "outline",
    "overflow"];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const freeze = document.head.createEl("style", { text: "*, *::before, *::after { "
    + "animation: none !important; transition: none !important; }" });
  const leaves = app.workspace.getLeavesOfType("ui-app");
  const leaf = leaves.find(l => l.view.containerEl.getClientRects().length) ?? leaves[0];
  const was = leaf?.getViewState();
  const windows = () => [...document.querySelectorAll(".modal-container")];
  const top = () => windows().at(-1);
  // the app tab's shadow roots (hosts can nest)
  const roots = () => {
    const out = [];
    const visit = node => {
      for (const e of node.querySelectorAll("*")) {
        if (e.shadowRoot) { out.push(e.shadowRoot); visit(e.shadowRoot); }
      }
    };
    const el = leaf.view.containerEl;

    if (el.shadowRoot) { out.push(el.shadowRoot); visit(el.shadowRoot); }
    visit(el);
    return out;
  };
  const find = (where, spec) => {
    const at = spec.lastIndexOf("@");
    const [css, text] = at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, null];
    const el = where.flatMap(r => [...r.querySelectorAll(css)])
      .find(e => e.getClientRects().length && (!text || e.textContent.trim().includes(text)));

    if (!el) throw new Error(`nothing matches ${spec}`);
    return el;
  };
  const step = async s => {
    const [kind, arg] = [s.slice(0, s.indexOf(":")), s.slice(s.indexOf(":") + 1)];

    if (kind === "cmd") app.commands.executeCommandById(`daily-grimoire:${arg}`);
    else if (kind === "tab") {
      if (!leaf) throw new Error("no open app tab (ui-app)");
      const [page, json] = arg.split("|");

      await leaf.setViewState({ type: was.type, state: { ...was.state, page,
        ...(json ? JSON.parse(json) : {}) } });
    } else if (kind === "click") find(roots(), arg).click();
    else if (kind === "modal") find([top()], arg).click();
    else if (kind === "type") {
      const focused = top().contains(document.activeElement) && document.activeElement;
      const input = focused || top().querySelector(".prompt-input, input");

      input.value = arg;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else throw new Error(`unknown step ${s}`);
    await wait(600);
  };
  // stable: the same element count and markup size twice in a row, 300 ms apart (max 5 s)
  const settle = async el => {
    for (let i = 0, last = null, same = 0; i < 17 && same < 2; i++) {
      const now = `${el.querySelectorAll("*").length}:${el.innerHTML.length}`;

      same = now === last ? same + 1 : 0;
      last = now;
      await wait(300);
    }
  };
  const tag = e => `${e.tagName}${[...e.classList].filter(c => /^ui-/.test(c))
    .map(c => `.${c}`).join("")}`;
  const path = (e, root) => {
    const p = [];

    for (; e && e !== root; e = e.parentElement) {
      p.unshift(`${tag(e)}:${[...e.parentElement.children].indexOf(e)}`);
    }
    return p.join(">") || tag(root);
  };
  const record = (shot, prefix, modal) => {
    for (const e of [modal, ...modal.querySelectorAll("*")]) {
      if (!e.getClientRects().length) continue;
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(e, pseudo);

        if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
        shot[`${prefix} ${path(e, modal)}${pseudo ?? ""}`] =
          PROPS.map(p => cs.getPropertyValue(p)).join("|");
      }
    }
  };
  const shot = {}, errors = {};

  try {
    for (const [name, steps] of Object.entries(OPENERS)) {
      const before = windows().length;

      try {
        for (const s of steps) await step(s);
        for (let i = 0; i < 17 && windows().length <= before; i++) await wait(300);
        if (windows().length <= before) throw new Error("no window opened");
        const modal = top().querySelector(".modal");

        await settle(modal);
        const tabs = [...modal.querySelectorAll(".ui-tabs__tab")];

        if (!tabs.length) record(shot, name, modal);
        for (const t of tabs) {
          t.click();
          await wait(300);
          record(shot, `${name} [${t.textContent.trim()}]`, modal);
        }
      } catch (e) {
        errors[name] = e.message;
      } finally {
        // every window this opener left open, the topmost first: its ×, else Escape (a search)
        for (let i = 0; i < 5 && windows().length > before; i++) {
          const close = top().querySelector(".modal-close-button");

          if (close) close.click();
          else document.activeElement.dispatchEvent(new KeyboardEvent("keydown",
            { key: "Escape", code: "Escape", bubbles: true }));
          await wait(300);
        }
      }
    }
  } finally {
    freeze.remove();
    if (leaf) await leaf.setViewState(was);
  }
  require("fs").writeFileSync(OUT, JSON.stringify(shot));
  return { count: Object.keys(shot).length, errors };
})
