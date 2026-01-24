import { LabelBasedStrategy } from "./labelBasedStrategy.js";

export class SankeyStrategy extends LabelBasedStrategy {
  constructor() {
    super("sankey", { skipNumericLabels: true, maxTargets: 300 });
  }
}

