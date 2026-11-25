// Image Converter 1.4.4's imageProcessor owns conversion; Obsidian picks a free attachment path.
import { Notice } from "obsidian";
import { serial } from "./files.js";

const write = serial();

export async function importCover(app, file) {
  const converter = app.plugins.plugins["image-converter"];

  if (!converter?.imageProcessor || !converter?.supportedImageFormats) {
    new Notice("Enable the image-converter plugin to upload a cover.");
    return null;
  }

  try {
    const settings = converter.settings;
    const preset = settings.conversionPresets.find(p =>
      p.name === settings.selectedConversionPreset && p.outputFormat === "WEBP")
      ?? settings.conversionPresets.find(p => p.outputFormat === "WEBP");

    if (!preset) throw new Error("Choose a WebP preset in Image Converter.");
    const data = await converter.imageProcessor.processImage(
      file, "WEBP", preset.quality / 100, preset.colorDepth, preset.resizeMode,
      preset.desiredWidth, preset.desiredHeight, preset.desiredLongestEdge,
      preset.enlargeOrReduce, preset.allowLargerFiles, preset, settings,
    );
    const mime = await converter.supportedImageFormats.getMimeTypeFromFile(new Blob([data]));

    // Keep the converter's smallest result, which may use the original format instead of WebP.
    const extension = converter.supportedImageFormats.getExtensionsFromMimeType(mime)?.[0];

    if (!extension || !data.byteLength) throw new Error("The converted image format is unknown.");
    return await write(async () => {
      const name = `${file.name.replace(/\.[^.]+$/, "")}.${extension}`;
      const path = await app.fileManager.getAvailablePathForAttachment(name);
      const saved = await app.vault.createBinary(path, data);

      return saved.path;
    });
  } catch (error) {
    new Notice(`Cover not saved: ${error.message}`);
    return null;
  }
}
