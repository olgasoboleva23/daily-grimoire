import { Component, Modal, type App } from "obsidian";
import { h } from "vue";
import JournalView from "./index.vue";
import { useVueApp } from "#/composables/vueApp.ts";
import { taskStore } from "#/store/tasks.js";

// A project's journal in an Obsidian window (like Form): the timeline, its filter and + Entry,
// drawn by index.vue; its look: index.scss (block ui-journal). Opening a linked note closes it.
export class JournalWindow extends Modal {
  private owner = new Component();   // the window's Vue app unmounts with it
  private project: string;

  constructor(app: App, project: string) {
    super(app);
    this.project = project;
  }

  onOpen() {
    const name = taskStore.projects.get(this.project)?.name ?? "";

    this.titleEl.setText(`🕒 Journal · ${name}`);
    this.modalEl.addClass("ui-journal-window");
    this.owner.load();
    useVueApp(this.owner, this.contentEl, {
      render: () => h(JournalView, { project: this.project, onClose: () => this.close() }),
    });
  }
  onClose() { this.owner.unload(); }
}

export const openJournal = (app: App, project: string) => new JournalWindow(app, project).open();
