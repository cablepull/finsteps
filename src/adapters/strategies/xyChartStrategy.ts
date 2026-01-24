import { LabelBasedStrategy } from "./labelBasedStrategy.js";

export class XYChartStrategy extends LabelBasedStrategy {
  constructor() {
    // xy charts frequently include numeric axis ticks; skip those to avoid noisy targets
    super("xychart", { skipNumericLabels: true, maxTargets: 200 });
  }
}

