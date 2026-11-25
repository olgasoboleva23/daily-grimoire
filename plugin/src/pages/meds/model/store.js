// Medication page tabs, notes and daily intake tables.
import { todayYmd } from "#/shared/lib/dates.js";
import { courseData, courseList, intake, readCourses } from "#/entities/course/index.js";

const by = (json, fn) => Object.fromEntries(Object.entries(json).map(([id, r]) => [id, fn(r)]));

export async function loadMeds() {
  const json = await readCourses(), today = todayYmd();

  return {
    list: courseList(json, today), data: by(json, r => courseData(r, today)),
    notes: by(json, r => r.notes), intake: by(json, r => intake(r.meds)),
  };
}
