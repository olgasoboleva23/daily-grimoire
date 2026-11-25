// the cover's resource path; null when there is no cover or its file is gone (the card then shows
// its placeholder block)
export function coverUrl(project, app) {
  const file = project.cover && app.vault.getFileByPath(project.cover);

  return file ? app.vault.getResourcePath(file) : null;
}
