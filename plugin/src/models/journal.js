export function journalOf(key, { projects, notes, tasks }) {
  const project = projects.get(key);
  const stages = project?.stages ?? [];
  const entries = [];

  for (const [id, note] of notes) {
    if (note.owner?.kind !== "project" || note.owner.id !== key) continue;
    const { target } = note;
    let name, label;

    if (target.kind === "project") {
      name = projects.get(target.id)?.name;
      label = "Project";
    } else if (target.kind === "stage") {
      const i = stages.findIndex(s => s.id === target.id);

      name = stages[i]?.name;
      label = name && `Stage ${String(i + 1).padStart(2, "0")} · ${name}`;
    } else if (stages.some(s => s.tasks?.includes(target.id))) {
      name = tasks.get(target.id)?.name;
      label = name && `Task · ${name}`;
    }

    const missing = `${target.kind} deleted`;

    entries.push({ ...note, id, heading: note.title || name || missing,
      label: label || missing, gone: !name });
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at) 
    || Number(b.id.slice(1)) - Number(a.id.slice(1)));
}
