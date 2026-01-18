import { describe, it, expect } from "vitest";
import { detectDiagramType } from "../../src/adapters/diagramTypeDetector.js";

describe("detectDiagramType", () => {
  it("should detect flowchart", () => {
    expect(detectDiagramType("flowchart TB\nA --> B")).toBe("flowchart");
    expect(detectDiagramType("graph LR\nA --> B")).toBe("flowchart");
  });

  it("should detect sequenceDiagram", () => {
    expect(detectDiagramType("sequenceDiagram\nparticipant A")).toBe("sequenceDiagram");
    expect(detectDiagramType("sequencediagram\nparticipant A")).toBe("sequenceDiagram");
  });

  it("should detect classDiagram", () => {
    expect(detectDiagramType("classDiagram\nclass A")).toBe("classDiagram");
    expect(detectDiagramType("classdiagram\nclass A")).toBe("classDiagram");
  });

  it("should detect stateDiagram", () => {
    expect(detectDiagramType("stateDiagram\n[*] --> A")).toBe("stateDiagram");
    expect(detectDiagramType("stateDiagram-v2\n[*] --> A")).toBe("stateDiagram-v2");
  });

  it("should detect erDiagram", () => {
    expect(detectDiagramType("erDiagram\nA ||--o{ B")).toBe("erDiagram");
    expect(detectDiagramType("erdiagram\nA ||--o{ B")).toBe("erDiagram");
  });

  it("should detect gantt", () => {
    expect(detectDiagramType("gantt\ntitle Project")).toBe("gantt");
  });

  it("should detect pie", () => {
    expect(detectDiagramType("pie title Chart\n\"A\" : 10")).toBe("pie");
  });

  it("should detect journey", () => {
    expect(detectDiagramType("journey\ntitle Flow")).toBe("journey");
  });

  it("should detect gitGraph", () => {
    expect(detectDiagramType("gitGraph\ncommit")).toBe("gitGraph");
    expect(detectDiagramType("gitgraph\ncommit")).toBe("gitGraph");
  });

  it("should detect timeline", () => {
    expect(detectDiagramType("timeline\ntitle Events")).toBe("timeline");
  });

  it("should return unknown for unrecognized types", () => {
    expect(detectDiagramType("unknown type\ncontent")).toBe("unknown");
  });

  it("should fallback to flowchart for graph patterns", () => {
    expect(detectDiagramType("A --> B")).toBe("flowchart");
    expect(detectDiagramType("A --- B")).toBe("flowchart");
  });
});
