import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for requirement diagrams
 * Handles requirements, functions, and relationships
 */
export declare class RequirementStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=requirementStrategy.d.ts.map