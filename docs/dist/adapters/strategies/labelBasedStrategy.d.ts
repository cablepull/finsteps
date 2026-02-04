import { BaseDiagramStrategy } from "../diagramStrategies.js";
import { DiagramType } from "../diagramTypeDetector.js";
type LabelBasedStrategyOptions = {
    /**
     * Skip purely numeric labels (axis ticks, etc.)
     */
    skipNumericLabels?: boolean;
    /**
     * Limit number of extracted targets to avoid exploding target lists.
     * If undefined, no limit is applied.
     */
    maxTargets?: number;
};
/**
 * A conservative, label-driven strategy for diagram types where Mermaid SVG IDs
 * are not stable or not easily mapped to user IDs.
 *
 * It finds SVG <text> elements and assigns `data-id` to the nearest meaningful
 * ancestor <g> that contains shapes (rect/circle/path/...) or looks like a node group.
 *
 * This is intended to provide editor-grade target discovery (non-empty targets)
 * and a stable `dataId` scheme for actions like highlight/bubble/fit.
 */
export declare class LabelBasedStrategy extends BaseDiagramStrategy {
    private diagramType;
    private options;
    constructor(diagramType: DiagramType, options?: LabelBasedStrategyOptions);
    getDiagramType(): DiagramType;
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(_target: SVGGraphicsElement, _svg: SVGSVGElement): SVGGraphicsElement[];
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    private findTargetGroupForText;
}
export {};
//# sourceMappingURL=labelBasedStrategy.d.ts.map