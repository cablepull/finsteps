import { DiagramAdapter, DiagramHandle, TargetDescriptor } from "../types.js";
import { resolveTarget } from "../targetResolver.js";

const createDiagramHandle = (container: HTMLElement, svg: SVGSVGElement): DiagramHandle => {
  return {
    getRoot: () => svg,
    getContainer: () => container,
    resolveTarget: (target: TargetDescriptor) => resolveTarget({ getRoot: () => svg } as DiagramHandle, target),
    destroy: () => {
      container.innerHTML = "";
    }
  };
};

export const createMermaidDiagramAdapter = (): DiagramAdapter => {
  return {
    async render({ mountEl, mermaidText }) {
      const mermaid = (window as Window & { mermaid?: { render: Function; run?: Function } }).mermaid;
      if (!mermaid || typeof mermaid.render !== "function") {
        throw new Error("Mermaid is not available on window.mermaid");
      }
      const renderId = `finsteps-${Math.random().toString(36).slice(2, 8)}`;
      const { svg } = await mermaid.render(renderId, mermaidText);
      mountEl.innerHTML = "";
      const container = document.createElement("div");
      container.className = "finsteps-diagram";
      container.innerHTML = svg;
      mountEl.appendChild(container);
      const svgElement = container.querySelector("svg");
      if (!svgElement) {
        throw new Error("Mermaid render did not return an SVG element");
      }
      return createDiagramHandle(container, svgElement);
    }
  };
};
