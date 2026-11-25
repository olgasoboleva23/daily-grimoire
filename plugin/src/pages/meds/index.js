// Meds page view, data loader and changes that refresh it.
import { COURSES } from "#/shared/config/index.js";
import { loadMeds } from "./model/store.js";
import View from "./ui/index.vue";

export default {
  view: View, load: loadMeds, watches: [COURSES],
};
