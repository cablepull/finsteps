import { BaseDiagramStrategy } from "../diagramStrategies.js";
import { DiagramType } from "../diagramTypeDetector.js";

/**
 * Strategy for mindmap diagrams
 * Mermaid generates <g> elements with numeric IDs and text content
 */
export class MindmapStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return "mindmap";
  }

  getTargetableClasses(): string[] {
    return ["node", "mindmap-node"];
  }

  getTargetableTags(): string[] {
    return ["g", "path"];
  }

  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();

    // Mindmap diagrams have <g> elements with numeric IDs:
    // - <g id="node_0" class="node mindmap-node">Root</g>
    // - <g id="node_1" class="node mindmap-node">Topic_A</g>
    // We need to map the text content to the element
    
    // Find all <g> elements with class="node mindmap-node"
    const nodeElements = Array.from(svg.querySelectorAll<SVGElement>("g.mindmap-node"));
    
    for (const el of nodeElements) {
      const textContent = el.textContent?.trim();
      if (!textContent) continue;
      
      // Normalize the text content to create a data-id
      // Remove special characters like (( )) and normalize spaces
      let dataId = textContent
        .replace(/[()]/g, "")  // Remove parentheses
        .trim()
        .replace(/\s+/g, "_"); // Replace spaces with underscores
      
      if (dataId) {
        nodeIdMap.set(dataId, el);
      }
    }

    return nodeIdMap;
  }

  getTargetSelectors(dataId: string): string[] {
    const escaped = dataId.replace(/"/g, '\\"');
    return [
      `g[data-id="${escaped}"]`,
      `g.mindmap-node[data-id="${escaped}"]`,
      `[data-id="${escaped}"]`,
    ];
  }

  findAdjacentElements(
    _target: SVGGraphicsElement,
    _svg: SVGSVGElement
  ): SVGGraphicsElement[] {
    // Mindmap nodes are connected by edges, but we don't need to highlight them
    return [];
  }
}

