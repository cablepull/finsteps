import { BaseDiagramStrategy } from "../diagramStrategies.js";
import { DiagramType } from "../diagramTypeDetector.js";
/**
 * Strategy for Wardley map diagrams
 * Wardley maps render components, anchors, and links
 * Components and anchors are typically <g> elements with text labels
 */
export declare class WardleyStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(_target: SVGGraphicsElement, _svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=wardleyStrategy.d.ts.map