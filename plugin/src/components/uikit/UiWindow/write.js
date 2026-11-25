// A topic window's submit, the rule in one place: `run(write)` runs the window's write once at a
// time (`busy` greys UiWindow's button meanwhile) and emits done(result) when it gives one. A
// write that gives nothing (it said why in a notice: a stale project, a cover not imported) or
// throws ("✦ Not saved (…)") leaves the window open with what was typed.
import { Notice } from "obsidian";
import { ref } from "vue";

export function useWrite(emit) {
  const busy = ref(false);

  async function run(write) {
    if (busy.value) return;
    busy.value = true;
    try {
      const result = await write();

      if (result) emit("done", result);
    } catch (error) {
      new Notice(`✦ Not saved (${error.message})`);
    } finally {
      busy.value = false;
    }
  }

  return { busy, run };
}
