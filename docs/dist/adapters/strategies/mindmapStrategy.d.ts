import { BaseDiagramStrategy } from "../diagramStrategies.js";
import { DiagramType } from "../diagramTypeDetector.js";
/**
 * Strategy for mindmap diagrams
 * Mermaid generates <g> elements with numeric IDs and text content
 */
export declare class MindmapStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(_target: SVGGraphicsElement, _svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=mindmapStrategy.d.ts.map