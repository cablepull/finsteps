import { describe, it, expect, beforeEach } from "vitest";
import { DiagramStrategyRegistry } from "../../src/adapters/diagramStrategyRegistry.js";
import { DiagramType } from "../../src/adapters/diagramTypeDetector.js";
import { FlowchartStrategy } from "../../src/adapters/strategies/flowchartStrategy.js";
import { GanttStrategy } from "../../src/adapters/strategies/ganttStrategy.js";
import { SequenceDiagramStrategy } from "../../src/adapters/strategies/sequenceDiagramStrategy.js";

describe("DiagramStrategyRegistry", () => {
  let registry: DiagramStrategyRegistry;

  beforeEach(() => {
    registry = new DiagramStrategyRegistry();
  });

  it("should register and retrieve strategies", () => {
    const flowchartStrategy = new FlowchartStrategy();
    registry.register("flowchart", flowchartStrategy);

    const retrieved = registry.get("flowchart");
    expect(retrieved).toBe(flowchartStrategy);
  });

  it("should return undefined for unregistered types", () => {
    const retrieved = registry.get("sequenceDiagram" as DiagramType);
    expect(retrieved).toBeUndefined();
  });

  it("should return default strategy when type not found", () => {
    const defaultStrategy = new FlowchartStrategy();
    registry.setDefault(defaultStrategy);

    const retrieved = registry.getOrDefault("unknown" as DiagramType);
    expect(retrieved).toBe(defaultStrategy);
  });

  it("should throw error when no default and type not found", () => {
    expect(() => {
      registry.getOrDefault("unknown" as DiagramType);
    }).toThrow();
  });

  it("should check if strategy is registered", () => {
    const flowchartStrategy = new FlowchartStrategy();
    registry.register("flowchart", flowchartStrategy);

    expect(registry.has("flowchart")).toBe(true);
    expect(registry.has("gantt" as DiagramType)).toBe(false);
  });

  it("should return all registered types", () => {
    registry.register("flowchart", new FlowchartStrategy());
    registry.register("gantt", new GanttStrategy());
    registry.register("sequenceDiagram", new SequenceDiagramStrategy());

    const types = registry.getRegisteredTypes();
    expect(types).toContain("flowchart");
    expect(types).toContain("gantt");
    expect(types).toContain("sequenceDiagram");
    expect(types.length).toBe(3);
  });
});
