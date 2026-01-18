import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";

/**
 * Strategy for class diagrams
 * Handles classes, relationships, and members
 */
export class ClassDiagramStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return 'classDiagram';
  }
  
  getTargetableClasses(): string[] {
    return ['class', 'classBox', 'relation', 'edge'];
  }
  
  getTargetableTags(): string[] {
    return ['g', 'rect', 'path'];
  }
  
  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();
    
    // Patterns for class diagram IDs
    const patterns = [
      /^class-([A-Za-z0-9_]+)-\d+$/,     // class-name-digit
      /^classBox-([A-Za-z0-9_]+)-\d+$/,  // classBox-name-digit
      /^relation-([A-Za-z0-9_]+)-\d+$/,  // relation-name-digit
      /^edge-([A-Za-z0-9_]+)-\d+$/,      // edge-name-digit
      /^([A-Za-z0-9_]+)-\d+$/,           // name-digit (fallback)
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
        
        // Walk up the tree to find the class/relation group
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes('class') || className.includes('classBox') || 
                className.includes('relation') || className.includes('edge'))) {
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
      `g.class[data-id="${escapedId}"]`,
      `g.classBox[data-id="${escapedId}"]`,
      `g.relation[data-id="${escapedId}"]`,
      `g.edge[data-id="${escapedId}"]`,
      `g[class*="class"][data-id="${escapedId}"]`,
      `g[class*="relation"][data-id="${escapedId}"]`,
      `g[class*="edge"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`, // Fallback
    ];
  }
  
  findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[] {
    const targetDataId = target.getAttribute('data-id');
    if (!targetDataId) return [];
    
    const targetClassName = this.getElementClassName(target);
    
    // For classes: find classes connected by relationships
    if (targetClassName && (targetClassName.includes('class') || targetClassName.includes('classBox'))) {
      // Find all relationship edges
      const allRelations = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="relation"][data-id], g[class*="edge"][data-id], path[class*="edge"]'));
      const connectedClasses: SVGGraphicsElement[] = [];
      
      try {
        const targetBbox = target.getBBox();
        
        for (const relation of allRelations) {
          try {
            const relationBbox = relation.getBBox();
            
            // Check if relation intersects or is near this class
            const intersects = 
              relationBbox.x < targetBbox.x + targetBbox.width &&
              relationBbox.x + relationBbox.width > targetBbox.x &&
              relationBbox.y < targetBbox.y + targetBbox.height &&
              relationBbox.y + relationBbox.height > targetBbox.y;
            
            if (intersects) {
              // Find the other class this relation connects to
              const allClasses = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="class"][data-id], g[class*="classBox"][data-id]'));
              for (const cls of allClasses) {
                if (cls === target) continue;
                if (connectedClasses.includes(cls)) continue;
                
                try {
                  const clsBbox = cls.getBBox();
                  const clsIntersects = 
                    relationBbox.x < clsBbox.x + clsBbox.width &&
                    relationBbox.x + relationBbox.width > clsBbox.x &&
                    relationBbox.y < clsBbox.y + clsBbox.height &&
                    relationBbox.y + relationBbox.height > clsBbox.y;
                  
                  if (clsIntersects) {
                    connectedClasses.push(cls);
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
      
      return connectedClasses;
    }
    
    // For relations: find the classes they connect
    if (targetClassName && (targetClassName.includes('relation') || targetClassName.includes('edge'))) {
      const allClasses = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="class"][data-id], g[class*="classBox"][data-id]'));
      const connectedClasses: SVGGraphicsElement[] = [];
      
      try {
        const relationBbox = target.getBBox();
        
        for (const cls of allClasses) {
          try {
            const clsBbox = cls.getBBox();
            
            const intersects = 
              relationBbox.x < clsBbox.x + clsBbox.width &&
              relationBbox.x + relationBbox.width > clsBbox.x &&
              relationBbox.y < clsBbox.y + clsBbox.height &&
              relationBbox.y + relationBbox.height > clsBbox.y;
            
            if (intersects) {
              connectedClasses.push(cls);
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      
      return connectedClasses;
    }
    
    return [];
  }
}
