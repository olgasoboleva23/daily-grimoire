// Public entry for task.
export { variantsProblem, recordOf } from "./contract/task.js";

export { moveAreas, restoreAreas } from "./model/area.js";

export { taskChoices } from "./model/choice.js";

export { dayGroup, daytimeMark, daytimeRank } from "./model/daytime.js";

export { earned } from "./model/gold.js";

export { taskInfo } from "./model/info.js";

export { canReorder, reorderTasks } from "./model/order.js";

export { ruleText, projectRepeats } from "./model/repeat.js";

export { Task, historyOf, T, taskKey, findTask, newId } from "./model/task.js";

export { VariantProblem, nextVariantAfter } from "./model/variant.js";

export { taskStore } from "./model/store.js";

export { recordsFromDisk, saveRecords } from "./model/repository/tasks.js";

export { masterText, removePrependedLine } from "./model/repository/master.js";

export {
  addTask, changeTaskLine, editTaskLine, readTaskEdit, removeUndatedLines, writeTask,
} from "./model/lineChange.js";

export { placeTask, setDue, taskFromPool } from "./model/schedule.js";

export { default as TaskText } from "./ui/TaskText.vue";

export { default as TaskWindow } from "./ui/TaskWindow/index.vue";

export { pickTask } from "./ui/pickTask.js";

export { openTaskWindow } from "./ui/TaskWindow/open.js";
