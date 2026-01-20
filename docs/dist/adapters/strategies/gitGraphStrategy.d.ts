import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for git graph diagrams
 * Handles commits, branches, and merges
 */
export declare class GitGraphStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=gitGraphStrategy.d.ts.map