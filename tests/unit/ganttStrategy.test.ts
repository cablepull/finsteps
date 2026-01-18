import { describe, it, expect, beforeEach } from "vitest";
import { GanttStrategy } from "../../src/adapters/strategies/ganttStrategy.js";

describe("GanttStrategy", () => {
  let strategy: GanttStrategy;
  let svg: SVGSVGElement;

  beforeEach(() => {
    strategy = new GanttStrategy();
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
  });

  it("should return correct diagram type", () => {
    expect(strategy.getDiagramType()).toBe("gantt");
  });

  it("should return targetable classes", () => {
    const classes = strategy.getTargetableClasses();
    expect(classes).toContain("task");
    expect(classes).toContain("milestone");
    expect(classes).toContain("section");
  });

  it("should return targetable tags", () => {
    const tags = strategy.getTargetableTags();
    expect(tags).toContain("g");
    expect(tags).toContain("rect");
    expect(tags).toContain("polygon");
  });

  it("should generate correct target selectors", () => {
    const selectors = strategy.getTargetSelectors("task1");
    expect(selectors[0]).toContain("g.task[data-id=\"task1\"]");
    expect(selectors).toHaveLength(10);
  });

  it("should extract node IDs from Gantt patterns", () => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "task");
    rect.setAttribute("id", "task1");
    svg.appendChild(rect);

    const nodeIdMap = strategy.extractNodeIds(svg);
    expect(nodeIdMap.has("task1")).toBe(true);
    expect(nodeIdMap.get("task1")).toBe(rect);
  });

  it("should extract milestone IDs", () => {
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("class", "milestone");
    polygon.setAttribute("id", "release");
    svg.appendChild(polygon);

    const nodeIdMap = strategy.extractNodeIds(svg);
    expect(nodeIdMap.has("release")).toBe(true);
  });

  it("should find adjacent tasks in same section", () => {
    const section = document.createElementNS("http://www.w3.org/2000/svg", "g");
    section.setAttribute("class", "section");
    svg.appendChild(section);

    const task1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    task1.setAttribute("class", "task");
    task1.setAttribute("data-id", "task1");
    section.appendChild(task1);

    const task2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    task2.setAttribute("class", "task");
    task2.setAttribute("data-id", "task2");
    section.appendChild(task2);

    const adjacent = strategy.findAdjacentElements(task1 as SVGGraphicsElement, svg);
    expect(adjacent).toContain(task2);
  });
});
