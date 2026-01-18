import { DiagramType } from "./diagramTypeDetector.js";
import { DiagramStrategy, BaseDiagramStrategy } from "./diagramStrategies.js";

/**
 * Registry for diagram type strategies
 * Maps diagram types to their corresponding strategy implementations
 */
export class DiagramStrategyRegistry {
  private strategies = new Map<DiagramType, DiagramStrategy>();
  private defaultStrategy: DiagramStrategy | null = null;
  
  /**
   * Register a strategy for a specific diagram type
   * @param type - The diagram type
   * @param strategy - The strategy implementation
   */
  register(type: DiagramType, strategy: DiagramStrategy): void {
    this.strategies.set(type, strategy);
  }
  
  /**
   * Get a strategy for a specific diagram type
   * @param type - The diagram type
   * @returns The strategy, or undefined if not found
   */
  get(type: DiagramType): DiagramStrategy | undefined {
    return this.strategies.get(type);
  }
  
  /**
   * Get a strategy for a specific diagram type, or return the default strategy
   * @param type - The diagram type
   * @returns The strategy, or the default strategy if not found
   */
  getOrDefault(type: DiagramType): DiagramStrategy {
    const strategy = this.strategies.get(type);
    if (strategy) {
      return strategy;
    }
    if (this.defaultStrategy) {
      return this.defaultStrategy;
    }
    // If no default, throw an error
    throw new Error(`No strategy found for diagram type: ${type} and no default strategy set`);
  }
  
  /**
   * Set the default strategy to use when a specific type is not found
   * @param strategy - The default strategy
   */
  setDefault(strategy: DiagramStrategy): void {
    this.defaultStrategy = strategy;
  }
  
  /**
   * Check if a strategy is registered for a diagram type
   * @param type - The diagram type
   * @returns True if a strategy is registered
   */
  has(type: DiagramType): boolean {
    return this.strategies.has(type);
  }
  
  /**
   * Get all registered diagram types
   * @returns Array of registered diagram types
   */
  getRegisteredTypes(): DiagramType[] {
    return Array.from(this.strategies.keys());
  }
}

/**
 * Global strategy registry instance
 * Strategies are registered here and accessed throughout the application
 */
export const strategyRegistry = new DiagramStrategyRegistry();
