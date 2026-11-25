// Project writes with an in-memory vault and made-up projects, tasks and covers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { taskStore, setDue } from "#/entities/task/index.js";
import { PROJECTS } from "#/shared/config/index.js";
import {
  createProject, saveProject, addStage, addTaskToStage, newProject, editProject, readStage, addLink, removeLink, readProject, renameStage,
} from "#/entities/project/index.js";
import { deleteStage, deleteProject } from "#/pages/projects/index.js";

const MASTER = "00 System/Data/Tasks/Master.md";
const RECORDS = "00 System/Data/Tasks/tasks.json";
const json = files => JSON.parse(files[PROJECTS]);

test("createProject: p1 then p2, the full shape, status active by default", async () => {
  const { files } = vault();
  assert.equal(await createProject({ name: "Garden", description: "beds" }), "p1");
  assert.equal(await createProject({ name: "Shed", status: "idea", cover: "a.webp" }), "p2");
  assert.deepEqual(json(files).p1, {
    name: "Garden", status: "active", description: "beds", result: "", notes: "",
    cover: null, stages: [],
  });
  assert.equal(json(files).p2.status, "idea");
  assert.equal(json(files).p2.cover, "a.webp");
});

test("saveProject merges fields and keeps the rest", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await saveProject("p1", { notes: "x" });
  assert.equal(json(files).p1.notes, "x");
  assert.equal(json(files).p1.name, "Garden");
});

test("addStage appends", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await addStage("p1", "A");
  await addStage("p1", "B");
  assert.deepEqual(json(files).p1.stages, [
    { id: "st1", name: "A", tasks: [] }, { id: "st2", name: "B", tasks: [] },
  ]);
});

test("saveProject and addStage on a missing key write nothing", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  const before = files[PROJECTS];
  await saveProject("p9", { notes: "x" });
  assert.equal(await addStage("p9", "A"), false);
  assert.equal(files[PROJECTS], before);
});

test("addTaskToStage lists the ID once and refuses a missing ID or changed stage", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await addStage("p1", "A");
  assert.equal(await addTaskToStage("p1", 0, "A", "t7"), true);
  assert.equal(await addTaskToStage("p1", 0, "A", "t7"), true);
  assert.deepEqual(json(files).p1.stages[0].tasks, ["t7"]);

  const before = files[PROJECTS];
  assert.equal(await addTaskToStage("p1", 0, "A", null), false);
  assert.equal(files[PROJECTS], before);
  await renameStage("p1", 0, "A", "Z");
  const renamed = files[PROJECTS];
  assert.equal(await addTaskToStage("p1", 0, "A", "t8"), false);
  assert.match(Notice.last, /project changed/);
  assert.equal(files[PROJECTS], renamed);
});

test("setDue puts the task on a day", async () => {
  const { files } = vault({ [MASTER]: "- [ ] t1\n", [RECORDS]: '{"t1":{"name":"walk"}}' });
  taskStore.put(MASTER, files[MASTER]);
  taskStore.putRecords({ t1: { name: "walk" } });
  await setDue(taskStore.tasks[0], "2026-11-12");
  assert.equal(files[MASTER], "- [ ] t1 [due:: 2026-11-12]\n");
});

test("newProject saves the cover returned by the uploader", async () => {
  const { files, app } = vault();
  const file = new File(["image"], "garden.png");
  const upload = async (currentApp, selected) => {
    assert.equal(currentApp, app);
    assert.equal(selected, file);
    return "garden.webp";
  };
  assert.equal(await newProject({ name: " Garden ", status: "idea", cover: file }, upload), "p1");
  assert.equal(await newProject({ name: "Shed", cover: null }, upload), "p2");
  assert.equal(json(files).p1.name, "Garden");
  assert.equal(json(files).p1.status, "idea");
  assert.equal(json(files).p1.cover, "garden.webp");
  assert.equal(json(files).p2.cover, null);
});

