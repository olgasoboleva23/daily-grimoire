// Public entry for task.
export { variantsProblem, recordOf } from "./contract/task.js";

export { taskChoices } from "./model/choice.js";

export { dayGroup, daytimeMark, daytimeRank } from "./model/daytime.js";

export { earned } from "./model/gold.js";

export { taskInfo } from "./model/info.js";

export { canReorder } from "./model/order.js";

export { ruleText, projectRepeats } from "./model/repeat.js";

export { Task, historyOf, T, taskKey, findTask, newId } from "./model/task.js";

export { VariantProblem, variantNames, nextVariantAfter } from "./model/variant.js";

export { taskStore } from "./model/store.js";

export { records, recordsFromDisk, saveRecords } from "./model/repository/tasks.js";

export { masterText, prependLine, removePrependedLine } from "./model/repository/master.js";
