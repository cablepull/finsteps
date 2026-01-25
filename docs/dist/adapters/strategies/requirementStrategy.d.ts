import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for requirement diagrams
 * Handles requirements, functions, and relationships
 *
 * Implements: REQ-FRAMEWORK-002 (Expand Mermaid diagram type support)
 * Related: ADR-0011 (Expand Mermaid Diagram Type Support)
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