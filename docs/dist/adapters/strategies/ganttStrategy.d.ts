import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for Gantt chart diagrams
 * Handles task-based timelines with sections, tasks, and milestones
 */
export declare class GanttStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=ganttStrategy.d.ts.map