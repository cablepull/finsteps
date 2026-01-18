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
    
    // Patterns for requirement diagram IDs
    const patterns = [
      /^requirement-([A-Za-z0-9_]+)-\d+$/,  // requirement-name-digit
      /^function-([A-Za-z0-9_]+)-\d+$/,    // function-name-digit
      /^relationship-([A-Za-z0-9_]+)-\d+$/, // relationship-name-digit
      /^([A-Za-z0-9_]+)-\d+$/,               // name-digit (fallback)
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
        
        // Walk up the tree to find the requirement/function/relationship group
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes('requirement') || className.includes('function') || className.includes('relationship'))) {
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
        }
      }
    }
    
    return nodeIdMap;
  }
  
  getTargetSelectors(dataId: string): string[] {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.requirement[data-id="${escapedId}"]`,
      `g.function[data-id="${escapedId}"]`,
      `g.relationship[data-id="${escapedId}"]`,
      `g[class*="requirement"][data-id="${escapedId}"]`,
      `g[class*="function"][data-id="${escapedId}"]`,
      `g[class*="relationship"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`, // Fallback
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
