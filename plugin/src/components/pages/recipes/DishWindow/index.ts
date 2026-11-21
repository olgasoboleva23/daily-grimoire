import { Component, Modal, type App } from "obsidian";
import { h } from "vue";
import DishView from "./index.vue";
import { useVueApp } from "#/composables/vueApp.ts";

// A dish in an Obsidian window (like Form): its ingredients, its marks and its recipe note's
// steps, one place to read while cooking; drawn by index.vue, its look: index.scss (block
// ui-dish). The title is the dish's name once it is read; 📄 and 🗑 close the window.
export class DishWindow extends Modal {
  private owner = new Component();   // the window's Vue app and the note's drawing unload with it
  dish: string;

  constructor(app: App, dish: string) {
    super(app);
    this.dish = dish;
  }

  onOpen() {
    this.titleEl.setText("🍲");
    this.modalEl.addClass("ui-dish-window");
    this.owner.load();
    useVueApp(this.owner, this.contentEl, {
      render: () => h(DishView, {
        dish: this.dish, owner: this.owner,
        onTitle: (name: string) => this.titleEl.setText(`🍲 ${name}`),
        onClose: () => this.close(),
      }),
    });
  }
  onClose() { this.owner.unload(); }
}

export const openDish = (app: App, dish: string) => new DishWindow(app, dish).open();
