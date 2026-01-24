import { describe, expect, it } from "vitest";
import { detectDiagramType } from "../../src/adapters/diagramTypeDetector";

describe("detectDiagramType (extended Mermaid syntaxes)", () => {
  it("detects mindmap", () => {
    expect(detectDiagramType("mindmap\n  root((Root))")).toBe("mindmap");
  });

  it("detects xychart / xychart-beta", () => {
    expect(detectDiagramType("xychart-beta\n  title \"X\"")).toBe("xychart");
    expect(detectDiagramType("xychart\n  title \"X\"")).toBe("xychart");
  });

  it("detects sankey / sankey-beta", () => {
    expect(detectDiagramType("sankey-beta\n  A,B,1")).toBe("sankey");
    expect(detectDiagramType("sankey\n  A,B,1")).toBe("sankey");
  });

  it("detects treemap / treemap-beta", () => {
    expect(detectDiagramType("treemap-beta\n  \"A\" : 1")).toBe("treemap");
    expect(detectDiagramType("treemap\n  \"A\" : 1")).toBe("treemap");
  });

  it("detects kanban", () => {
    expect(detectDiagramType("kanban\n  Todo\n    Task_A")).toBe("kanban");
  });

  it("detects packet", () => {
    expect(detectDiagramType("packet-beta\n  0-14: Ethernet")).toBe("packet");
    expect(detectDiagramType("packet\n  0-14: Ethernet")).toBe("packet");
  });

  it("detects radar", () => {
    expect(detectDiagramType("radar-beta\n  title Radar")).toBe("radar");
    expect(detectDiagramType("radar\n  title Radar")).toBe("radar");
  });

  it("detects zenuml", () => {
    expect(detectDiagramType("zenuml\n  Client->Service: Request()")).toBe("zenuml");
  });
});

