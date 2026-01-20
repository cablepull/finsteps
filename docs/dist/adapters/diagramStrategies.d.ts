import { DiagramType } from "./diagramTypeDetector.js";
/**
 * Strategy interface for diagram-type-specific behavior
 * Each diagram type implements this interface to provide type-specific logic
 * for ID extraction, element targeting, and adjacency detection.
 */
export interface DiagramStrategy {
    /**
     * Extract logical node IDs from Mermaid's generated IDs and return a map
     * of nodeId -> SVGElement pairs. This is used to set data-id attributes.
     *
     * @param svg - The root SVG element containing the rendered diagram
     * @returns Map of logical node IDs to their corresponding SVG elements
     */
    extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    /**
     * Get CSS selectors for finding elements by dataId.
     * These selectors are tried in order until one matches.
     *
     * @param dataId - The logical node ID to find
     * @returns Array of CSS selectors to try (in order of preference)
     */
    getTargetSelectors(dataId: string): string[];
    /**
     * Find adjacent/related elements for camera.fit context.
     * This helps show context around a focused element.
     *
     * @param target - The target element to find adjacent elements for
     * @param svg - The root SVG element
     * @returns Array of adjacent/related SVG graphics elements
     */
    findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[];
    /**
     * Get element classes that indicate this is a targetable element.
     * Used for filtering elements during ID extraction.
     *
     * @returns Array of class name patterns (substrings to match)
     */
    getTargetableClasses(): string[];
    /**
     * Get element tag names that are targetable.
     * Used for filtering elements during ID extraction.
     *
     * @returns Array of tag names (e.g., ['g', 'rect', 'polygon'])
     */
    getTargetableTags(): string[];
    /**
     * Get the diagram type this strategy handles
     */
    getDiagramType(): DiagramType;
}
/**
 * Base class for diagram strategies with common helper methods
 */
export declare abstract class BaseDiagramStrategy implements DiagramStrategy {
    abstract getDiagramType(): DiagramType;
    abstract extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement>;
    abstract getTargetSelectors(dataId: string): string[];
    abstract findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[];
    abstract getTargetableClasses(): string[];
    abstract getTargetableTags(): string[];
    /**
     * Helper: Extract node ID from Mermaid's generated ID using patterns
     */
    protected extractIdFromPatterns(id: string, patterns: RegExp[]): string | null;
    /**
     * Helper: Get element's class name as a string
     */
    protected getElementClassName(el: SVGElement): string;
    /**
     * Helper: Check if element has any of the targetable classes
     */
    protected hasTargetableClass(el: SVGElement): boolean;
    /**
     * Helper: Escape a CSS selector value
     */
    protected escapeSelector(value: string): string;
}
//# sourceMappingURL=diagramStrategies.d.ts.map