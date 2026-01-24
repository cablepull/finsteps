import { LabelBasedStrategy } from "./labelBasedStrategy.js";

export class KanbanStrategy extends LabelBasedStrategy {
  constructor() {
    super("kanban", { skipNumericLabels: true, maxTargets: 300 });
  }
}

