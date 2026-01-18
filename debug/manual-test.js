// Manual test script that can be run in browser console or via MCP servers
// This captures the state we need to debug the transform issue

async function captureWalkthroughState() {
  const state = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    svg: null,
    viewBox: null,
    nodes: [],
    controller: null,
  };

  // Get SVG element
  const svg = document.querySelector("svg");
  if (!svg) {
    return { error: "SVG not found", ...state };
  }

  state.svg = {
    viewBox: svg.getAttribute("viewBox"),
    width: svg.clientWidth,
    height: svg.clientHeight,
    widthAttr: svg.getAttribute("width"),
    heightAttr: svg.getAttribute("height"),
    preserveAspectRatio: svg.getAttribute("preserveAspectRatio"),
  };

  // Get all node groups
  const nodeGroups = Array.from(svg.querySelectorAll('g.node[data-id]'));
  state.nodes = nodeGroups.map((node) => {
    const dataId = node.getAttribute("data-id");
    const transform = node.getAttribute("transform");
    
    let bboxLocal = null;
    let ctm = null;
    let bboxTransformed = null;
    
    try {
      bboxLocal = node.getBBox();
    } catch (e) {
      // Ignore
    }
    
    try {
      ctm = node.getCTM();
      if (ctm && bboxLocal) {
        // Transform bbox corners
        const x1 = bboxLocal.x;
        const y1 = bboxLocal.y;
        const x2 = bboxLocal.x + bboxLocal.width;
        const y2 = bboxLocal.y + bboxLocal.height;
        
        const point1 = svg.createSVGPoint();
        point1.x = x1;
        point1.y = y1;
        const transformed1 = point1.matrixTransform(ctm);
        
        const point2 = svg.createSVGPoint();
        point2.x = x2;
        point2.y = y1;
        const transformed2 = point2.matrixTransform(ctm);
        
        const point3 = svg.createSVGPoint();
        point3.x = x1;
        point3.y = y2;
        const transformed3 = point3.matrixTransform(ctm);
        
        const point4 = svg.createSVGPoint();
        point4.x = x2;
        point4.y = y2;
        const transformed4 = point4.matrixTransform(ctm);
        
        const minX = Math.min(transformed1.x, transformed2.x, transformed3.x, transformed4.x);
        const minY = Math.min(transformed1.y, transformed2.y, transformed3.y, transformed4.y);
        const maxX = Math.max(transformed1.x, transformed2.x, transformed3.x, transformed4.x);
        const maxY = Math.max(transformed1.y, transformed2.y, transformed3.y, transformed4.y);
        
        bboxTransformed = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      }
    } catch (e) {
      // Ignore
    }
    
    return {
      dataId,
      id: node.id,
      transform,
      bboxLocal,
      bboxTransformed,
      ctm: ctm ? {
        a: ctm.a, b: ctm.b, c: ctm.c, d: ctm.d,
        e: ctm.e, f: ctm.f,
      } : null,
      className: typeof node.className === 'string' ? node.className : node.className.baseVal,
    };
  });

  // Try to get controller state
  if (window.__controller) {
    state.controller = {
      currentStepId: window.__controller.getState().stepId,
      currentIndex: window.__controller.getState().currentIndex,
    };
  }

  return state;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { captureWalkthroughState };
} else {
  window.captureWalkthroughState = captureWalkthroughState;
}
