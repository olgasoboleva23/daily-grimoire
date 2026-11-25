// web links of a project: [{ title, url }], none in the older projects
export const isWebUrl = u => /^https?:\/\/\S+$/i.test(u);