test("cover upload failure preserves an existing project and stops creation", async () => {
  const { files, app } = vault();
  const file = new File(["image"], "new.png"), uploads = [];
  const upload = async (currentApp, selected) => {
    assert.equal(currentApp, app);
    uploads.push(selected);
    return "new.webp";
  };
  await createProject({ name: "Garden", cover: "old.webp" });
  const existing = await readProject("p1");
  assert.equal(await editProject("p1", { name: "Garden", cover: file }, existing, upload), true);
  assert.equal(json(files).p1.cover, "new.webp");
  assert.deepEqual(uploads, [file]);
  const before = await readProject("p1");
  const values = { name: "Changed", cover: file };
  const failedUpload = async () => null;
  assert.equal(await editProject("p1", values, before, failedUpload), false);
  assert.equal(await newProject(values, failedUpload), null);
  assert.deepEqual(json(files), { p1: before });
});

test("project and stage writes refuse a null project record", async () => {
  const { files } = vault({ [PROJECTS]: '{"p1":null}' });
  assert.equal(await saveProject("p1", { notes: "x" }), false);
  assert.equal(await addStage("p1", "A"), false);
  assert.equal(await addTaskToStage("p1", 0, "A", "t7"), false);
  assert.equal(files[PROJECTS], '{"p1":null}');
});

test("editing a project preserves fresh stages and an existing cover", async () => {
  const { files } = vault();
  await createProject({ name: "Garden", cover: "old.webp" });
  const before = await readProject("p1");
  await addStage("p1", "Plant");
  assert.equal(await editProject("p1", {
    name: " New garden ", description: "By the fence", showInCalendar: false, cover: null,
  }, before), true);
  assert.deepEqual(json(files).p1, {
    name: "New garden", description: "By the fence", showInCalendar: false,
    cover: "old.webp", status: "active",
    result: "", notes: "", stages: [{ id: "st1", name: "Plant", tasks: [] }],
  });
});

test("editing a changed or deleted project preserves current data", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  const before = await readProject("p1");
  const values = { name: "Old form", description: "", cover: null };
  await saveProject("p1", { name: "Fresh name" });
  assert.equal(await editProject("p1", values, before), false);
  assert.match(Notice.last, /project changed/);
  assert.equal(json(files).p1.name, "Fresh name");
  const upload = async () => assert.fail("a project that already changed must not import a cover");
  assert.equal(await editProject("p1", {
    ...values, cover: new File(["image"], "garden.png"),
  }, before, upload), false);
  files[PROJECTS] = "{}";
  assert.equal(await editProject("p1", values, before), false);
  assert.deepEqual(json(files), {});
});

test("editing still checks project fields after importing a cover", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  const before = await readProject("p1");
  const values = { name: "Old form", cover: new File(["image"], "garden.png") };
  assert.equal(await editProject("p1", values, before, async () => {
    await saveProject("p1", { name: "Fresh name" });
    return "garden.webp";
  }), false);
  assert.deepEqual(json(files).p1, { ...before, name: "Fresh name" });
});

test("deletion removes the project and preserves tasks, history and other projects", async () => {
  const { files } = vault({
    [MASTER]: "- [x] t1 [completion:: 2026-11-13]\n- [ ] t2 [due:: 2026-11-15]\n",
    [RECORDS]: '{"t1":{"name":"Plant"},"t2":{"name":"Water"}}', "cover.webp": "image",
  });
  await createProject({ name: "Garden", cover: "cover.webp" });
  await addStage("p1", "Plant");
  await addTaskToStage("p1", 0, "Plant", "t1");
  await createProject({ name: "Shed" });
  const before = { ...files };
  assert.equal(await deleteProject("p1", await readProject("p1")), true);
  const { "cover.webp": _gone, ...rest } = before;  // the cover went to the trash
  const remaining = { p2: json(before).p2 };
  assert.deepEqual(files, { ...rest, [PROJECTS]: JSON.stringify(remaining, null, 2) });
});

test("deletion does not delete a project changed while its dialog is open", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  const before = await readProject("p1");
  await addStage("p1", "New stage");
  assert.equal(await deleteProject("p1", before), false);
  assert.equal(json(files).p1.stages.length, 1);
});

