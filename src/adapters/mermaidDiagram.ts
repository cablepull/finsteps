import { MPFError } from "../errors.js";
import { DiagramAdapter, DiagramHandle, TargetDescriptor } from "../types.js";
import { resolveTarget } from "../targetResolver.js";
import { detectDiagramType } from "./diagramTypeDetector.js";
import { DiagramStrategy } from "./diagramStrategies.js";
import { strategyRegistry } from "./diagramStrategyRegistry.js";
import { FlowchartStrategy } from "./strategies/flowchartStrategy.js";
import { GanttStrategy } from "./strategies/ganttStrategy.js";
import { SequenceDiagramStrategy } from "./strategies/sequenceDiagramStrategy.js";
import { ClassDiagramStrategy } from "./strategies/classDiagramStrategy.js";
import { StateDiagramStrategy } from "./strategies/stateDiagramStrategy.js";
import { ERDiagramStrategy } from "./strategies/erDiagramStrategy.js";
import { PieChartStrategy } from "./strategies/pieChartStrategy.js";
import { JourneyStrategy } from "./strategies/journeyStrategy.js";
import { GitGraphStrategy } from "./strategies/gitGraphStrategy.js";
import { TimelineStrategy } from "./strategies/timelineStrategy.js";
import { QuadrantChartStrategy } from "./strategies/quadrantChartStrategy.js";
import { RequirementStrategy } from "./strategies/requirementStrategy.js";
import { C4Strategy } from "./strategies/c4Strategy.js";
import { BlockDiagramStrategy } from "./strategies/blockDiagramStrategy.js";

// Register default strategies
strategyRegistry.register('flowchart', new FlowchartStrategy());
strategyRegistry.register('gantt', new GanttStrategy());
strategyRegistry.register('sequenceDiagram', new SequenceDiagramStrategy());
strategyRegistry.register('classDiagram', new ClassDiagramStrategy());
strategyRegistry.register('stateDiagram', new StateDiagramStrategy());
strategyRegistry.register('stateDiagram-v2', new StateDiagramStrategy());
strategyRegistry.register('erDiagram', new ERDiagramStrategy());
strategyRegistry.register('pie', new PieChartStrategy());
strategyRegistry.register('journey', new JourneyStrategy());
strategyRegistry.register('gitGraph', new GitGraphStrategy());
// Experimental types
strategyRegistry.register('timeline', new TimelineStrategy());
strategyRegistry.register('quadrantChart', new QuadrantChartStrategy());
strategyRegistry.register('requirement', new RequirementStrategy());
strategyRegistry.register('c4Context', new C4Strategy('c4Context'));
strategyRegistry.register('c4Container', new C4Strategy('c4Container'));
strategyRegistry.register('c4Component', new C4Strategy('c4Component'));
strategyRegistry.register('block', new BlockDiagramStrategy());
// Set flowchart as default fallback
strategyRegistry.setDefault(new FlowchartStrategy());

/**
 * Mermaid puts node ids in the element's `id` (e.g. flowchart-PM-0, flowchart-ENG-0).
 * We copy the node id into data-id so that target: { dataId: "PM" } works.
 */
function ensureDataIdFromMermaidIds(svg: SVGSVGElement, strategy: DiagramStrategy): void {
  // Use strategy to extract node IDs
  const nodeIdMap = strategy.extractNodeIds(svg);
  
  // Second pass: set data-id attributes on the extracted elements
  for (const [nodeId, el] of nodeIdMap) {
    el.setAttribute("data-id", nodeId);
  }
}

const createDiagramHandle = (container: HTMLElement, svg: SVGSVGElement, strategy: DiagramStrategy): DiagramHandle => {
  return {
    getRoot: () => svg,
    getContainer: () => container,
    resolveTarget: (target: TargetDescriptor) => resolveTarget({ getRoot: () => svg, getStrategy: () => strategy } as DiagramHandle, target),
    getStrategy: () => strategy,
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
        throw new MPFError("Mermaid is not available on window.mermaid", "MPF_MERMAID_UNAVAILABLE");
      }
      const renderId = `finsteps-${Math.random().toString(36).slice(2, 8)}`;
      const { svg } = await mermaid.render(renderId, mermaidText);
      mountEl.innerHTML = "";
      const container = document.createElement("div");
      container.className = "finsteps-diagram";
      container.tabIndex = 0;
      container.setAttribute("role", "application");
      container.innerHTML = svg;
      mountEl.appendChild(container);
      const svgElement = container.querySelector("svg");
      if (!svgElement) {
        throw new MPFError(
          "Mermaid render did not return an SVG element",
          "MPF_MERMAID_RENDER_FAILED"
        );
      }
      const diagramType = detectDiagramType(mermaidText);
      const strategy = strategyRegistry.getOrDefault(diagramType);
      ensureDataIdFromMermaidIds(svgElement, strategy);
      
      // Ensure SVG has width/height attributes for proper rendering with viewBox
      // Remove any existing width/height so viewBox can control scaling
      // When using viewBox, we want the SVG to scale to container size
      // Setting width/height to 100% allows viewBox to control the aspect ratio
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");
      svgElement.setAttribute("width", "100%");
      svgElement.setAttribute("height", "100%");
      // Also ensure preserveAspectRatio is set for proper scaling
      if (!svgElement.getAttribute("preserveAspectRatio")) {
        svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
      
      // Ensure SVG has a proper viewBox if Mermaid didn't set one
      const existingViewBox = svgElement.getAttribute("viewBox");
      if (!existingViewBox || existingViewBox === "0 0 0 0") {
        // Calculate initial viewBox from content
        const rootGroup = svgElement.querySelector("g");
        if (rootGroup) {
          try {
            const bbox = rootGroup.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
              const padding = 40;
              svgElement.setAttribute(
                "viewBox",
                `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`
              );
            }
          } catch {
            // getBBox failed, try using width/height attributes
            const width = svgElement.getAttribute("width");
            const height = svgElement.getAttribute("height");
            if (width && height) {
              const w = parseFloat(width) || 1000;
              const h = parseFloat(height) || 1000;
              svgElement.setAttribute("viewBox", `0 0 ${w} ${h}`);
            }
          }
        }
      }
      
      return createDiagramHandle(container, svgElement, strategy);
    }
  };
};
