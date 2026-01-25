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
        // Also remove icon text like "Icon-Architecture/16/Arch_Amazon-EC2_16"
        const cleanText = text
          .replace(/[«»<>]/g, "")  // Remove stereotype markers
          .replace(/Icon-[^\s]+/g, "")  // Remove icon text
          .trim();
        
        // Extract just the participant name without stereotype
        // e.g., "«BFF»OrderService" -> "OrderService"
        const nameOnly = text
          .replace(/«[^»]*»/g, "")  // Remove «stereotype»
          .replace(/<<[^>]*>>/g, "")  // Remove <<stereotype>>
          .replace(/Icon-[^\s]+/g, "")  // Remove icon text
          .trim();
        
        const dataIds = new Set<string>();
        // Add original (with stereotype removed but concatenated)
        dataIds.add(text.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, ""));
        // Add clean version
        dataIds.add(cleanText.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, ""));
        // Add name-only version (most important for targeting)
        dataIds.add(nameOnly.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, ""));
        
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

