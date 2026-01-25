import { BaseDiagramStrategy } from "../diagramStrategies.js";
import { DiagramType } from "../diagramTypeDetector.js";

/**
 * Strategy for packet diagrams
 * Packet diagrams render fields as rectangles with text labels
 */
export class PacketStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return "packet";
  }

  getTargetableClasses(): string[] {
    return ["packetBlock", "packet"];
  }

  getTargetableTags(): string[] {
    return ["g", "rect", "text"];
  }

  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();
    const seenLabels = new Map<string, number>();

    // Packet diagrams structure:
    // <g>
    //   <rect class="packetBlock"/>
    //   <text class="packetLabel">Field Name</text>
    //   <text class="packetByte start">0</text>
    //   <text class="packetByte end">7</text>
    // </g>
    
    // Find all text elements with class="packetLabel"
    const labelElements = Array.from(svg.querySelectorAll<SVGTextElement>("text.packetLabel"));

    for (const textEl of labelElements) {
      const label = textEl.textContent?.trim();
      if (!label) continue;

      // Normalize the label to create a data-id
      let dataId = label
        .replace(/\s+/g, "_")
        .replace(/[^A-Za-z0-9_-]/g, "");

      if (!dataId) continue;

      // Handle duplicate labels by adding suffix
      const baseId = dataId;
      const count = (seenLabels.get(baseId) ?? 0) + 1;
      seenLabels.set(baseId, count);
      if (count > 1) {
        dataId = `${baseId}_${count}`;
      }

      // The parent <g> element contains the rect and text
      const parent = textEl.parentElement;
      if (parent && parent.tagName.toLowerCase() === "g") {
        nodeIdMap.set(dataId, parent as unknown as SVGElement);
      }
    }

    // Debug: log all extracted IDs
    if (typeof console !== 'undefined') {
      console.log('[PacketStrategy] Extracted data-ids:', Array.from(nodeIdMap.keys()));
    }

    return nodeIdMap;
  }

  getTargetSelectors(dataId: string): string[] {
    const escaped = dataId.replace(/"/g, '\\"');
    return [
      `g[data-id="${escaped}"]`,
      `[data-id="${escaped}"]`,
    ];
  }

  findAdjacentElements(
    _target: SVGGraphicsElement,
    _svg: SVGSVGElement
  ): SVGGraphicsElement[] {
    // Packet fields are typically arranged sequentially
    // but we don't have a good way to determine adjacency
    return [];
  }
}
