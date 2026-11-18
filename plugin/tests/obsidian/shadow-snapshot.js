// Run inside Obsidian (obsidian eval): the same computed-styles snapshot as styles-snapshot.js, for the
// isolated application tab (type "ui-app"), whose DOM lives in a Shadow DOM. Switches the open tab to each page,
// waits until its shadow content stops changing (max 5 s), records every visible element (and its ::before /
// ::after with content) of the tab's shadow roots, then restores the tab's page. Same JSON shape, so
// tests/obsidian/compare-snapshots.mjs works on it. Desktop only: never call app.emulateMobile.
// obsidian vault="…" eval code="($(cat tests/obsidian/shadow-snapshot.js))('/tmp/a.json', ['dashboard', 'calendar'])"
(async (OUT, PAGES) => {
  const PROPS = ["display", "position", "top", "left", "width", "height", "margin", "padding", "color", "background-color",
    "background-image", "border", "border-radius", "box-shadow", "font-family", "font-size", "font-weight", "line-height",
    "text-transform", "letter-spacing", "opacity", "transform", "filter", "gap", "flex-direction", "justify-content",
    "align-items", "grid-template-columns", "z-index", "visibility", "content", "text-shadow", "outline", "overflow"];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const leaf = app.workspace.getLeavesOfType("ui-app")[0];
  if (!leaf) throw new Error("no open ui-app tab");
  const was = leaf.getViewState();
  // every shadow root under the tab (hosts can nest), with the path of its host
  const roots = () => {
    const out = [];
    const visit = (node, prefix) => {
      for (const e of node.querySelectorAll("*")) {
        if (!e.shadowRoot) continue;
        const p = `${prefix}${tag(e)}`;
        out.push([e.shadowRoot, p]);
        visit(e.shadowRoot, `${p}>`);
      }
    };
    const el = leaf.view.containerEl;
    if (el.shadowRoot) out.push([el.shadowRoot, "host"]), visit(el.shadowRoot, "host>");
    visit(el, "");
    return out;
  };
  const tag = e => `${e.tagName}${[...e.classList].filter(c => /^ui-/.test(c)).map(c => "." + c).join("")}`;
  const path = (e, root) => {
    const p = [];
    for (; e && e !== root; e = e.parentElement) p.unshift(`${tag(e)}:${[...(e.parentElement ?? root).children].indexOf(e)}`);
    return p.join(">");
  };
  const freeze = new CSSStyleSheet();
  freeze.replaceSync("*, *::before, *::after { animation: none !important; transition: none !important; }");
  const frozen = new Set();
  const stamp = () => roots().map(([r]) => {
    if (!frozen.has(r)) { r.adoptedStyleSheets = [...r.adoptedStyleSheets, freeze]; frozen.add(r); }
    return `${r.querySelectorAll("*").length}:${r.innerHTML.length}`;
  }).join("|");
  const shot = {};
  try {
    for (const page of PAGES) {
      await leaf.setViewState({ type: was.type, state: { ...was.state, page } });
      await wait(300);
      // stable = the same element count and markup size twice in a row, 300 ms apart
      for (let i = 0, last = null, same = 0; i < 17 && same < 2; i++) {
        const now = stamp();
        same = now === last ? same + 1 : 0;
        last = now;
        await wait(300);
      }
      const all = roots();
      if (!all.length) throw new Error(`${page}: no shadow root`);
      for (const [root, host] of all) {
        for (const e of root.querySelectorAll("*")) {
          if (!e.getClientRects().length) continue;
          for (const pseudo of [null, "::before", "::after"]) {
            const cs = getComputedStyle(e, pseudo);
            if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
            shot[`${page} ${host} ${path(e, root)}${pseudo ?? ""}`] = PROPS.map(p => cs.getPropertyValue(p)).join("|");
          }
        }
      }
    }
  } finally {
    for (const r of frozen) r.adoptedStyleSheets = r.adoptedStyleSheets.filter(s => s !== freeze);
    await leaf.setViewState(was);
  }
  require("fs").writeFileSync(OUT, JSON.stringify(shot));
  return Object.keys(shot).length;
})
