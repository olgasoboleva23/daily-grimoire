// The medication course records in courses.json.
import { readJson, collection } from "#/shared/vault/index.js";
import { COURSES } from "#/shared/config/index.js";

export const courses = collection(COURSES);

export const readCourses = () => readJson(COURSES, {});

export const readCourse = async id => (await readCourses())[id] ?? null;
