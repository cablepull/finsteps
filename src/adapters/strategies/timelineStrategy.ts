import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";

/**
 * Strategy for timeline diagrams
 * Handles timeline sections and events
 */
export class TimelineStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return 'timeline';
  }
  
  getTargetableClasses(): string[] {
    return ['section', 'event', 'timeline'];
  }
  
  getTargetableTags(): string[] {
    return ['g', 'rect', 'text'];
  }
  
  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();
    
    // Patterns for timeline IDs
    const patterns = [
      /^section-([A-Za-z0-9_]+)-\d+$/,  // section-name-digit
      /^event-([A-Za-z0-9_]+)-\d+$/,    // event-name-digit
      /^timeline-([A-Za-z0-9_]+)-\d+$/,  // timeline-name-digit
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
        
        // Walk up the tree to find the section/event group
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes('section') || className.includes('event') || className.includes('timeline'))) {
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
      `g.section[data-id="${escapedId}"]`,
      `g.event[data-id="${escapedId}"]`,
      `g.timeline[data-id="${escapedId}"]`,
      `g[class*="section"][data-id="${escapedId}"]`,
      `g[class*="event"][data-id="${escapedId}"]`,
      `g[class*="timeline"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`, // Fallback
    ];
  }
  
  findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[] {
    const targetDataId = target.getAttribute('data-id');
    if (!targetDataId) return [];
    
    const targetClassName = this.getElementClassName(target);
    
    // For timeline sections: find events in the same section
    if (targetClassName && targetClassName.includes('section')) {
      const sectionEvents = Array.from(target.querySelectorAll<SVGGraphicsElement>('g[class*="event"][data-id]'));
      return sectionEvents;
    }
    
    // For events: find other events in the same section or adjacent sections
    if (targetClassName && targetClassName.includes('event')) {
      // Find parent section
      let section: Element | null = target.parentElement;
      while (section && section !== svg) {
        const className = this.getElementClassName(section as SVGElement);
        if (className && className.includes('section')) {
          const sectionEvents = Array.from(section.querySelectorAll<SVGGraphicsElement>('g[class*="event"][data-id]'));
          return sectionEvents.filter(e => e !== target);
        }
        section = section.parentElement;
      }
      
      // If no section found, return all events
      const allEvents = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="event"][data-id]'));
      return allEvents.filter(e => e !== target);
    }
    
    return [];
  }
}
