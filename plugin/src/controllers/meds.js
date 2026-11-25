// Medication course reads and writes in courses.json, including dose marks and day notes.
// The Medication page uses these records for its tabs and intake tables.
import { Notice } from "obsidian";
import { readJson, collection } from "#/shared/vault/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { COURSES } from "#/shared/config/index.js";
import {
  courseData, courseList, courseOf, edited, formValues, intake, withDayNote, withMark,
} from "#/models/course.js";

export const courses = collection(COURSES);
const by = (json, fn) => Object.fromEntries(Object.entries(json).map(([id, r]) => [id, fn(r)]));

export async function loadMeds() {
  const json = await readJson(COURSES, {}), today = todayYmd();

  return {
    list: courseList(json, today), data: by(json, r => courseData(r, today)),
    notes: by(json, r => r.notes), intake: by(json, r => intake(r.meds)),
  };
}

export const tickMeds = (id, date, key, mark) =>
  courses.update(id, r => withMark(r, date, key, mark));

export const setDayNote = (id, date, text) => courses.update(id, r => withDayNote(r, date, text));

export const createCourse = values => courses.add(courseOf(values, todayYmd()), "c");

export const readCourse = async id => (await readJson(COURSES, {}))[id] ?? null;

const courseGone = () => new Notice("✦ that course is gone");

// before is JSON.stringify(formValues(record)); intake marks and day notes aren't part of it.
export async function saveCourse(id, values, before) {
  let changed = false;
  const saved = await courses.update(id, r => {
    changed = JSON.stringify(formValues(r)) !== before;
    return changed ? null : edited(r, values);
  });

  if (changed) {
    new Notice("✦ the course changed meanwhile: open its window again");
    return "changed";
  }

  if (!saved) {
    courseGone();
    return "gone";
  }

  return "saved";
}

export const readCourseList = async () => courseList(await readJson(COURSES, {}), todayYmd());
