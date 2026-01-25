import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";

/**
 * Strategy for requirement diagrams
 * Handles requirements, functions, and relationships
 */
export class RequirementStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return 'requirement';
  }
  
  getTargetableClasses(): string[] {
    return ['requirement', 'function', 'relationship'];
  }
  
  getTargetableTags(): string[] {
    return ['g', 'rect', 'path'];
  }
  
  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();
    
    // Requirement diagrams use simple node IDs (req1, req2, func1, etc.)
    // Find all <g> elements with class "node" that have an id attribute
    const nodeGroups = Array.from(svg.querySelectorAll<SVGElement>('g.node[id]'));
    
    for (const nodeGroup of nodeGroups) {
      const id = nodeGroup.getAttribute('id');
      if (id && id.trim()) {
        nodeIdMap.set(id, nodeGroup);
      }
    }
    
    // Also handle relationship edges (paths with data-id)
    const relationshipPaths = Array.from(svg.querySelectorAll<SVGElement>('path[data-id].relationshipLine'));
    for (const path of relationshipPaths) {
      const dataId = path.getAttribute('data-id');
      if (dataId && dataId.trim()) {
        nodeIdMap.set(dataId, path);
      }
    }
    
    return nodeIdMap;
  }
  
  getTargetSelectors(dataId: string): string[] {
    const escapedId = this.escapeSelector(dataId);
    return [
      // Try to find node group by id attribute (most common for req1, req2, func1)
      `g.node[id="${escapedId}"]`,
      // Try to find by data-id on label or relationship
      `[data-id="${escapedId}"]`,
      // Fallback: try parent of element with data-id
      `g:has([data-id="${escapedId}"])`,
    ];
  }
  
  findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[] {
    const targetDataId = target.getAttribute('data-id');
    if (!targetDataId) return [];
    
    const targetClassName = this.getElementClassName(target);
    
    // For requirements/functions: find connected relationships
    if (targetClassName && (targetClassName.includes('requirement') || targetClassName.includes('function'))) {
      const allRelations = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="relationship"][data-id], path[class*="relationship"]'));
      const connectedElements: SVGGraphicsElement[] = [];
      
      try {
        const targetBbox = target.getBBox();
        
        for (const relation of allRelations) {
          try {
            const relationBbox = relation.getBBox();
            
            // Check if relation intersects or is near this element
            const intersects = 
              relationBbox.x < targetBbox.x + targetBbox.width &&
              relationBbox.x + relationBbox.width > targetBbox.x &&
              relationBbox.y < targetBbox.y + targetBbox.height &&
              relationBbox.y + relationBbox.height > targetBbox.y;
            
            if (intersects) {
              // Find the other requirement/function this relation connects to
              const allElements = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="requirement"][data-id], g[class*="function"][data-id]'));
              for (const elem of allElements) {
                if (elem === target) continue;
                if (connectedElements.includes(elem)) continue;
                
                try {
                  const elemBbox = elem.getBBox();
                  const elemIntersects = 
                    relationBbox.x < elemBbox.x + elemBbox.width &&
                    relationBbox.x + relationBbox.width > elemBbox.x &&
                    relationBbox.y < elemBbox.y + elemBbox.height &&
                    relationBbox.y + relationBbox.height > elemBbox.y;
                  
                  if (elemIntersects) {
                    connectedElements.push(elem);
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      
      return connectedElements;
    }
    
    return [];
  }
}
