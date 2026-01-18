import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";

/**
 * Strategy for pie charts
 * Handles pie slices
 */
export class PieChartStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return 'pie';
  }
  
  getTargetableClasses(): string[] {
    return ['slice', 'pie'];
  }
  
  getTargetableTags(): string[] {
    return ['g', 'path', 'text'];
  }
  
  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();
    
    // Patterns for pie chart IDs
    const patterns = [
      /^slice-([A-Za-z0-9_]+)-\d+$/,  // slice-name-digit
      /^pie-([A-Za-z0-9_]+)-\d+$/,    // pie-name-digit
      /^([A-Za-z0-9_]+)-\d+$/,         // name-digit (fallback)
    ];
    
    // First pass: find all elements with ids and extract node ids
    for (const el of Array.from(svg.querySelectorAll<SVGElement>("[id]"))) {
      const id = el.getAttribute("id");
      if (!id) continue;
      
      let nodeId: string | null = this.extractIdFromPatterns(id, patterns);
      
      if (nodeId && !nodeIdMap.has(nodeId)) {
        // Find the group that contains this element
        let current: Element | null = el;
        let nodeGroup: SVGElement | null = null;
        
        // Walk up the tree to find the slice group
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes('slice') || className.includes('pie'))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        
        // If we found a group, use it
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        } else if (el.tagName === "path" && this.hasTargetableClass(el)) {
          // Pie slices are often path elements
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    
    return nodeIdMap;
  }
  
  getTargetSelectors(dataId: string): string[] {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.slice[data-id="${escapedId}"]`,
      `g.pie[data-id="${escapedId}"]`,
      `path.slice[data-id="${escapedId}"]`,
      `path.pie[data-id="${escapedId}"]`,
      `g[class*="slice"][data-id="${escapedId}"]`,
      `g[class*="pie"][data-id="${escapedId}"]`,
      `path[class*="slice"][data-id="${escapedId}"]`,
      `path[class*="pie"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`, // Fallback
    ];
  }
  
  findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[] {
    // For pie charts, all slices are adjacent (they form a complete circle)
    // Return all other slices for context
    const allSlices = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="slice"][data-id], g[class*="pie"][data-id], path[class*="slice"][data-id], path[class*="pie"][data-id]'));
    return allSlices.filter(slice => slice !== target);
  }
}
