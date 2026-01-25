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

    // Packet diagrams have text elements with labels
    // Find all text elements and their parent groups
    const textElements = Array.from(svg.querySelectorAll("text"));

    for (const textEl of textElements) {
      const label = textEl.textContent?.trim();
      if (!label) continue;

      // Skip numeric labels (bit numbers)
      if (/^\d+$/.test(label)) continue;

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

      // Find the parent rect or group that represents this field
      let target: SVGElement | null = null;

      // Look for sibling rect elements (packet fields are typically rect + text)
      const parent = textEl.parentElement;
      if (parent) {
        const rect = parent.querySelector("rect");
        if (rect) {
          target = parent as unknown as SVGElement;
        } else if (parent.tagName.toLowerCase() === "g") {
          // The group itself might be the target
          target = parent as unknown as SVGElement;
        }
      }

      // Fallback: use the text element's parent
      if (!target && textEl.parentElement) {
        target = textEl.parentElement as unknown as SVGElement;
      }

      if (target && !nodeIdMap.has(dataId)) {
        nodeIdMap.set(dataId, target);
      }
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
