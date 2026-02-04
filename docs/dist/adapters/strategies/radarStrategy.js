import { LabelBasedStrategy } from "./labelBasedStrategy.js";
export class RadarStrategy extends LabelBasedStrategy {
    constructor() {
        super("radar", { skipNumericLabels: true, maxTargets: 300 });
    }
}
//# sourceMappingURL=radarStrategy.js.map