// A short message with a button that runs the supplied undo.
import { Notice } from "obsidian";

// the notice "<mark> <task>  Undo" for 8 s
export function undoNotice(mark, label, undo) {
  if (!undo) return;
  const frag = document.createDocumentFragment();

  frag.append(`${mark} ${label.slice(0, 40)}  `);
  const button = frag.appendChild(document.createElement("button"));

  button.textContent = "Undo";
  button.onclick = undo;
  new Notice(frag, 8000);
}
