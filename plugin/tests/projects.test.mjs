import { test } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { taskStore } from "#/store/tasks.js";
import { PROJECTS } from "#/helpers/paths.js";
import {
  createProject, saveProject, addStage, addToStage, toCalendar, askNewProject,
  askEditProject, askDeleteProject, askRenameStage, askDeleteStage, askAddLink, removeLink,
} from "#/controllers/projects.js";

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
  assert.deepEqual(json(files).p1.stages, [{ name: "A", tasks: [] }, { name: "B", tasks: [] }]);
});

test("saveProject and addStage on a missing key write nothing", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  const before = files[PROJECTS];
  await saveProject("p9", { notes: "x" });
  assert.equal(await addStage("p9", "A"), false);
  assert.equal(files[PROJECTS], before);
});

test("addToStage: lists the id once; null or a changed stage writes nothing", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await addStage("p1", "A");
  assert.equal(await addToStage("p1", 0, "A", async () => "t7"), "t7");
  await addToStage("p1", 0, "A", async () => "t7");
  assert.deepEqual(json(files).p1.stages[0].tasks, ["t7"]);

  const before = files[PROJECTS];
  assert.equal(await addToStage("p1", 0, "A", async () => null), null);
  assert.equal(await addToStage("p1", 0, "Z", async () => "t8"), null);
  assert.match(Notice.last, /project changed/);
  assert.equal(files[PROJECTS], before);
});

test("toCalendar puts the task on a day", async () => {
  const { files } = vault({ [MASTER]: "- [ ] t1\n", [RECORDS]: '{"t1":{"name":"walk"}}' });
  taskStore.put(MASTER, files[MASTER]);
  taskStore.putRecords({ t1: { name: "walk" } });
  await toCalendar(taskStore.tasks[0], "2026-11-12");
  assert.equal(files[MASTER], "- [ ] t1 [due:: 2026-11-12]\n");
});

test("askNewProject opens the app tab on the new project", async () => {
  const { files, app } = vault();
  const seen = [];
  const open = async (...a) => seen.push(a);
  const ask = async (_app, _title, _rows, o) => {
    assert.equal(o.values.status, "active");
    return { name: "Garden", description: "beds", status: "idea", cover: { name: "garden.png" } };
  };

  assert.equal(await askNewProject(app, ask, async () => "03 Resources/Media/a.webp", open), "p1");
  assert.deepEqual(json(files).p1.cover, "03 Resources/Media/a.webp");
  assert.equal(json(files).p1.status, "idea");
  assert.deepEqual(seen, [["projects", { open: "p1" }]]);

  assert.equal(await askNewProject(app, async () => null), null);
  assert.deepEqual(Object.keys(json(files)), ["p1"]);
});

test("cover upload belongs to submission; failure preserves an existing project and stops creation", async () => {
  const { files, app } = vault();
  const file = { name: "new.png" }, uploads = [];
  const upload = async (_app, selected) => { uploads.push(selected); return "new.webp"; };
  await createProject({ name: "Garden", cover: "old.webp" });
  await askEditProject(app, "p1", async () => null, upload);
  assert.equal(uploads.length, 0);
  await askEditProject(app, "p1", async () => ({ name: "Garden", cover: file }), upload);
  assert.equal(json(files).p1.cover, "new.webp");
  assert.deepEqual(uploads, [file]);
  const before = files[PROJECTS];
  const ask = async () => ({ name: "Changed", cover: file });
  await askEditProject(app, "p1", ask, async () => null);
  assert.equal(await askNewProject(app, ask, async () => null), null);
  assert.equal(files[PROJECTS], before);
});

test("a null project in projects.json: saveProject and addStage write nothing, addToStage null", async () => {
  const { files } = vault({ [PROJECTS]: '{"p1":null}' });
  assert.equal(await saveProject("p1", { notes: "x" }), false);
  assert.equal(await addStage("p1", "A"), false);
  assert.equal(await addToStage("p1", 0, "A", async () => "t7"), null);
  assert.equal(files[PROJECTS], '{"p1":null}');
});

test("project editing changes its name/description, preserves fresh stages and keeps the cover", async () => {
  const { files, app } = vault();
  await createProject({ name: "Garden", cover: "old.webp" });
  await askEditProject(app, "p1", async (_app, _title, rows, options) => {
    assert.equal(options.values.name, "Garden");
    assert.ok(rows.some(r => r.key === "cover" && r.file));
    await addStage("p1", "Plant");
    return { name: "New garden", description: "By the fence" };
  });
  assert.deepEqual(json(files).p1, {
    name: "New garden", description: "By the fence", cover: "old.webp", status: "active",
    result: "", notes: "", stages: [{ name: "Plant", tasks: [] }],
  });
});

test("cancelled, stale and deleted project forms preserve current data", async () => {
  const { files, app } = vault();
  await createProject({ name: "Garden" });
  const before = files[PROJECTS];
  await askEditProject(app, "p1", async () => null);
  assert.equal(files[PROJECTS], before);
  await askEditProject(app, "p1", async () => {
    await saveProject("p1", { name: "Fresh name" });
    return { name: "Old form", description: "" };
  });
  assert.equal(json(files).p1.name, "Fresh name");
  await askEditProject(app, "p1", async () => {
    files[PROJECTS] = "{}";
    return { name: "Old form", description: "" };
  });
  assert.deepEqual(json(files), {});
});

