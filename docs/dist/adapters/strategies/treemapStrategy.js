import { LabelBasedStrategy } from "./labelBasedStrategy.js";
export class TreemapStrategy extends LabelBasedStrategy {
    constructor() {
        super("treemap", { skipNumericLabels: true, maxTargets: 300 });
    }
}
//# sourceMappingURL=treemapStrategy.js.map