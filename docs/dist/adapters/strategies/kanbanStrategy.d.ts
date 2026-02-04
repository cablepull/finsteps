import { BaseDiagramStrategy } from "../diagramStrategies.js";
import { DiagramType } from "../diagramTypeDetector.js";
/**
 * Strategy for kanban diagrams
 * Mermaid generates <g> elements with id attributes directly
 */
export declare class KanbanStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(_target: SVGGraphicsElement, _svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=kanbanStrategy.d.ts.map