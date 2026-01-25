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

    // Packet diagrams already have data-id attributes on <g> elements!
    // Structure: <g data-id="Field_Name"><rect/><text/></g>
    // We just need to find all elements with data-id attributes
    const elementsWithDataId = Array.from(svg.querySelectorAll<SVGElement>("[data-id]"));

    for (const element of elementsWithDataId) {
      const dataId = element.getAttribute("data-id");
      if (dataId && !nodeIdMap.has(dataId)) {
        nodeIdMap.set(dataId, element);
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
