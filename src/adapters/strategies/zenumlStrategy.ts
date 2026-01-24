import { LabelBasedStrategy } from "./labelBasedStrategy.js";

export class ZenUMLStrategy extends LabelBasedStrategy {
  constructor() {
    super("zenuml", { skipNumericLabels: true, maxTargets: 300 });
  }

  override extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const map = new Map<string, SVGElement>();

    // ZenUML renders everything inside a single root foreignObject.
    // We need to find all meaningful HTML elements inside it.
    const foreignObjects = Array.from(svg.querySelectorAll("foreignObject"));
    for (const fo of foreignObjects) {
      // ZenUML classes:
      // .participant - Participant name containers
      // .message - Message text containers
      // .alias - Alias containers
      const labels = Array.from(fo.querySelectorAll(".participant, .message, .alias, .group"));
      
      for (const labelEl of labels) {
        let text = (labelEl.textContent ?? "").trim();
        if (!text || text.length > 100) continue;

        // ZenUML often includes stereotypes like «BFF» in the text.
        // We want to provide a data-id both with and without the stereotype if possible.
        const cleanText = text.replace(/[«»<>]/g, "").trim();
        
        const dataIds = new Set<string>();
        dataIds.add(text.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, ""));
        dataIds.add(cleanText.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, ""));
        
        for (const dataId of dataIds) {
          if (!dataId || map.has(dataId)) continue;
          map.set(dataId, labelEl as unknown as SVGElement);
        }
      }
    }

    // Fallback to standard label extraction if no foreignObject labels were found
    if (map.size === 0) {
      return super.extractNodeIds(svg);
    }

    return map;
  }
}

