import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for ER (Entity-Relationship) diagrams
 * Handles entities, relationships, and attributes
 */
export declare class ERDiagramStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=erDiagramStrategy.d.ts.map