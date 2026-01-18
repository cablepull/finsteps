// Manual inspection script for gantt chart structure
// Run this in the browser console on the timeline example page

async function inspectGanttStructure() {
  const svg = document.querySelector("svg");
  if (!svg) {
    return { error: "SVG not found" };
  }

  // Find all elements with data-id
  const dataIdElements = Array.from(svg.querySelectorAll("[data-id]"));
  
  // Find all elements with IDs
  const idElements = Array.from(svg.querySelectorAll("[id]")).slice(0, 30);
  
  // Find task/section related elements
  const taskElements = Array.from(svg.querySelectorAll("g[class*='task'], rect[class*='task'], g[class*='section']"));
  
  // Try to find req1 specifically
  const req1Elements = Array.from(svg.querySelectorAll('[data-id="req1"], [id*="req1"]'));
  
  // Get SVG info
  const svgInfo = {
    viewBox: svg.getAttribute("viewBox"),
    width: svg.getAttribute("width"),
    height: svg.getAttribute("height"),
    clientWidth: svg.clientWidth,
    clientHeight: svg.clientHeight,
  };

  // Inspect structure for req1
  const req1Details = req1Elements.map(el => {
    const bbox = (() => {
      try {
        return (el instanceof SVGGraphicsElement) ? el.getBBox() : null;
      } catch {
        return null;
      }
    })();
    
    return {
      tagName: el.tagName,
      id: el.id,
      dataId: el.getAttribute("data-id"),
      className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
      parentTagName: el.parentElement?.tagName,
      parentClassName: el.parentElement instanceof SVGElement ? (typeof el.parentElement.className === 'string' ? el.parentElement.className : el.parentElement.className.baseVal) : '',
      transform: el.getAttribute("transform"),
      bbox: bbox ? { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height } : null,
    };
  });

  return {
    svgInfo,
    dataIdElements: dataIdElements.map(el => ({
      tagName: el.tagName,
      id: el.id,
      dataId: el.getAttribute("data-id"),
      className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
      parentTagName: el.parentElement?.tagName,
      parentClassName: el.parentElement instanceof SVGElement ? (typeof el.parentElement.className === 'string' ? el.parentElement.className : el.parentElement.className.baseVal) : '',
    })),
    idElements: idElements.map(el => ({
      tagName: el.tagName,
      id: el.id,
      className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
    })),
    taskElements: taskElements.slice(0, 10).map(el => ({
      tagName: el.tagName,
      id: el.id,
      className: el instanceof SVGElement ? (typeof el.className === 'string' ? el.className : el.className.baseVal) : '',
    })),
    req1Details,
  };
}

// Export for console
if (typeof window !== 'undefined') {
  window.inspectGanttStructure = inspectGanttStructure;
}

// Also send results to log endpoint
inspectGanttStructure().then(result => {
  console.log("Gantt Structure:", JSON.stringify(result, null, 2));
  
  // Send to debug log
  fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'inspect-gantt-structure.js',
      message: 'gantt structure inspection',
      data: result,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    })
  }).catch(() => {});
  
  return result;
});
