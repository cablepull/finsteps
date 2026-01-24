import { LabelBasedStrategy } from "./labelBasedStrategy.js";

export class PacketStrategy extends LabelBasedStrategy {
  constructor() {
    super("packet", { skipNumericLabels: true, maxTargets: 300 });
  }
}

