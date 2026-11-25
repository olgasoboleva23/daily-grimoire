// Rules for reordering a task within its own group.
import { T } from "./task.js";
import { dayGroup } from "./daytime.js";

// a task dragged onto another of its day: it moves before or after it only within its group and
// (the order is the record's), among its siblings (a subtask under its parent), and neither follows
// a lead (#after: it stays under it); both need an id. Told apart by id, not by object: the
// dragged task is from the draw its drag began in, and the tab may draw again before the drop
export const canReorder = (a, b) => !!T(a).id && !!T(b).id && T(a).id !== T(b).id
  && a.parent === b.parent
  && dayGroup(a) === dayGroup(b) && T(a).daytime === T(b).daytime && !T(a).after && !T(b).after;
