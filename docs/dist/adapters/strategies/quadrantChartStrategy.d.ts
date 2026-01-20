import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for quadrant charts
 * Handles quadrants and data points
 */
export declare class QuadrantChartStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=quadrantChartStrategy.d.ts.map