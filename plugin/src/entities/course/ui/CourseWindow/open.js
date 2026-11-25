// Opening a medication course's window (CourseWindow): New medication course (the command), then
// the Medication page in a new tab; Edit medication course (the command after the course is
// picked, the ✎ on its card) with its values as they are on disk now, so a course changed
// meanwhile is not overwritten. Resolve to what the window gives, null closed.
import { Notice } from "obsidian";
import { openWindow } from "#/shared/ui/Window/index.ts";
import { openUi } from "#/shared/host/index.js";
import { formValues } from "../../model/course.js";
import { readCourse } from "../../model/repository/courses.js";
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
