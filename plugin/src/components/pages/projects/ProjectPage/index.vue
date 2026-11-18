<!-- A project's page (block ui-project): ← Projects, the header card (cover, name, the status
     pill: a menu of the statuses, description, progress) over two columns: the stages (+ stage
     adds one) | Links (+ link, × removes), Result and Notes, each with Edit (a Form). One
     column on the phone -->
<script setup>
import { computed, inject, ref } from "vue";
import { Menu } from "obsidian";
import UiAddForm from "#/components/uikit/UiAddForm/index.vue";
import UiProgress from "#/components/uikit/UiProgress/index.vue";
import UiButton from "#/components/uikit/UiButton/index.vue";
import UiCard from "#/components/uikit/UiCard/index.vue";
import { Form } from "#/components/uikit/Form/index.ts";
import { app } from "#/helpers/app.js";
import {
  addStage, saveProject, askEditProject, askDeleteProject, askAddLink, removeLink,
  copyProjectPrompt,
} from "#/controllers/projects.js";
import { stageTasks, taskStore } from "#/store/tasks.js";
import { FILTERS } from "#/store/projects.js";
import { coverUrl } from "../cover.js";
import ProjectStatus from "../ProjectStatus/index.vue";
import ProjectStage from "./ProjectStage.vue";

const projects = inject("projects");
const state = projects.state;
const label = s => `${s[0].toUpperCase()}${s.slice(1)}`;
const SIDE = [{ key: "result", name: "Result" }, { key: "notes", name: "Notes" }];

// the project and its stages' tasks (read again when the tasks or projects change)
const page = computed(() => {
  void projects.version.value;
  const p = taskStore.projects.get(state.open);
  const stages = (p.stages ?? []).map(s => ({ name: s.name, entries: stageTasks(s) }));
  const entries = stages.flatMap(s => s.entries);

  return {
    key: state.open, p, cover: coverUrl(p, app), stages,
    done: entries.filter(e => e.done).length, total: entries.length,
  };
});
const stageName = ref("");

function statusMenu(e) {
  const menu = new Menu();

  for (const s of FILTERS.slice(1)) {
    menu.addItem(i => i.setTitle(label(s)).setChecked(page.value.p.status === s)
      .onClick(() => saveProject(page.value.key, { status: s })));
  }

  menu.showAtMouseEvent(e);
}

async function edit({ key: field, name }) {
  const project = state.open;  // kept before the Form: the page may be gone when it answers
  const values = { [field]: page.value.p[field] ?? "" };
  const got = await Form.ask(
    app, `✦ ${name}`, [{ name, key: field, text: "", lines: true }], { values, submit: "Save" },
  );

  if (got) await saveProject(project, { [field]: got[field] });
}

async function newStage(name) {
  if (!name.trim()) return;
  await addStage(page.value.key, name.trim());
  stageName.value = "";
}

async function remove() {
  const key = page.value.key;

  if (await askDeleteProject(app, key) && state.open === key) projects.open(null);
}
</script>

<template>
  <div class="ui-project">
    <UiButton kind="chip" class="ui-project__back" @click="projects.open(null, $event)">
      ← Projects
    </UiButton>
    <UiCard
      :wings="false"
      class="ui-project__header"
      :title="page.p.name"
      :cover="page.cover"
      placeholder="project"
    >
      <template #button>
        <UiButton
          kind="text"
          class="ui-project__status"
          title="Status"
          @click="statusMenu"
        >
          <ProjectStatus :status="page.p.status" />
        </UiButton>
      </template>
      <div v-if="page.p.description" class="ui-project__description">{{
        page.p.description }}</div>
      <UiProgress v-if="page.total" :value="page.done" :max="page.total" />
      <div class="ui-row ui-gap-s">
        <UiButton kind="chip" @click="askEditProject(app, page.key)">Edit project</UiButton>
        <UiButton kind="chip" @click="remove">Delete project</UiButton>
      </div>
    </UiCard>
    <div class="ui-project__body">
      <div class="ui-col ui-gap-l">
        <ProjectStage
          v-for="(s, i) in page.stages"
          :key="`${i} ${s.name}`"
          :project="page.key"
          :index="i"
          :stage="s"
        />
        <UiAddForm
          v-model="stageName"
          :input="{ placeholder: 'New stage' }"
          submit="+ stage"
          on-background
          @submit="newStage"
        />
      </div>
      <div class="ui-col ui-gap-l">
        <UiCard :wings="false" class="ui-project__links" title="Links">
          <div
            v-for="(l, i) in page.p.links ?? []"
            :key="`${i} ${l.url}`"
            class="ui-project__link ui-row ui-gap-s"
          >
            <a
              class="ui-project__link-a ui-grow"
              :href="l.url"
              target="_blank"
              rel="noopener"
            >{{ l.title }}</a>
            <UiButton title="remove" @click="removeLink(page.key, i, l.url)">×</UiButton>
          </div>
          <div class="ui-row ui-gap-s">
            <UiButton kind="chip" class="ui-project__edit" @click="askAddLink(app, page.key)">
              + link
            </UiButton>
          </div>
        </UiCard>
        <UiCard
          v-for="f in SIDE"
          :key="f.key"
          :wings="false"
          :class="`ui-project__${f.key}`"
          :title="f.name"
        >
          <div class="ui-project__text">{{ page.p[f.key] }}</div>
          <div class="ui-row ui-gap-s">
            <UiButton kind="chip" class="ui-project__edit" @click="edit(f)">Edit</UiButton>
            <UiButton
              v-if="f.key === 'result'"
              kind="chip"
              @click="copyProjectPrompt(page.p.name)"
            >Скопировать промпт</UiButton>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
