// A short message with a button that runs the supplied undo.
import { Notice } from "obsidian";

// the notice "<mark> <task>  Undo" for 8 s
export function undoNotice(label, undo) {
  const frag = document.createDocumentFragment();

  frag.append(`${label}  `);
  const button = frag.appendChild(document.createElement("button"));

  button.textContent = "Undo";
  button.onclick = undo;
  new Notice(frag, 8000);
}
