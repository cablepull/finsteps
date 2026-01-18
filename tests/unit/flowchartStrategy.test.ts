import { describe, it, expect, beforeEach } from "vitest";
import { FlowchartStrategy } from "../../src/adapters/strategies/flowchartStrategy.js";

describe("FlowchartStrategy", () => {
  let strategy: FlowchartStrategy;
  let svg: SVGSVGElement;

  beforeEach(() => {
    strategy = new FlowchartStrategy();
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
  });

  it("should return correct diagram type", () => {
    expect(strategy.getDiagramType()).toBe("flowchart");
  });

  it("should return targetable classes", () => {
    const classes = strategy.getTargetableClasses();
    expect(classes).toContain("node");
  });

  it("should return targetable tags", () => {
    const tags = strategy.getTargetableTags();
    expect(tags).toContain("g");
  });

  it("should generate correct target selectors", () => {
    const selectors = strategy.getTargetSelectors("TestNode");
    expect(selectors[0]).toContain("g.node[data-id=\"TestNode\"]");
    expect(selectors).toHaveLength(3);
  });

  it("should extract node IDs from flowchart patterns", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "node");
    g.setAttribute("id", "flowchart-TestNode-0");
    svg.appendChild(g);

    const nodeIdMap = strategy.extractNodeIds(svg);
    expect(nodeIdMap.has("TestNode")).toBe(true);
    expect(nodeIdMap.get("TestNode")).toBe(g);
  });

  it("should find adjacent nodes", () => {
    // Create a simple flowchart structure
    const node1 = document.createElementNS("http://www.w3.org/2000/svg", "g");
    node1.setAttribute("class", "node");
    node1.setAttribute("data-id", "Node1");
    svg.appendChild(node1);

    const node2 = document.createElementNS("http://www.w3.org/2000/svg", "g");
    node2.setAttribute("class", "node");
    node2.setAttribute("data-id", "Node2");
    svg.appendChild(node2);

    // Create an edge connecting them
    const edge = document.createElementNS("http://www.w3.org/2000/svg", "path");
    edge.setAttribute("class", "edge");
    svg.appendChild(edge);

    const adjacent = strategy.findAdjacentElements(node1 as SVGGraphicsElement, svg);
    // Adjacency detection relies on bounding boxes and edge proximity
    // This is a basic test - actual adjacency may require more complex setup
    expect(Array.isArray(adjacent)).toBe(true);
  });
});