test("deletion confirms the project and preserves tasks, history, other projects and images", async () => {
  const { files, app } = vault({
    [MASTER]: "- [x] t1 [completion:: 2026-11-13]\n- [ ] t2 [due:: 2026-11-15]\n",
    [RECORDS]: '{"t1":{"name":"Plant"},"t2":{"name":"Water"}}', "cover.webp": "image",
  });
  await createProject({ name: "Garden", cover: "cover.webp" });
  await addStage("p1", "Plant");
  await addToStage("p1", 0, "Plant", async () => "t1");
  await createProject({ name: "Shed" });
  const before = { ...files };
  assert.equal(await askDeleteProject(app, "p1", async () => null), false);
  assert.deepEqual(files, before);
  assert.equal(await askDeleteProject(app, "p1", async (_app, _title, _rows, options) => {
    assert.equal(options.values.name, "Garden");
    return {};
  }), true);
  const { "cover.webp": _gone, ...rest } = before;  // the cover went to the trash
  assert.deepEqual(files, { ...rest, [PROJECTS]: JSON.stringify({ p2: json(before).p2 }, null, 2) });
});

test("confirmation does not delete a project changed while its dialog is open", async () => {
  const { files, app } = vault();
  await createProject({ name: "Garden" });
  assert.equal(await askDeleteProject(app, "p1", async () => {
    await addStage("p1", "New stage");
    return {};
  }), false);
  assert.equal(json(files).p1.stages.length, 1);
});

test("deleting a project trashes its cover, unless another project uses the file or it is gone", async () => {
  const { files, app } = vault({ "a.webp": "i", "b.webp": "i" });
  const trashed = [], trash = async f => { trashed.push(f.path); };
  const yes = async (_a, _t, rows, o) => { yes.kept = o.values.kept; return {}; };
  await createProject({ name: "One", cover: "a.webp" });
  await createProject({ name: "Two", cover: "a.webp" });
  await createProject({ name: "Three", cover: "b.webp" });
  await createProject({ name: "Four", cover: "gone.webp" });
  await createProject({ name: "Five" });
  assert.equal(await askDeleteProject(app, "p1", async () => null, trash), false);
  assert.deepEqual(trashed, []);
  await askDeleteProject(app, "p1", yes, trash);
  assert.match(yes.kept, /cover goes to the trash/);
  assert.deepEqual(trashed, []);
  await askDeleteProject(app, "p2", yes, trash);
  await askDeleteProject(app, "p3", yes, trash);
  await askDeleteProject(app, "p4", yes, trash);
  await askDeleteProject(app, "p5", yes, trash);
  assert.deepEqual(trashed, ["a.webp", "b.webp"]);
  assert.deepEqual(json(files), {});
});

test("a project changed while its delete dialog is open keeps its cover", async () => {
  const { app } = vault({ "a.webp": "i" });
  const trashed = [];
  await createProject({ name: "One", cover: "a.webp" });
  await askDeleteProject(app, "p1", async () => { await addStage("p1", "S"); return {}; },
    async f => trashed.push(f));
  assert.deepEqual(trashed, []);
});

test("rename and delete a stage by index and name; tasks and the other stages stay", async () => {
  const { files, app } = vault();
  await createProject({ name: "Garden" });
  await addStage("p1", "A");
  await addStage("p1", "B");
  await addToStage("p1", 0, "A", async () => "t1");
  assert.equal(await askRenameStage(app, "p1", 0, "A", async () => ({ name: " Dig " })), true);
  assert.deepEqual(json(files).p1.stages[0], { name: "Dig", tasks: ["t1"] });
  const before = files[PROJECTS];
  assert.equal(await askRenameStage(app, "p1", 0, "Dig", async () => null), false);
  assert.equal(await askRenameStage(app, "p1", 0, "Dig", async () => ({ name: "  " })), false);
  assert.equal(await askRenameStage(app, "p1", 1, "Zzz", async () => ({ name: "X" })), false);
  assert.match(Notice.last, /project changed/);
  assert.equal(files[PROJECTS], before);

  assert.equal(await askDeleteStage(app, "p1", 0, "Dig", async () => null), false);
  assert.equal(await askDeleteStage(app, "p1", 0, "Old", async () => ({})), false);
  assert.equal(files[PROJECTS], before);
  assert.equal(await askDeleteStage(app, "p1", 0, "Dig", async () => ({})), true);
  assert.deepEqual(json(files).p1.stages, [{ name: "B", tasks: [] }]);
});

test("links: added (title defaults to the url), only http(s), removed by index and url", async () => {
  const { files, app } = vault();
  await createProject({ name: "Garden" });
  assert.equal(await askAddLink(app, "p1", async () => ({ title: " Seeds ", url: "https://a.com/x" })), true);
  assert.equal(await askAddLink(app, "p1", async () => ({ title: "", url: "http://b.com" })), true);
  assert.deepEqual(json(files).p1.links, [
    { title: "Seeds", url: "https://a.com/x" }, { title: "http://b.com", url: "http://b.com" },
  ]);
  const before = files[PROJECTS];
  assert.equal(await askAddLink(app, "p1", async () => ({ title: "x", url: "javascript:alert(1)" })), false);
  assert.match(Notice.last, /web address/);
  assert.equal(await askAddLink(app, "p1", async () => null), false);
  assert.equal(files[PROJECTS], before);

  assert.equal(await removeLink("p1", 0, "http://b.com"), false);
  assert.equal(await removeLink("p1", 0, "https://a.com/x"), true);
  assert.deepEqual(json(files).p1.links, [{ title: "http://b.com", url: "http://b.com" }]);
});
