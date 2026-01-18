import { MPFError } from "../errors.js";
import { DiagramAdapter, DiagramHandle, TargetDescriptor } from "../types.js";
import { resolveTarget } from "../targetResolver.js";

/**
 * Mermaid puts node ids in the element's `id` (e.g. flowchart-PM-0, flowchart-ENG-0).
 * We copy the node id into data-id so that target: { dataId: "PM" } works.
 */
function ensureDataIdFromMermaidIds(svg: SVGSVGElement): void {
  const nodeIdMap = new Map<string, SVGElement>();
  
  // First pass: find all elements with ids and extract node ids
  // Then find the corresponding node groups for each nodeId
  for (const el of Array.from(svg.querySelectorAll<SVGElement>("[id]"))) {
    const id = el.getAttribute("id");
    if (!id) continue;
    
    // Match Mermaid node id patterns:
    // - flowchart-{nodeId}-{digit}
    // - flowchart-{digit}-{nodeId}
    // - flowcharts-{nodeId}-{digit}
    // - node-{nodeId} or similar
    let nodeId: string | null = null;
    
    const patterns = [
      /^[a-zA-Z0-9-]+-([A-Za-z0-9_]+)-\d+$/,  // prefix-nodeId-digit
      /^[a-zA-Z0-9-]+-\d+-([A-Za-z0-9_]+)$/,  // prefix-digit-nodeId
      /^node-([A-Za-z0-9_]+)$/,                // node-nodeId
      /^flowchart-([A-Za-z0-9_]+)-/,           // flowchart-nodeId- (partial match)
    ];
    
    for (const pattern of patterns) {
      const m = id.match(pattern);
      if (m && m[1]) {
        nodeId = m[1];
        break;
      }
    }
    
    if (nodeId && !nodeIdMap.has(nodeId)) {
      // Find the node group (<g class="node">) that contains this element
      let current: Element | null = el;
      let nodeGroup: SVGElement | null = null;
      
      // Walk up the tree to find the node group
      while (current && current !== svg) {
        if (current instanceof SVGElement && current.tagName === "g") {
          const className = typeof current.className === 'string' ? current.className : current.className.baseVal;
          if (className && className.includes('node')) {
            nodeGroup = current;
            break;
          }
        }
        current = current.parentElement;
      }
      
      // If we found a node group, use it; otherwise use the element itself if it's a graphics element
      if (nodeGroup) {
        nodeIdMap.set(nodeId, nodeGroup);
      } else if (el.tagName === "g" && el.classList.contains("node")) {
        nodeIdMap.set(nodeId, el);
      }
    }
  }
  
  // Second pass: set data-id attributes ONLY on node groups
  for (const [nodeId, el] of nodeIdMap) {
    // Double-check it's a node group before setting data-id
    if (el.tagName === "g") {
      const className = typeof el.className === 'string' ? el.className : el.className.baseVal;
      if (className && className.includes('node')) {
        el.setAttribute("data-id", nodeId);
      }
    }
  }
}

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
      ensureDataIdFromMermaidIds(svgElement);
      
      // #region agent log - verify data-id was set correctly
      const nodeGroups = Array.from(svgElement.querySelectorAll('g.node[data-id]'));
      const dataIdMap: Record<string, any> = {};
      for (const nodeGroup of nodeGroups) {
        if (nodeGroup instanceof SVGElement) {
          const dataId = nodeGroup.getAttribute('data-id');
          if (dataId) {
            const className = typeof nodeGroup.className === 'string' ? nodeGroup.className : nodeGroup.className.baseVal;
            dataIdMap[dataId] = {
              tagName: nodeGroup.tagName,
              id: nodeGroup.id,
              className
            };
          }
        }
      }
      const logDataId = {location:'mermaidDiagram.ts:92',message:'data-id setup',data:{nodeGroupsWithDataId:Object.keys(dataIdMap).length,dataIdMap},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
      console.log('[DEBUG]', logDataId);
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataId)}).catch(()=>{});
      // #endregion
      
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
      
      return createDiagramHandle(container, svgElement);
    }
  };
};
