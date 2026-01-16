import { describe, expect, it } from "vitest";
import { resolveTarget } from "../../src/targetResolver";
import { DiagramHandle } from "../../src/types";

const createDiagram = (): { diagram: DiagramHandle; root: SVGSVGElement } => {
  const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const container = document.createElement("div");
  const diagram: DiagramHandle = {
    getRoot: () => root,
    getContainer: () => container,
    resolveTarget: () => null,
    destroy: () => undefined
  };
  return { diagram, root };
};

describe("resolveTarget", () => {
  it("resolves by element, selector, id, and data-id", () => {
    const { diagram, root } = createDiagram();
    const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
    node.id = "node-A";
    node.setAttribute("data-id", "data-A");
    node.classList.add("node");
    root.appendChild(node);

    expect(resolveTarget(diagram, { element: node })).toBe(node);
    expect(resolveTarget(diagram, { selector: ".node" })).toBe(node);
    expect(resolveTarget(diagram, { id: "node-A" })).toBe(node);
    expect(resolveTarget(diagram, { dataId: "data-A" })).toBe(node);
  });

  it("returns null when no target is provided", () => {
    const { diagram } = createDiagram();
    expect(resolveTarget(diagram)).toBeNull();
  });
});
