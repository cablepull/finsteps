import { LabelBasedStrategy } from "./labelBasedStrategy.js";

export class MindmapStrategy extends LabelBasedStrategy {
  constructor() {
    // mindmap often has many labels, but should remain manageable
    super("mindmap", { skipNumericLabels: true, maxTargets: 200 });
  }
}

