import { BaseDiagramStrategy } from "../diagramStrategies.js";
import { DiagramType } from "../diagramTypeDetector.js";
/**
 * Strategy for packet diagrams
 * Packet diagrams render fields as rectangles with text labels
 */
export declare class PacketStrategy extends BaseDiagramStrategy {
    getDiagramType(): DiagramType;
    getTargetableClasses(): string[];
    getTargetableTags(): string[];
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    getTargetSelectors(dataId: string): string[];
    findAdjacentElements(_target: SVGGraphicsElement, _svg: SVGSVGElement): SVGGraphicsElement[];
}
//# sourceMappingURL=packetStrategy.d.ts.map