test("project deletion trashes only existing and unshared covers", async () => {
  const { files } = vault({ "a.webp": "i", "b.webp": "i" });
  const trashed = [], trash = async f => { trashed.push(f.path); };
  const remove = async key => deleteProject(key, await readProject(key), trash);
  await createProject({ name: "One", cover: "a.webp" });
  await createProject({ name: "Two", cover: "a.webp" });
  await createProject({ name: "Three", cover: "b.webp" });
  await createProject({ name: "Four", cover: "gone.webp" });
  await createProject({ name: "Five" });
  await remove("p1");
  assert.deepEqual(trashed, []);
  for (const key of ["p2", "p3", "p4", "p5"]) await remove(key);
  assert.deepEqual(trashed, ["a.webp", "b.webp"]);
  assert.deepEqual(json(files), {});
});

test("a project changed while its delete dialog is open keeps its cover", async () => {
  vault({ "a.webp": "i" });
  const trashed = [];
  await createProject({ name: "One", cover: "a.webp" });
  const before = await readProject("p1");
  await addStage("p1", "S");
  await deleteProject("p1", before, async f => trashed.push(f));
  assert.deepEqual(trashed, []);
});

test("rename and delete a stage by index and name; tasks and the other stages stay", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await addStage("p1", "A");
  await addStage("p1", "B");
  await addTaskToStage("p1", 0, "A", "t1");
  assert.equal(await renameStage("p1", 0, "A", " Dig "), true);
  assert.deepEqual(json(files).p1.stages[0], { id: "st1", name: "Dig", tasks: ["t1"] });
  const before = files[PROJECTS];
  assert.equal(await renameStage("p1", 0, "Dig", null), false);
  assert.equal(await renameStage("p1", 0, "Dig", "  "), false);
  assert.equal(await renameStage("p1", 1, "Zzz", "X"), false);
  assert.match(Notice.last, /project changed/);
  assert.equal(files[PROJECTS], before);

  assert.equal(await readStage("p1", 0, "Old"), null);
  assert.equal(await readStage("p9", 0, "Dig"), null);
  const stage = await readStage("p1", 0, "Dig");
  assert.deepEqual(stage, { id: "st1", name: "Dig", tasks: ["t1"] });
  assert.equal(files[PROJECTS], before);
  assert.equal(await deleteStage("p1", 0, stage, { deleteTasks: false }), true);
  assert.deepEqual(json(files).p1.stages, [{ id: "st2", name: "B", tasks: [] }]);
});

test("deleting a stage with a stale snapshot keeps its current data", async () => {
  const { files } = vault({ [MASTER]: "- [ ] t1\n" });
  await createProject({ name: "Garden" });
  await addStage("p1", "Dig");
  const stage = await readStage("p1", 0, "Dig");
  await addTaskToStage("p1", 0, "Dig", "t1");
  const before = { ...files };
  assert.equal(await deleteStage("p1", 0, stage, { deleteTasks: true }), false);
  assert.equal(await deleteStage("p1", 0, stage, { deleteTasks: false }), false);
  assert.match(Notice.last, /project changed/);
  assert.deepEqual(files, before);
});

test("deleting stage tasks removes only its exclusive open undated copies", async () => {
  const kept = ["- [ ] t1 [due:: 2026-11-21]", "- [ ] t1 [start:: 2026-11-21]",
    "- [x] t1", "- [-] t1", "- [ ] t2", "```", "- [ ] t1", "```", ""].join("\n");
  const { files } = vault({ [MASTER]: "- [ ] t1\n- [ ] t1 [created:: 2026-11-19]\n" + kept,
    [RECORDS]: '{"t1":{"pool":true}}' });
  await createProject({ name: "A" });
  await createProject({ name: "B" });
  await addStage("p1", "Work");
  await addStage("p2", "Other");
  await addTaskToStage("p1", 0, "Work", "t1");
  await addTaskToStage("p1", 0, "Work", "t2");
  await addTaskToStage("p2", 0, "Other", "t2");
  const stage = await readStage("p1", 0, "Work");
  assert.equal(await deleteStage("p1", 0, stage, { deleteTasks: true }), true);
  assert.equal(files[MASTER], kept);
  assert.deepEqual(JSON.parse(files[RECORDS]), { t1: { pool: true } });
  assert.deepEqual(json(files).p2.stages[0].tasks, ["t2"]);
});

