// Pick a medication course for editing. A single course opens directly.
import { Notice } from "obsidian";
import { Search } from "#/shared/ui/Search/index.ts";
import { app } from "#/shared/host/index.js";
import { readCourseList } from "../model/course.js";

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
