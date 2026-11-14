import { test } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { importCover } from "#/helpers/images.js";
import { vault } from "./stubs/vault.mjs";

function setup(mime = "image/webp") {
  const { app, files } = vault();
  const calls = [], bytes = new Uint8Array([1, 2, 3]).buffer;
  const preset = { name: "WebP", outputFormat: "WEBP", quality: 75, resizeMode: "None" };
  app.plugins.plugins["image-converter"] = {
    settings: { selectedConversionPreset: "WebP", conversionPresets: [preset] },
    imageProcessor: { processImage: async (...args) => { calls.push(args); return bytes; } },
    supportedImageFormats: {
      getMimeTypeFromFile: async () => mime,
      getExtensionsFromMimeType: type => ({ "image/webp": ["webp"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"] })[type],
    },
  };
  app.fileManager.getAvailablePathForAttachment = async name => {
    let path = `Media/${name}`, n = 0;
    while (path in files) path = `Media/${++n}-${name}`;
    return path;
  };
  app.vault.createBinary = async (path, data) => { files[path] = data; return { path }; };
  return { app, files, calls, bytes };
}

test("cover uses Image Converter's WebP preset and saves its bytes to a free attachment path", async () => {
  const { app, files, calls, bytes } = setup();
  const file = new File(["image"], "garden.png", { type: "image/png" });
  files["Media/garden.webp"] = "existing";
  assert.equal(await importCover(app, file), "Media/1-garden.webp");
  assert.equal(files["Media/garden.webp"], "existing");
  assert.equal(files["Media/1-garden.webp"], bytes);
  assert.equal(calls[0][0], file);
  assert.equal(calls[0][1], "WEBP");
  assert.equal(calls[0][2], 0.75);
  assert.equal(calls[0][4], "None");
});

test("concurrent uploads with the same name do not overwrite each other", async () => {
  const { app } = setup();
  const file = new File(["image"], "garden.png");
  assert.deepEqual(await Promise.all([importCover(app, file), importCover(app, file)]),
    ["Media/garden.webp", "Media/1-garden.webp"]);
});

test("missing converter and conversion failures leave attachments untouched and explain the failure", async () => {
  const { app, files } = setup();
  const file = new File(["image"], "garden.png");
  app.plugins.plugins["image-converter"].imageProcessor.processImage = async () => { throw new Error("decode failed"); };
  assert.equal(await importCover(app, file), null);
  assert.match(Notice.last, /decode failed/);
  delete app.plugins.plugins["image-converter"];
  assert.equal(await importCover(app, file), null);
  assert.match(Notice.last, /Enable the image-converter/);
  assert.deepEqual(files, {});
});

test("a smaller original-format result keeps the matching extension and converter bytes", async () => {
  for (const [mime, extension] of [["image/png", "png"], ["image/jpeg", "jpg"]]) {
    const { app, files, bytes } = setup(mime);
    const path = await importCover(app, new File(["image"], "garden.png"));
    assert.equal(path, `Media/garden.${extension}`);
    assert.equal(files[path], bytes);
  }
});

test("an unrecognized conversion result writes nothing", async () => {
  const { app, files } = setup("unknown");
  assert.equal(await importCover(app, new File(["image"], "garden.png")), null);
  assert.match(Notice.last, /format is unknown/);
  assert.deepEqual(files, {});
});
