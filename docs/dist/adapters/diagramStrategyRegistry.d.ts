import { DiagramType } from "./diagramTypeDetector.js";
import { DiagramStrategy } from "./diagramStrategies.js";
/**
 * Registry for diagram type strategies
 * Maps diagram types to their corresponding strategy implementations
 */
export declare class DiagramStrategyRegistry {
    private strategies;
    private defaultStrategy;
    /**
     * Register a strategy for a specific diagram type
     * @param type - The diagram type
     * @param strategy - The strategy implementation
     */
    register(type: DiagramType, strategy: DiagramStrategy): void;
    /**
     * Get a strategy for a specific diagram type
     * @param type - The diagram type
     * @returns The strategy, or undefined if not found
     */
    get(type: DiagramType): DiagramStrategy | undefined;
    /**
     * Get a strategy for a specific diagram type, or return the default strategy
     * @param type - The diagram type
     * @returns The strategy, or the default strategy if not found
     */
    getOrDefault(type: DiagramType): DiagramStrategy;
    /**
     * Set the default strategy to use when a specific type is not found
     * @param strategy - The default strategy
     */
    setDefault(strategy: DiagramStrategy): void;
    /**
     * Check if a strategy is registered for a diagram type
     * @param type - The diagram type
     * @returns True if a strategy is registered
     */
    has(type: DiagramType): boolean;
    /**
     * Get all registered diagram types
     * @returns Array of registered diagram types
     */
    getRegisteredTypes(): DiagramType[];
}
/**
 * Global strategy registry instance
 * Strategies are registered here and accessed throughout the application
 */
export declare const strategyRegistry: DiagramStrategyRegistry;
//# sourceMappingURL=diagramStrategyRegistry.d.ts.map