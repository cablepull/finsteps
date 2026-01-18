import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";

/**
 * Strategy for Gantt chart diagrams
 * Handles task-based timelines with sections, tasks, and milestones
 */
export class GanttStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return 'gantt';
  }
  
  getTargetableClasses(): string[] {
    return ['task', 'milestone', 'section'];
  }
  
  getTargetableTags(): string[] {
    return ['g', 'rect', 'polygon'];
  }
  
  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();
    
    // Patterns for Gantt task IDs
    const patterns = [
      /^[a-zA-Z0-9-]+-([A-Za-z0-9_]+)-\d+$/,  // prefix-taskId-digit
      /^gantt-([A-Za-z0-9_]+)-/,               // gantt-taskId- (partial match)
      /^task-([A-Za-z0-9_]+)/,                 // task-taskId
      /^([A-Za-z0-9_]+)$/,                     // Simple ID (e.g., req1, dev1)
    ];
    
    // First pass: find all elements with ids and extract node ids
    for (const el of Array.from(svg.querySelectorAll<SVGElement>("[id]"))) {
      const id = el.getAttribute("id");
      if (!id) continue;
      
      let nodeId: string | null = this.extractIdFromPatterns(id, patterns);
      
      // For gantt charts: if ID doesn't match patterns but element has class "task" or "milestone", use the ID directly
      if (!nodeId) {
        const elClassName = this.getElementClassName(el);
        if (elClassName && (elClassName.includes('task') || elClassName.includes('milestone'))) {
          // Exclude "-text" suffix IDs (these are labels, not tasks/milestones)
          if (!id.endsWith('-text') && !id.endsWith('-Text')) {
            nodeId = id;
          }
        }
      }
      
      if (nodeId && !nodeIdMap.has(nodeId)) {
        // Find the node/task group that contains this element
        let current: Element | null = el;
        let nodeGroup: SVGElement | null = null;
        
        // Walk up the tree to find the task/milestone/section group
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes('task') || className.includes('milestone') || className.includes('section'))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        
        // If we found a task/milestone group, use it
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        } else if (el.tagName === "rect") {
          const rectClassName = this.getElementClassName(el);
          if (rectClassName && (rectClassName.includes('task') || rectClassName.includes('milestone'))) {
            nodeIdMap.set(nodeId, el);
          }
        } else if (el.tagName === "polygon") {
          const polygonClassName = this.getElementClassName(el);
          if (polygonClassName && polygonClassName.includes('milestone')) {
            nodeIdMap.set(nodeId, el);
          }
        }
      }
    }
    
    return nodeIdMap;
  }
  
  getTargetSelectors(dataId: string): string[] {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.task[data-id="${escapedId}"]`,
      `g.milestone[data-id="${escapedId}"]`,
      `g[class*="task"][data-id="${escapedId}"]`,
      `g[class*="milestone"][data-id="${escapedId}"]`,
      `g[class*="section"][data-id="${escapedId}"]`,
      `rect.task[data-id="${escapedId}"]`,
      `rect[class*="task"][data-id="${escapedId}"]`,
      `polygon.milestone[data-id="${escapedId}"]`,
      `polygon[class*="milestone"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`, // Fallback
    ];
  }
  
  findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[] {
    const targetDataId = target.getAttribute('data-id');
    if (!targetDataId) return [];
    
    const targetClassName = this.getElementClassName(target);
    const isMilestone = targetClassName && targetClassName.includes('milestone');
    
    // For milestones, find all nearby tasks/milestones (time-adjacent elements)
    if (isMilestone) {
      const allElements = Array.from(svg.querySelectorAll<SVGGraphicsElement>('[data-id]'));
      return allElements.filter(el => el !== target && el instanceof SVGGraphicsElement);
    }
    
    // For regular tasks, use section-based adjacency
    // Find the section that contains the target task
    let sectionGroup: SVGGElement | null = null;
    let current: Element | null = target;
    
    while (current && current !== svg) {
      if (current instanceof SVGGElement && current.tagName === "g") {
        const className = this.getElementClassName(current);
        if (className && className.includes('section')) {
          sectionGroup = current;
          break;
        }
      }
      current = current.parentElement;
    }
    
    if (!sectionGroup) {
      // If no section found, return tasks with data-id (all tasks in gantt)
      const allTasks = Array.from(svg.querySelectorAll<SVGGraphicsElement>('[data-id], g[class*="task"][data-id], polygon[class*="milestone"][data-id]'));
      return allTasks.filter(task => task !== target);
    }
    
    // Find all tasks and milestones in the same section
    const sectionTasks = Array.from(sectionGroup.querySelectorAll<SVGGraphicsElement>('[data-id], g[class*="task"][data-id], polygon[class*="milestone"][data-id]'));
    return sectionTasks.filter(task => task !== target);
  }
}
