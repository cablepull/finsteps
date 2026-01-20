import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for pie charts
 * Handles pie slices
 */
export declare class PieChartStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(_target: SVGGraphicsElement, _svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=pieChartStrategy.d.ts.map