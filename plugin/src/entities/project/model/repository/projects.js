// The projects.json collection and current project / stage snapshots.
import { PROJECTS } from "#/shared/config/index.js";
import { collection, readJson } from "#/shared/vault/index.js";

export const projects = collection(PROJECTS);

export const readProject = async key => (await readJson(PROJECTS, {}))[key] ?? null;

export async function readStage(key, index, name) {
  const stage = (await readProject(key))?.stages?.[index];

  return stage && stage.name === name ? stage : null;
}
