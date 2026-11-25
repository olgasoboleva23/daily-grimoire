// Opening a medication course's window (CourseWindow): New medication course (the command), then
// the Medication page in a new tab; Edit medication course (the command after the course is
// picked, the ✎ on its card) with its values as they are on disk now, so a course changed
// meanwhile is not overwritten. Resolve to what the window gives, null closed.
import { Notice } from "obsidian";
import { openWindow } from "#/components/uikit/Window/open.ts";
import { Search } from "#/components/uikit/Search/index.ts";
import { openUi } from "#/components/app/open.ts";
import { readCourse, readCourseList } from "#/controllers/meds.js";
import { app } from "#/helpers/app.js";
import { formValues } from "#/models/course.js";
import CourseWindow from "./index.vue";

export async function openNewCourse() {
  const id = await openWindow(CourseWindow);

  if (id) await openUi("meds", {}, true);
  return id;
}

export async function openEditCourse(id) {
  const rec = await readCourse(id);

  if (!rec) return void new Notice("✦ that course is gone");
  const values = formValues(rec);

  return openWindow(CourseWindow, { id, values, before: JSON.stringify(values) });
}

export async function pickCourse() {
  const list = await readCourseList();

  if (!list.length) {
    new Notice("✦ no medication course yet");
    return null;
  }

  if (list.length === 1) return list[0].id;
  const course = await Search.pick(app, "Which course…",
    q => list.filter(c => c.label.toLowerCase().includes(q.trim().toLowerCase())),
    (c, el) => void el.createDiv({ text: c.label }));

  return course?.id ?? null;
}