test("links accept http(s), default the title to the URL and match it on removal", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  assert.equal(await addLink("p1", { title: " Seeds ", url: " https://a.com/x " }), true);
  assert.equal(await addLink("p1", { title: "", url: "http://b.com" }), true);
  assert.deepEqual(json(files).p1.links, [
    { title: "Seeds", url: "https://a.com/x" }, { title: "http://b.com", url: "http://b.com" },
  ]);
  const before = files[PROJECTS];
  assert.equal(await addLink("p1", { title: "x", url: "javascript:alert(1)" }), false);
  assert.match(Notice.last, /web address/);
  assert.equal(await addLink("p1", { title: "", url: " " }), false);
  assert.equal(files[PROJECTS], before);

  assert.equal(await removeLink("p1", 0, "http://b.com"), false);
  assert.equal(await removeLink("p1", 0, "https://a.com/x"), true);
  assert.deepEqual(json(files).p1.links, [{ title: "http://b.com", url: "http://b.com" }]);
});

test("stage deletion retargets journal entries; project deletion checks ownership", async () => {
  const { NOTES } = await import("#/shared/config/index.js");
  const { files } = vault();
  await createProject({ name: "A" });
  await createProject({ name: "B" });
  await addStage("p1", "Work");
  await addStage("p2", "Work");
  assert.equal(json(files).p2.stages[0].id, "st2");
  const owner = { kind: "project", id: "p1" };
  const target = { kind: "task", id: "t1" };
  const other = { owner: { kind: "project", id: "p2" }, target };
  files[NOTES] = JSON.stringify({ n1: { owner, target: { kind: "stage", id: "st1" } },
    n2: { owner, target }, n3: other, n4: { owner: null, target } });
  assert.equal(await deleteStage("p1", 0, await readStage("p1", 0, "Work"), {}), true);
  assert.deepEqual(JSON.parse(files[NOTES]).n1.target, owner);
  await deleteProject("p1", await readProject("p1"));
  assert.deepEqual(JSON.parse(files[NOTES]), { n3: other, n4: { owner: null, target } });
});

test("renameStage writes a new name only while the original stage is at the index", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await addStage("p1", "Dig");
  await addStage("p1", "Plant");
  const before = files[PROJECTS];
  assert.equal(await renameStage("p1", 0, "Dig", "   "), false);
  assert.equal(await renameStage("p1", 0, "Dig", " Dig "), false);
  assert.equal(await renameStage("p1", 1, "Dig", "Water"), false);
  assert.equal(files[PROJECTS], before);
  assert.equal(await renameStage("p1", 0, "Dig", " Beds "), true);
  assert.deepEqual((await readProject("p1")).stages.map(s => s.name), ["Beds", "Plant"]);
});

test("deleteProject checks its snapshot and keeps shared covers and task history", async () => {
  const history = "- [x] t1 [completion:: 2026-11-13]\n";
  const { files } = vault({ [MASTER]: history, "cover.webp": "image" });
  await createProject({ name: "Garden", cover: "cover.webp" });
  await createProject({ name: "Shed", cover: "cover.webp" });
  const before = await readProject("p1");
  await addStage("p1", "Dig");
  assert.equal(await deleteProject("p1", before), false);
  assert.equal(await deleteProject("p1", await readProject("p1")), true);
  assert.equal(await readProject("p1"), null);
  assert.equal(files["cover.webp"], "image");
  assert.equal(files[MASTER], history);
  assert.equal(await deleteProject("p2", await readProject("p2")), true);
  assert.equal(files["cover.webp"], undefined);
});
