import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for C4 diagrams (Context, Container, Component)
 * Handles C4 elements and relationships
 */
export declare class C4Strategy extends BaseDiagramStrategy {
    private diagramType;
    constructor(diagramType: DiagramType);
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=c4Strategy.d.ts.map