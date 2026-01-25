import { BaseDiagramStrategy } from "../diagramStrategies.js";
import { DiagramType } from "../diagramTypeDetector.js";

/**
 * Strategy for kanban diagrams
 * Mermaid generates <g> elements with id attributes directly
 */
export class KanbanStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return "kanban";
  }

  getTargetableClasses(): string[] {
    return ["cluster", "node", "section"];
  }

  getTargetableTags(): string[] {
    return ["g", "rect"];
  }

  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();

    // Kanban diagrams have <g> elements with id attributes:
    // - <g id="Todo" class="cluster undefined section-1"> (columns)
    // - <g id="Task_A" class="node undefined"> (tasks)
    
    // Find all <g> elements with id attributes
    const gElements = Array.from(svg.querySelectorAll<SVGElement>("g[id]"));
    
    for (const el of gElements) {
      const id = el.getAttribute("id");
      const className = el.getAttribute("class");
      
      // Only include cluster (columns) and node (tasks) elements
      if (id && className && (className.includes("cluster") || className.includes("node"))) {
        nodeIdMap.set(id, el);
      }
    }

    return nodeIdMap;
  }

  getTargetSelectors(dataId: string): string[] {
    const escaped = dataId.replace(/"/g, '\\"');
    return [
      `g[data-id="${escaped}"]`,
      `g[id="${escaped}"]`,
      `[data-id="${escaped}"]`,
    ];
  }

  findAdjacentElements(
    _target: SVGGraphicsElement,
    _svg: SVGSVGElement
  ): SVGGraphicsElement[] {
    // Kanban elements are typically independent
    return [];
  }
}

