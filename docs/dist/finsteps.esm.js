// src/adapters/diagramStrategies.ts
var BaseDiagramStrategy = class {
  /**
   * Helper: Extract node ID from Mermaid's generated ID using patterns
   */
  extractIdFromPatterns(id, patterns) {
    for (const pattern of patterns) {
      const match = id.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }
  /**
   * Helper: Get element's class name as a string
   */
  getElementClassName(el) {
    if (typeof el.className === "string") {
      return el.className;
    }
    return el.className.baseVal;
  }
  /**
   * Helper: Check if element has any of the targetable classes
   */
  hasTargetableClass(el) {
    const className = this.getElementClassName(el);
    const targetableClasses = this.getTargetableClasses();
    return targetableClasses.some((targetClass) => className.includes(targetClass));
  }
  /**
   * Helper: Escape a CSS selector value
   */
  escapeSelector(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
};

// src/adapters/strategies/flowchartStrategy.ts
var FlowchartStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "flowchart";
  }
  getTargetableClasses() {
    return ["node"];
  }
  getTargetableTags() {
    return ["g"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^[a-zA-Z0-9-]+-([A-Za-z0-9_]+)-\d+$/,
      // prefix-nodeId-digit
      /^[a-zA-Z0-9-]+-\d+-([A-Za-z0-9_]+)$/,
      // prefix-digit-nodeId
      /^node-([A-Za-z0-9_]+)$/,
      // node-nodeId
      /^flowchart-([A-Za-z0-9_]+)-/
      // flowchart-nodeId- (partial match)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && className.includes("node")) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.node[data-id="${escapedId}"]`,
      `g[class*="node"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    let targetBbox;
    try {
      const bboxLocal = target.getBBox();
      const transform = target.getAttribute("transform");
      if (transform && transform.includes("translate")) {
        const translateMatch = transform.match(/translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/);
        if (translateMatch) {
          const tx = parseFloat(translateMatch[1]);
          const ty = parseFloat(translateMatch[2]);
          targetBbox = new DOMRect(
            bboxLocal.x + tx,
            bboxLocal.y + ty,
            bboxLocal.width,
            bboxLocal.height
          );
        } else {
          targetBbox = bboxLocal;
        }
      } else {
        targetBbox = bboxLocal;
      }
    } catch {
      return [];
    }
    const targetCenterX = targetBbox.x + targetBbox.width / 2;
    const targetCenterY = targetBbox.y + targetBbox.height / 2;
    const edgePaths = Array.from(svg.querySelectorAll('path.edge, path[class*="edge"], g.edge path, path[id*="edge"]'));
    const adjacentNodes = /* @__PURE__ */ new Set();
    for (const edgePath of edgePaths) {
      try {
        const edgeBbox = edgePath.getBBox();
        const edgeCenterX = edgeBbox.x + edgeBbox.width / 2;
        const edgeCenterY = edgeBbox.y + edgeBbox.height / 2;
        const threshold = Math.max(targetBbox.width, targetBbox.height) * 1.5;
        const distanceToCenter = Math.sqrt(
          Math.pow(edgeCenterX - targetCenterX, 2) + Math.pow(edgeCenterY - targetCenterY, 2)
        );
        const edgeIntersectsTarget = edgeBbox.x < targetBbox.x + targetBbox.width && edgeBbox.x + edgeBbox.width > targetBbox.x && edgeBbox.y < targetBbox.y + targetBbox.height && edgeBbox.y + edgeBbox.height > targetBbox.y;
        const pathData = edgePath.getAttribute("d");
        let pathNearTarget = false;
        if (pathData) {
          const pathCommands = pathData.match(/[ML]\s*([-\d.]+)\s+([-\d.]+)/g);
          if (pathCommands) {
            for (const cmd of pathCommands) {
              const coords = cmd.match(/[ML]\s*([-\d.]+)\s+([-\d.]+)/);
              if (coords) {
                const x = parseFloat(coords[1]);
                const y = parseFloat(coords[2]);
                const dist = Math.sqrt(Math.pow(x - targetCenterX, 2) + Math.pow(y - targetCenterY, 2));
                if (dist < threshold) {
                  pathNearTarget = true;
                  break;
                }
              }
            }
          }
        }
        if (edgeIntersectsTarget || pathNearTarget || distanceToCenter < threshold) {
          const allNodes = Array.from(svg.querySelectorAll("g.node[data-id]"));
          for (const node of allNodes) {
            if (node === target)
              continue;
            if (adjacentNodes.has(node))
              continue;
            try {
              const nodeBboxLocal = node.getBBox();
              const nodeTransform = node.getAttribute("transform");
              let nodeBbox = nodeBboxLocal;
              if (nodeTransform && nodeTransform.includes("translate")) {
                const translateMatch = nodeTransform.match(/translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/);
                if (translateMatch) {
                  const tx = parseFloat(translateMatch[1]);
                  const ty = parseFloat(translateMatch[2]);
                  nodeBbox = new DOMRect(
                    nodeBboxLocal.x + tx,
                    nodeBboxLocal.y + ty,
                    nodeBboxLocal.width,
                    nodeBboxLocal.height
                  );
                }
              }
              const nodeCenterX = nodeBbox.x + nodeBbox.width / 2;
              const nodeCenterY = nodeBbox.y + nodeBbox.height / 2;
              const nodeDistanceToEdge = Math.sqrt(
                Math.pow(nodeCenterX - edgeCenterX, 2) + Math.pow(nodeCenterY - edgeCenterY, 2)
              );
              const nodeIntersectsEdge = nodeBbox.x < edgeBbox.x + edgeBbox.width && nodeBbox.x + nodeBbox.width > edgeBbox.x && nodeBbox.y < edgeBbox.y + edgeBbox.height && nodeBbox.y + nodeBbox.height > edgeBbox.y;
              if (nodeIntersectsEdge || nodeDistanceToEdge < threshold) {
                adjacentNodes.add(node);
              }
            } catch {
              continue;
            }
          }
        }
      } catch {
        continue;
      }
    }
    return Array.from(adjacentNodes);
  }
};

// src/adapters/basicCamera.ts
var easingFunctions = {
  linear: (t) => t,
  // CSS standard easing
  ease: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  // Cubic bezier variants (as shown in ADR)
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => --t * t * t + 1,
  cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  // Additional common easing functions
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  quartIn: (t) => t * t * t * t,
  quartOut: (t) => 1 - --t * t * t * t,
  quartInOut: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  quintIn: (t) => t * t * t * t * t,
  quintOut: (t) => 1 + --t * t * t * t * t,
  quintInOut: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
  sineIn: (t) => 1 - Math.cos(t * Math.PI / 2),
  sineOut: (t) => Math.sin(t * Math.PI / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  expoIn: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoInOut: (t) => {
    if (t === 0)
      return 0;
    if (t === 1)
      return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  circIn: (t) => 1 - Math.sqrt(1 - t * t),
  circOut: (t) => Math.sqrt(1 - --t * t),
  circInOut: (t) => t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2,
  backIn: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  backOut: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  backInOut: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5 ? Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  }
};
function getEasingFunction(name) {
  return easingFunctions[name] || easingFunctions.easeOut;
}
function getElementBBox(element, svg) {
  if (element instanceof SVGGraphicsElement) {
    try {
      const bbox = element.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        return bbox;
      }
    } catch {
    }
  }
  const rect = element.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  if (!viewBox || svgRect.width === 0 || svgRect.height === 0) {
    return new DOMRect(0, 0, 0, 0);
  }
  const scaleX = viewBox.width / svgRect.width;
  const scaleY = viewBox.height / svgRect.height;
  return new DOMRect(
    (rect.left - svgRect.left) * scaleX + viewBox.x,
    (rect.top - svgRect.top) * scaleY + viewBox.y,
    rect.width * scaleX,
    rect.height * scaleY
  );
}
var getSvgViewBox = (svg) => {
  const baseVal = svg.viewBox?.baseVal;
  if (baseVal && baseVal.width && baseVal.height) {
    return `${baseVal.x} ${baseVal.y} ${baseVal.width} ${baseVal.height}`;
  }
  return svg.getAttribute("viewBox");
};
function findAdjacentNodes(targetNode, svg, strategy) {
  if (targetNode instanceof SVGGraphicsElement) {
    return strategy.findAdjacentElements(targetNode, svg);
  }
  return [];
}
var calculateFullBoundingBox = (svg, padding = 40) => {
  const storedInitialViewBox = svg.getAttribute("data-initial-viewbox");
  if (storedInitialViewBox) {
    return storedInitialViewBox;
  }
  let rootGroup = null;
  for (const child of Array.from(svg.children)) {
    if (child instanceof SVGGElement) {
      rootGroup = child;
      break;
    }
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  if (rootGroup) {
    try {
      const bbox = rootGroup.getBBox();
      minX = bbox.x;
      minY = bbox.y;
      maxX = bbox.x + bbox.width;
      maxY = bbox.y + bbox.height;
    } catch {
    }
  }
  const calculatedWidth = maxX - minX;
  const calculatedHeight = maxY - minY;
  const existingViewBox = getSvgViewBox(svg);
  let existingViewBoxSize = { width: 0, height: 0 };
  if (existingViewBox) {
    const parts = existingViewBox.split(" ").map(Number);
    if (parts.length === 4) {
      existingViewBoxSize = { width: parts[2], height: parts[3] };
    }
  }
  let initialViewBoxSize = { width: 0, height: 0 };
  if (storedInitialViewBox) {
    const parts = storedInitialViewBox.split(" ").map(Number);
    if (parts.length === 4) {
      initialViewBoxSize = { width: parts[2], height: parts[3] };
    }
  }
  const shouldUseElementCalculation = !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY) || calculatedWidth < 10 || calculatedHeight < 10 || existingViewBoxSize.width > 0 && calculatedWidth < existingViewBoxSize.width * 0.1 || initialViewBoxSize.width > 0 && calculatedWidth < initialViewBoxSize.width * 0.5;
  if (shouldUseElementCalculation) {
    const topLevelElements = [];
    for (const child of Array.from(svg.children)) {
      if (child instanceof SVGGraphicsElement) {
        topLevelElements.push(child);
      }
    }
    if (topLevelElements.length === 0) {
      topLevelElements.push(
        ...Array.from(svg.querySelectorAll("g, rect, circle, ellipse, line, polyline, polygon, path, text"))
      );
    }
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;
    for (const el of topLevelElements) {
      try {
        const bbox = el.getBBox();
        if (isFinite(bbox.x) && isFinite(bbox.y) && isFinite(bbox.width) && isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
          minX = Math.min(minX, bbox.x);
          minY = Math.min(minY, bbox.y);
          maxX = Math.max(maxX, bbox.x + bbox.width);
          maxY = Math.max(maxY, bbox.y + bbox.height);
        }
      } catch {
        continue;
      }
    }
  }
  const finalWidth = maxX - minX;
  const finalHeight = maxY - minY;
  const isSignificantlySmallerThanInitial = initialViewBoxSize.width > 0 && finalWidth < initialViewBoxSize.width * 0.7;
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY) || finalWidth < 10 || finalHeight < 10 || existingViewBoxSize.width > 0 && finalWidth < existingViewBoxSize.width * 0.1 || isSignificantlySmallerThanInitial) {
    if (storedInitialViewBox && initialViewBoxSize.width > 0 && initialViewBoxSize.height > 0) {
      return storedInitialViewBox;
    }
    if (existingViewBox) {
      return existingViewBox;
    }
    const width = svg.getAttribute("width");
    const height = svg.getAttribute("height");
    if (width && height) {
      const w = parseFloat(width) || 1e3;
      const h = parseFloat(height) || 1e3;
      return `0 0 ${w} ${h}`;
    }
    return null;
  }
  const viewBox = {
    x: minX - padding,
    y: minY - padding,
    width: finalWidth + padding * 2,
    height: finalHeight + padding * 2
  };
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
};
function parseViewBox(viewBoxStr) {
  if (!viewBoxStr)
    return null;
  const parts = viewBoxStr.split(" ").map(Number);
  if (parts.length !== 4 || parts.some(isNaN))
    return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}
function animateViewBox(svg, start, end, duration, easing) {
  return new Promise((resolve) => {
    if (!start) {
      svg.setAttribute("viewBox", `${end.x} ${end.y} ${end.width} ${end.height}`);
      resolve();
      return;
    }
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easing(progress);
      const currentViewBox = {
        x: start.x + (end.x - start.x) * eased,
        y: start.y + (end.y - start.y) * eased,
        width: start.width + (end.width - start.width) * eased,
        height: start.height + (end.height - start.height) * eased
      };
      svg.setAttribute(
        "viewBox",
        `${currentViewBox.x} ${currentViewBox.y} ${currentViewBox.width} ${currentViewBox.height}`
      );
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        svg.setAttribute("viewBox", `${end.x} ${end.y} ${end.width} ${end.height}`);
        resolve();
      }
    };
    requestAnimationFrame(animate);
  });
}
var createBasicCameraHandle = (diagram) => {
  const svg = diagram.getRoot();
  let container = diagram.getContainer();
  const originalViewBox = getSvgViewBox(svg);
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  const pan = (deltaX, deltaY) => {
    const baseVal = svg.viewBox?.baseVal;
    if (!baseVal || !baseVal.width || !baseVal.height) {
      return;
    }
    const currentViewBox = {
      x: baseVal.x,
      y: baseVal.y,
      width: baseVal.width,
      height: baseVal.height
    };
    const svgWidth = svg.clientWidth || baseVal.width;
    const svgHeight = svg.clientHeight || baseVal.height;
    const scaleX = currentViewBox.width / svgWidth;
    const scaleY = currentViewBox.height / svgHeight;
    const newX = currentViewBox.x - deltaX * scaleX;
    const newY = currentViewBox.y - deltaY * scaleY;
    svg.setAttribute("viewBox", `${newX} ${newY} ${currentViewBox.width} ${currentViewBox.height}`);
  };
  const handleMouseDown = (e) => {
    if (e.button !== 0)
      return;
    if (e.target?.closest("button") || e.target?.closest(".nav-btn") || e.target?.closest(".dataid-chip") || e.target?.closest("a"))
      return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
    e.preventDefault();
  };
  const handleMouseMove = (e) => {
    if (!isDragging)
      return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    pan(deltaX, deltaY);
    startX = e.clientX;
    startY = e.clientY;
    e.preventDefault();
  };
  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      container.style.cursor = "grab";
      container.style.userSelect = "";
    }
  };
  const handleMouseLeave = () => {
    if (isDragging) {
      isDragging = false;
      container.style.cursor = "grab";
      container.style.userSelect = "";
    }
  };
  container.style.cursor = "grab";
  container.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  container.addEventListener("mouseleave", handleMouseLeave);
  return {
    fit(target, options) {
      if (!target) {
        return;
      }
      try {
        let bbox = getElementBBox(target, svg);
        const transform = target instanceof SVGElement ? target.getAttribute("transform") : null;
        if (target instanceof SVGGraphicsElement && transform && transform.includes("translate")) {
          try {
            const translateMatch = transform.match(/translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/);
            if (translateMatch) {
              const tx = parseFloat(translateMatch[1]);
              const ty = parseFloat(translateMatch[2]);
              bbox = new DOMRect(
                bbox.x + tx,
                bbox.y + ty,
                bbox.width,
                bbox.height
              );
            }
          } catch {
          }
        }
        const padding = options?.padding ?? 16;
        const minDimension = 40;
        if (bbox.height < minDimension) {
          bbox = new DOMRect(
            bbox.x,
            bbox.y - minDimension / 2,
            bbox.width || minDimension,
            minDimension
          );
        }
        if (bbox.width < minDimension) {
          bbox = new DOMRect(
            bbox.x - minDimension / 2,
            bbox.y,
            minDimension,
            bbox.height || minDimension
          );
        }
        const strategy = diagram.getStrategy?.() || new FlowchartStrategy();
        const adjacentNodes = findAdjacentNodes(target, svg, strategy);
        let unionBbox = bbox;
        for (const adjacentNode of adjacentNodes) {
          try {
            const adjBbox = getElementBBox(adjacentNode, svg);
            const minX = Math.min(unionBbox.x, adjBbox.x);
            const minY = Math.min(unionBbox.y, adjBbox.y);
            const maxX = Math.max(unionBbox.x + unionBbox.width, adjBbox.x + adjBbox.width);
            const maxY = Math.max(unionBbox.y + unionBbox.height, adjBbox.y + adjBbox.height);
            unionBbox = new DOMRect(
              minX,
              minY,
              maxX - minX,
              maxY - minY
            );
          } catch {
            continue;
          }
        }
        bbox = unionBbox;
        if (!isFinite(bbox.width) || !isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) {
          const parent = target.parentElement;
          if (parent) {
            const parentBBox = getElementBBox(parent, svg);
            if (isFinite(parentBBox.width) && isFinite(parentBBox.height) && parentBBox.width > 0 && parentBBox.height > 0) {
              const viewBox2 = {
                x: parentBBox.x - padding,
                y: parentBBox.y - padding,
                width: parentBBox.width + padding * 2,
                height: parentBBox.height + padding * 2
              };
              svg.setAttribute("viewBox", `${viewBox2.x} ${viewBox2.y} ${viewBox2.width} ${viewBox2.height}`);
              return;
            }
          }
          return;
        }
        let rootGroupBBox = null;
        try {
          const rootGroup = Array.from(svg.children).find((child) => child instanceof SVGGElement);
          if (rootGroup) {
            rootGroupBBox = rootGroup.getBBox();
          }
        } catch {
        }
        if (rootGroupBBox && (bbox.x < rootGroupBBox.x || bbox.y < rootGroupBBox.y || bbox.x + bbox.width > rootGroupBBox.x + rootGroupBBox.width || bbox.y + bbox.height > rootGroupBBox.y + rootGroupBBox.height)) {
          const minX = Math.min(unionBbox.x, rootGroupBBox.x);
          const minY = Math.min(unionBbox.y, rootGroupBBox.y);
          const maxX = Math.max(unionBbox.x + unionBbox.width, rootGroupBBox.x + rootGroupBBox.width);
          const maxY = Math.max(unionBbox.y + unionBbox.height, rootGroupBBox.y + rootGroupBBox.height);
          unionBbox = new DOMRect(
            minX,
            minY,
            maxX - minX,
            maxY - minY
          );
        }
        const finalBbox = unionBbox;
        const viewBox = {
          x: finalBbox.x - padding,
          y: finalBbox.y - padding,
          width: finalBbox.width + padding * 2,
          height: finalBbox.height + padding * 2
        };
        const viewBoxString = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
        const duration = options?.duration ?? 0;
        const easingName = options?.easing ?? "easeOut";
        if (duration <= 0) {
          svg.setAttribute("viewBox", viewBoxString);
        } else {
          const startViewBox = parseViewBox(svg.getAttribute("viewBox"));
          const endViewBox = viewBox;
          const easing = getEasingFunction(easingName);
          return animateViewBox(svg, startViewBox, endViewBox, duration, easing);
        }
      } catch (error) {
        console.warn("Failed to get bounding box for camera.fit:", error);
      }
    },
    reset() {
      const fullViewBox = calculateFullBoundingBox(svg);
      if (fullViewBox) {
        svg.setAttribute("viewBox", fullViewBox);
      } else if (originalViewBox) {
        svg.setAttribute("viewBox", originalViewBox);
      }
    },
    zoom(factor, center) {
      const baseVal = svg.viewBox?.baseVal;
      if (!baseVal || !baseVal.width || !baseVal.height) {
        return;
      }
      const currentViewBox = {
        x: baseVal.x,
        y: baseVal.y,
        width: baseVal.width,
        height: baseVal.height
      };
      const zoomCenter = center ?? {
        x: currentViewBox.x + currentViewBox.width / 2,
        y: currentViewBox.y + currentViewBox.height / 2
      };
      const newWidth = currentViewBox.width / factor;
      const newHeight = currentViewBox.height / factor;
      const newX = zoomCenter.x - newWidth / 2;
      const newY = zoomCenter.y - newHeight / 2;
      svg.setAttribute("viewBox", `${newX} ${newY} ${newWidth} ${newHeight}`);
    },
    pan(deltaX, deltaY) {
      const baseVal = svg.viewBox?.baseVal;
      if (!baseVal || !baseVal.width || !baseVal.height) {
        return;
      }
      const currentViewBox = {
        x: baseVal.x,
        y: baseVal.y,
        width: baseVal.width,
        height: baseVal.height
      };
      const svgWidth = svg.clientWidth || baseVal.width;
      const svgHeight = svg.clientHeight || baseVal.height;
      const scaleX = currentViewBox.width / svgWidth;
      const scaleY = currentViewBox.height / svgHeight;
      const newX = currentViewBox.x + deltaX * scaleX;
      const newY = currentViewBox.y + deltaY * scaleY;
      svg.setAttribute("viewBox", `${newX} ${newY} ${currentViewBox.width} ${currentViewBox.height}`);
    },
    fitAll(padding = 40) {
      const fullViewBox = calculateFullBoundingBox(svg, padding);
      if (fullViewBox) {
        svg.setAttribute("viewBox", fullViewBox);
      }
    },
    destroy() {
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.style.cursor = "";
      container.style.userSelect = "";
      const fullViewBox = calculateFullBoundingBox(svg);
      if (fullViewBox) {
        svg.setAttribute("viewBox", fullViewBox);
      } else if (originalViewBox) {
        svg.setAttribute("viewBox", originalViewBox);
      }
    }
  };
};

// src/adapters/basicOverlay.ts
var createBasicOverlayHandle = () => {
  const container = document.createElement("div");
  container.className = "finsteps-overlay";
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "0";
  container.style.height = "0";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);
  const bubbles = /* @__PURE__ */ new Map();
  const updatePositions = () => {
    for (const bubble of bubbles.values()) {
      const rect = bubble.target.getBoundingClientRect();
      const bubbleRect = bubble.element.getBoundingClientRect();
      const top = Math.max(8, rect.top - bubbleRect.height - 8);
      const left = Math.max(8, rect.left + rect.width / 2 - bubbleRect.width / 2);
      bubble.element.style.top = `${top}px`;
      bubble.element.style.left = `${left}px`;
    }
  };
  const onScroll = () => updatePositions();
  const onResize = () => updatePositions();
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);
  return {
    showBubble({ id = "default", target, text }) {
      let bubble = bubbles.get(id);
      if (!bubble) {
        const element = document.createElement("div");
        element.className = "finsteps-bubble";
        element.style.position = "fixed";
        element.style.padding = "8px 12px";
        element.style.borderRadius = "8px";
        element.style.background = "rgba(15, 23, 42, 0.95)";
        element.style.color = "#fff";
        element.style.font = "14px/1.4 sans-serif";
        element.style.maxWidth = "240px";
        element.style.pointerEvents = "none";
        container.appendChild(element);
        bubble = { id, element, target };
        bubbles.set(id, bubble);
      }
      bubble.target = target;
      bubble.element.textContent = text;
      requestAnimationFrame(updatePositions);
    },
    hideBubble(id = "default") {
      const bubble = bubbles.get(id);
      if (!bubble) {
        return;
      }
      bubble.element.remove();
      bubbles.delete(id);
    },
    destroy() {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      for (const bubble of bubbles.values()) {
        bubble.element.remove();
      }
      bubbles.clear();
      container.remove();
    }
  };
};

// src/errors.ts
function generateSuggestions(code, context) {
  switch (code) {
    case "MPF_INVALID_PRESENT_OPTIONS":
      return [
        'Ensure you provide either "ast" or both "mpdText" and "options.parseMpd"',
        "Example: presentMermaid({ mermaidText, mpdText, mountEl, options: { parseMpd } })",
        "See API documentation: https://github.com/cablepull/finsteps#cdn-usage-jsdelivr"
      ];
    case "MPF_MERMAID_UNAVAILABLE":
      return [
        "Load Mermaid.js before importing Finsteps",
        'Add <script src="https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.min.js"><\/script> in your HTML',
        "Ensure mermaid.initialize() is called before presentMermaid()"
      ];
    case "MPF_MERMAID_RENDER_FAILED":
      return [
        "Check your Mermaid diagram syntax is valid",
        "Test your diagram at https://mermaid.live/",
        "Verify the mermaidText is a valid string and not empty"
      ];
    case "MPF_OVERLAY_DESTROYED":
      return [
        "Do not call overlay methods after controller.destroy()",
        "Check that the controller is still active before showing overlays",
        "Ensure lifecycle hooks are not accessing destroyed overlays"
      ];
    case "MPF_OVERLAY_TARGET_MISSING":
      const targetInfo = context?.target ? ` Target: ${JSON.stringify(context.target)}` : "";
      return [
        `Verify the target element exists in the diagram${targetInfo}`,
        "Check that dataId, selector, or id matches an element in the rendered SVG",
        "Use the live editor to see available data-id values: https://cablepull.github.io/finsteps/examples/editor/"
      ];
    case "MPF_ACTION_UNKNOWN":
      const actionType = context?.actionType ? ` Action: ${context.actionType}` : "";
      return [
        `Check that the action type is spelled correctly${actionType}`,
        "Common actions: camera.fit, camera.reset, overlay.bubble, style.highlight, nav.next, nav.prev",
        "See grammar documentation: https://cablepull.github.io/finsteps/grammar.html"
      ];
    case "MPF_ACTION_INVALID_ARGS":
      return [
        "Verify the action payload structure matches the expected format",
        'Check required fields (e.g., camera.fit requires "target" in payload)',
        "Review action documentation in grammar: https://cablepull.github.io/finsteps/grammar.html"
      ];
    case "MPF_PARSE_ERROR":
      return [
        "Use formatDiagnostics(result.diagnostics) to see detailed parse errors",
        "Check your MPD syntax against the EBNF grammar: https://cablepull.github.io/finsteps/ebnf/mpd.ebnf",
        "Validate MPD with parseMPD() before passing to presentMermaid()"
      ];
    default:
      return [];
  }
}
var MPFError = class extends Error {
  constructor(message, code, context) {
    super(message);
    this.name = "MPFError";
    this.code = code;
    this.context = context;
    this.suggestions = generateSuggestions(code, context);
  }
};
var ParseError = class extends MPFError {
  constructor(message, code = "MPF_PARSE_ERROR") {
    super(message, code);
    this.name = "ParseError";
  }
};
var ActionError = class extends MPFError {
  constructor(message, code = "MPF_ACTION_INVALID_ARGS", context) {
    super(message, code, context);
    this.name = "ActionError";
  }
};

// src/targetResolver.ts
var escapeSelector = (value) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
};
var resolveTarget = (diagram, target) => {
  if (!target) {
    return null;
  }
  if (target.element) {
    return target.element;
  }
  const root = diagram.getRoot();
  let element = null;
  if (target.selector) {
    element = root.querySelector(target.selector);
    if (!element && typeof document !== "undefined") {
      element = document.querySelector(target.selector);
    }
  } else if (target.id) {
    element = root.querySelector(`#${escapeSelector(target.id)}`);
  } else if (target.dataId) {
    const strategy = diagram.getStrategy?.() || new FlowchartStrategy();
    const selectors = strategy.getTargetSelectors(target.dataId);
    for (const selector of selectors) {
      element = root.querySelector(selector);
      if (element) {
        break;
      }
    }
    if (!element && root instanceof Element && root.getAttribute("data-id") === target.dataId) {
      element = root;
    }
  }
  if (!element) {
    return null;
  }
  if (!(element instanceof SVGGraphicsElement) || element.tagName === "text" || element instanceof SVGElement && (typeof element.className === "string" && element.className.includes("flowchart-label") || typeof element.className !== "string" && element.className.baseVal.includes("flowchart-label"))) {
    let current = element;
    while (current) {
      const parentEl = current.parentElement;
      if (!parentEl || parentEl === root) {
        break;
      }
      if (parentEl instanceof SVGGraphicsElement) {
        if (parentEl.tagName === "g") {
          const parentClassName = parentEl instanceof SVGElement ? typeof parentEl.className === "string" ? parentEl.className : parentEl.className.baseVal : "";
          if (parentClassName.includes("node") && parentEl !== root && parentEl.getAttribute("data-id") === target?.dataId) {
            return parentEl;
          }
          const parentParent = parentEl.parentElement;
          if (parentParent === root || parentParent && parentParent.tagName === "svg") {
            current = parentEl;
            continue;
          }
        }
        if (parentEl === root) {
          break;
        }
      }
      current = parentEl;
    }
    if (current instanceof SVGGraphicsElement && current !== root) {
      const currentParent = current.parentElement;
      if (currentParent && currentParent.tagName !== "svg") {
        return current;
      }
    }
  }
  if (element instanceof SVGGraphicsElement && element.tagName !== "g") {
    const parent = element.parentElement;
    if (parent instanceof SVGGraphicsElement && parent.tagName === "g") {
      const parentClassName = parent instanceof SVGElement ? typeof parent.className === "string" ? parent.className : parent.className.baseVal : "";
      if (parentClassName.includes("node") && parent.getAttribute("data-id") === target?.dataId) {
        return parent;
      }
    }
  }
  if (element.tagName === "g") {
    const elementParent = element.parentElement;
    if (elementParent === root || elementParent && elementParent.tagName === "svg") {
      const elementDataId = element.getAttribute("data-id");
      const elementClassName = element instanceof SVGElement ? typeof element.className === "string" ? element.className : element.className.baseVal : "";
      if (elementDataId !== target?.dataId || !elementClassName.includes("node")) {
        const escapedDataId = target?.dataId ? escapeSelector(target.dataId) : "";
        const nodeGroup = root.querySelector(`g.node[data-id="${escapedDataId}"], [data-id="${escapedDataId}"]`);
        if (nodeGroup && nodeGroup !== element) {
          return nodeGroup;
        }
      }
    }
  }
  return element;
};

// src/adapters/diagramTypeDetector.ts
function detectDiagramType(mermaidText) {
  const trimmed = mermaidText.trim();
  const lines = trimmed.split("\n").map((l) => l.trim());
  let firstRelevantLine = 0;
  if (lines[0] === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === "---") {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && lines[nextIdx] === "") {
          nextIdx++;
        }
        firstRelevantLine = nextIdx;
        break;
      }
    }
  }
  const firstLine = (lines[firstRelevantLine] || "").toLowerCase();
  if (firstLine.startsWith("flowchart")) {
    return "flowchart";
  }
  if (firstLine.startsWith("sequenceDiagram") || firstLine.startsWith("sequencediagram")) {
    return "sequenceDiagram";
  }
  if (firstLine.startsWith("classDiagram") || firstLine.startsWith("classdiagram")) {
    return "classDiagram";
  }
  if (firstLine.startsWith("stateDiagram-v2") || firstLine.startsWith("statediagram-v2")) {
    return "stateDiagram-v2";
  }
  if (firstLine.startsWith("stateDiagram") || firstLine.startsWith("statediagram")) {
    return "stateDiagram";
  }
  if (firstLine.startsWith("erDiagram") || firstLine.startsWith("erdiagram")) {
    return "erDiagram";
  }
  if (firstLine.startsWith("gantt")) {
    return "gantt";
  }
  if (firstLine.startsWith("pie")) {
    return "pie";
  }
  if (firstLine.startsWith("journey")) {
    return "journey";
  }
  if (firstLine.startsWith("gitGraph") || firstLine.startsWith("gitgraph")) {
    return "gitGraph";
  }
  if (firstLine.startsWith("timeline")) {
    return "timeline";
  }
  if (firstLine.startsWith("quadrantChart") || firstLine.startsWith("quadrantchart")) {
    return "quadrantChart";
  }
  if (firstLine.startsWith("requirement")) {
    return "requirement";
  }
  if (firstLine.startsWith("C4Context") || firstLine.startsWith("c4context")) {
    return "c4Context";
  }
  if (firstLine.startsWith("C4Container") || firstLine.startsWith("c4container")) {
    return "c4Container";
  }
  if (firstLine.startsWith("C4Component") || firstLine.startsWith("c4component")) {
    return "c4Component";
  }
  if (firstLine.startsWith("block-beta") || firstLine.startsWith("blockBeta") || firstLine.startsWith("blockbeta")) {
    return "block";
  }
  if (firstLine.startsWith("blockDiagram") || firstLine.startsWith("blockdiagram")) {
    return "block";
  }
  if (firstLine.startsWith("mindmap")) {
    return "mindmap";
  }
  if (firstLine.startsWith("kanban")) {
    return "kanban";
  }
  if (firstLine.startsWith("packet")) {
    return "packet";
  }
  if (firstLine.startsWith("radar")) {
    return "radar";
  }
  if (firstLine.startsWith("sankey") || firstLine.startsWith("sankey-beta") || firstLine.startsWith("sankeybeta")) {
    return "sankey";
  }
  if (firstLine.startsWith("treemap") || firstLine.startsWith("treemap-beta") || firstLine.startsWith("treemapbeta")) {
    return "treemap";
  }
  if (firstLine.startsWith("xychart") || firstLine.startsWith("xychart-beta") || firstLine.startsWith("xychartbeta") || firstLine.startsWith("xy")) {
    return "xychart";
  }
  if (firstLine.startsWith("zenuml")) {
    return "zenuml";
  }
  if (trimmed.includes("graph") || trimmed.includes("-->") || trimmed.includes("---")) {
    return "flowchart";
  }
  return "unknown";
}

// src/adapters/diagramStrategyRegistry.ts
var DiagramStrategyRegistry = class {
  constructor() {
    this.strategies = /* @__PURE__ */ new Map();
    this.defaultStrategy = null;
  }
  /**
   * Register a strategy for a specific diagram type
   * @param type - The diagram type
   * @param strategy - The strategy implementation
   */
  register(type, strategy) {
    this.strategies.set(type, strategy);
  }
  /**
   * Get a strategy for a specific diagram type
   * @param type - The diagram type
   * @returns The strategy, or undefined if not found
   */
  get(type) {
    return this.strategies.get(type);
  }
  /**
   * Get a strategy for a specific diagram type, or return the default strategy
   * @param type - The diagram type
   * @returns The strategy, or the default strategy if not found
   */
  getOrDefault(type) {
    const strategy = this.strategies.get(type);
    if (strategy) {
      return strategy;
    }
    if (this.defaultStrategy) {
      return this.defaultStrategy;
    }
    throw new Error(`No strategy found for diagram type: ${type} and no default strategy set`);
  }
  /**
   * Set the default strategy to use when a specific type is not found
   * @param strategy - The default strategy
   */
  setDefault(strategy) {
    this.defaultStrategy = strategy;
  }
  /**
   * Check if a strategy is registered for a diagram type
   * @param type - The diagram type
   * @returns True if a strategy is registered
   */
  has(type) {
    return this.strategies.has(type);
  }
  /**
   * Get all registered diagram types
   * @returns Array of registered diagram types
   */
  getRegisteredTypes() {
    return Array.from(this.strategies.keys());
  }
};
var strategyRegistry = new DiagramStrategyRegistry();

// src/adapters/strategies/ganttStrategy.ts
var GanttStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "gantt";
  }
  getTargetableClasses() {
    return ["task", "milestone", "section"];
  }
  getTargetableTags() {
    return ["g", "rect", "polygon"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^[a-zA-Z0-9-]+-([A-Za-z0-9_]+)-\d+$/,
      // prefix-taskId-digit
      /^gantt-([A-Za-z0-9_]+)-/,
      // gantt-taskId- (partial match)
      /^task-([A-Za-z0-9_]+)/,
      // task-taskId
      /^([A-Za-z0-9_]+)$/
      // Simple ID (e.g., req1, dev1)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (!nodeId) {
        const elClassName = this.getElementClassName(el);
        if (elClassName && (elClassName.includes("task") || elClassName.includes("milestone"))) {
          if (!id.endsWith("-text") && !id.endsWith("-Text")) {
            nodeId = id;
          }
        }
      }
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("task") || className.includes("milestone") || className.includes("section"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        } else if (el.tagName === "rect") {
          const rectClassName = this.getElementClassName(el);
          if (rectClassName && (rectClassName.includes("task") || rectClassName.includes("milestone"))) {
            nodeIdMap.set(nodeId, el);
          }
        } else if (el.tagName === "polygon") {
          const polygonClassName = this.getElementClassName(el);
          if (polygonClassName && polygonClassName.includes("milestone")) {
            nodeIdMap.set(nodeId, el);
          }
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.task[data-id="${escapedId}"]`,
      `g.milestone[data-id="${escapedId}"]`,
      `g[class*="task"][data-id="${escapedId}"]`,
      `g[class*="milestone"][data-id="${escapedId}"]`,
      `g[class*="section"][data-id="${escapedId}"]`,
      `rect.task[data-id="${escapedId}"]`,
      `rect[class*="task"][data-id="${escapedId}"]`,
      `polygon.milestone[data-id="${escapedId}"]`,
      `polygon[class*="milestone"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    const isMilestone = targetClassName && targetClassName.includes("milestone");
    if (isMilestone) {
      const allElements = Array.from(svg.querySelectorAll("[data-id]"));
      return allElements.filter((el) => el !== target && el instanceof SVGGraphicsElement);
    }
    let sectionGroup = null;
    let current = target;
    while (current && current !== svg) {
      if (current.tagName === "g" && current instanceof SVGElement) {
        const svgEl = current;
        const className = this.getElementClassName(svgEl);
        if (className && className.includes("section")) {
          sectionGroup = svgEl;
          break;
        }
      }
      current = current.parentElement;
    }
    if (!sectionGroup) {
      const allTasks = Array.from(svg.querySelectorAll('[data-id], g[class*="task"][data-id], polygon[class*="milestone"][data-id]'));
      return allTasks.filter((task) => task !== target);
    }
    const sectionTasks = Array.from(sectionGroup.querySelectorAll('[data-id], g[class*="task"][data-id], polygon[class*="milestone"][data-id]'));
    return sectionTasks.filter((task) => task !== target);
  }
};

// src/adapters/strategies/sequenceDiagramStrategy.ts
var SequenceDiagramStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "sequenceDiagram";
  }
  getTargetableClasses() {
    return ["participant", "message", "activation", "note"];
  }
  getTargetableTags() {
    return ["g", "rect", "text"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^participant-([A-Za-z0-9_]+)-\d+$/,
      // participant-name-digit
      /^actor-([A-Za-z0-9_]+)-\d+$/,
      // actor-name-digit
      /^message-([A-Za-z0-9_]+)-\d+$/,
      // message-name-digit
      /^activation-([A-Za-z0-9_]+)-\d+$/,
      // activation-name-digit
      /^note-([A-Za-z0-9_]+)-\d+$/,
      // note-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("participant") || className.includes("actor") || className.includes("message") || className.includes("activation") || className.includes("note"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.participant[data-id="${escapedId}"]`,
      `g.actor[data-id="${escapedId}"]`,
      `g.message[data-id="${escapedId}"]`,
      `g.activation[data-id="${escapedId}"]`,
      `g.note[data-id="${escapedId}"]`,
      `line[data-id="${escapedId}"]`,
      `text[data-id="${escapedId}"]`,
      `g[class*="participant"][data-id="${escapedId}"]`,
      `g[class*="actor"][data-id="${escapedId}"]`,
      `g[class*="message"][data-id="${escapedId}"]`,
      `g[class*="activation"][data-id="${escapedId}"]`,
      `g[class*="note"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && (targetClassName.includes("participant") || targetClassName.includes("actor"))) {
      const allMessages = Array.from(svg.querySelectorAll('g[class*="message"][data-id]'));
      const connectedMessages = [];
      for (const message of allMessages) {
        try {
          const targetBbox = target.getBBox();
          const messageBbox = message.getBBox();
          const intersects = messageBbox.x < targetBbox.x + targetBbox.width && messageBbox.x + messageBbox.width > targetBbox.x && messageBbox.y < targetBbox.y + targetBbox.height && messageBbox.y + messageBbox.height > targetBbox.y;
          if (intersects) {
            connectedMessages.push(message);
          }
        } catch {
          continue;
        }
      }
      return connectedMessages;
    }
    if (targetClassName && targetClassName.includes("message")) {
      const allParticipants = Array.from(svg.querySelectorAll('g[class*="participant"][data-id], g[class*="actor"][data-id]'));
      const connectedParticipants = [];
      try {
        const messageBbox = target.getBBox();
        for (const participant of allParticipants) {
          try {
            const participantBbox = participant.getBBox();
            const intersects = messageBbox.x < participantBbox.x + participantBbox.width && messageBbox.x + messageBbox.width > participantBbox.x && messageBbox.y < participantBbox.y + participantBbox.height && messageBbox.y + messageBbox.height > participantBbox.y;
            if (intersects) {
              connectedParticipants.push(participant);
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedParticipants;
    }
    if (targetClassName && targetClassName.includes("activation")) {
      let current = target.parentElement;
      while (current && current !== svg) {
        if (current instanceof SVGGraphicsElement) {
          const className = this.getElementClassName(current);
          if (className && (className.includes("participant") || className.includes("actor"))) {
            return [current];
          }
        }
        current = current.parentElement;
      }
    }
    return [];
  }
};

// src/adapters/strategies/classDiagramStrategy.ts
var ClassDiagramStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "classDiagram";
  }
  getTargetableClasses() {
    return ["class", "classBox", "relation", "edge"];
  }
  getTargetableTags() {
    return ["g", "rect", "path"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^class-([A-Za-z0-9_]+)-\d+$/,
      // class-name-digit
      /^classBox-([A-Za-z0-9_]+)-\d+$/,
      // classBox-name-digit
      /^relation-([A-Za-z0-9_]+)-\d+$/,
      // relation-name-digit
      /^edge-([A-Za-z0-9_]+)-\d+$/,
      // edge-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("class") || className.includes("classBox") || className.includes("relation") || className.includes("edge"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.class[data-id="${escapedId}"]`,
      `g.classBox[data-id="${escapedId}"]`,
      `g.relation[data-id="${escapedId}"]`,
      `g.edge[data-id="${escapedId}"]`,
      `g[class*="class"][data-id="${escapedId}"]`,
      `g[class*="relation"][data-id="${escapedId}"]`,
      `g[class*="edge"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && (targetClassName.includes("class") || targetClassName.includes("classBox"))) {
      const allRelations = Array.from(svg.querySelectorAll('g[class*="relation"][data-id], g[class*="edge"][data-id], path[class*="edge"]'));
      const connectedClasses = [];
      try {
        const targetBbox = target.getBBox();
        for (const relation of allRelations) {
          try {
            const relationBbox = relation.getBBox();
            const intersects = relationBbox.x < targetBbox.x + targetBbox.width && relationBbox.x + relationBbox.width > targetBbox.x && relationBbox.y < targetBbox.y + targetBbox.height && relationBbox.y + relationBbox.height > targetBbox.y;
            if (intersects) {
              const allClasses = Array.from(svg.querySelectorAll('g[class*="class"][data-id], g[class*="classBox"][data-id]'));
              for (const cls of allClasses) {
                if (cls === target)
                  continue;
                if (connectedClasses.includes(cls))
                  continue;
                try {
                  const clsBbox = cls.getBBox();
                  const clsIntersects = relationBbox.x < clsBbox.x + clsBbox.width && relationBbox.x + relationBbox.width > clsBbox.x && relationBbox.y < clsBbox.y + clsBbox.height && relationBbox.y + relationBbox.height > clsBbox.y;
                  if (clsIntersects) {
                    connectedClasses.push(cls);
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedClasses;
    }
    if (targetClassName && (targetClassName.includes("relation") || targetClassName.includes("edge"))) {
      const allClasses = Array.from(svg.querySelectorAll('g[class*="class"][data-id], g[class*="classBox"][data-id]'));
      const connectedClasses = [];
      try {
        const relationBbox = target.getBBox();
        for (const cls of allClasses) {
          try {
            const clsBbox = cls.getBBox();
            const intersects = relationBbox.x < clsBbox.x + clsBbox.width && relationBbox.x + relationBbox.width > clsBbox.x && relationBbox.y < clsBbox.y + clsBbox.height && relationBbox.y + relationBbox.height > clsBbox.y;
            if (intersects) {
              connectedClasses.push(cls);
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedClasses;
    }
    return [];
  }
};

// src/adapters/strategies/stateDiagramStrategy.ts
var StateDiagramStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "stateDiagram";
  }
  getTargetableClasses() {
    return ["state", "stateNode", "transition", "edge"];
  }
  getTargetableTags() {
    return ["g", "rect", "ellipse", "path"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^stateDiagram-([A-Za-z0-9_]+)-\d+$/,
      // stateDiagram-name-digit (Mermaid v10)
      /^state-([A-Za-z0-9_]+)-\d+$/,
      // state-name-digit
      /^stateNode-([A-Za-z0-9_]+)-\d+$/,
      // stateNode-name-digit
      /^node-([A-Za-z0-9_]+)-\d+$/,
      // node-name-digit
      /^stateDiagram-([A-Za-z0-9_]+)$/,
      // stateDiagram-name (without digit)
      /^state-([A-Za-z0-9_]+)$/,
      // state-name (without digit)
      /^([A-Za-z0-9_]+)-\d+$/,
      // name-digit (fallback)
      /^([A-Za-z0-9_]+)$/
      // name only (direct match for simple IDs)
    ];
    const stateGroupsNodes = svg.querySelectorAll('g[class*="state"], g[class*="node"]');
    for (let groupIdx = 0; groupIdx < stateGroupsNodes.length; groupIdx++) {
      const group = stateGroupsNodes[groupIdx];
      const className = this.getElementClassName(group);
      if (!className)
        continue;
      const textNodes = group.querySelectorAll("text");
      for (let textIdx = 0; textIdx < textNodes.length; textIdx++) {
        const textEl = textNodes[textIdx];
        const textContent = textEl.textContent?.trim();
        if (textContent && /^[A-Za-z][A-Za-z0-9_]*$/.test(textContent)) {
          let parentEl = group;
          if (textEl.parentElement && textEl.parentElement instanceof SVGElement) {
            parentEl = textEl.parentElement;
          }
          const parentClasses = this.getElementClassName(parentEl);
          if (parentClasses && !parentClasses.includes("edgeLabel") && !parentClasses.includes("label")) {
            if (!nodeIdMap.has(textContent)) {
              nodeIdMap.set(textContent, group);
            }
          }
        }
      }
    }
    const allIds = [];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      allIds.push(id);
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("state") || className.includes("node") || className.includes("transition") || className.includes("edge"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.state[data-id="${escapedId}"]`,
      `g.stateNode[data-id="${escapedId}"]`,
      `g.node[data-id="${escapedId}"]`,
      `g.transition[data-id="${escapedId}"]`,
      `g.edge[data-id="${escapedId}"]`,
      `g[class*="state"][data-id="${escapedId}"]`,
      `g[class*="node"][data-id="${escapedId}"]`,
      `g[class*="transition"][data-id="${escapedId}"]`,
      `g[class*="edge"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && (targetClassName.includes("state") || targetClassName.includes("stateNode"))) {
      const allTransitions = Array.from(svg.querySelectorAll('g[class*="transition"][data-id], g[class*="edge"][data-id], path[class*="edge"]'));
      const connectedStates = [];
      try {
        const targetBbox = target.getBBox();
        for (const transition of allTransitions) {
          try {
            const transitionBbox = transition.getBBox();
            const intersects = transitionBbox.x < targetBbox.x + targetBbox.width && transitionBbox.x + transitionBbox.width > targetBbox.x && transitionBbox.y < targetBbox.y + targetBbox.height && transitionBbox.y + transitionBbox.height > targetBbox.y;
            if (intersects) {
              const allStates = Array.from(svg.querySelectorAll('g[class*="state"][data-id], g[class*="stateNode"][data-id]'));
              for (const state of allStates) {
                if (state === target)
                  continue;
                if (connectedStates.includes(state))
                  continue;
                try {
                  const stateBbox = state.getBBox();
                  const stateIntersects = transitionBbox.x < stateBbox.x + stateBbox.width && transitionBbox.x + transitionBbox.width > stateBbox.x && transitionBbox.y < stateBbox.y + stateBbox.height && transitionBbox.y + transitionBbox.height > stateBbox.y;
                  if (stateIntersects) {
                    connectedStates.push(state);
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedStates;
    }
    if (targetClassName && (targetClassName.includes("transition") || targetClassName.includes("edge"))) {
      const allStates = Array.from(svg.querySelectorAll('g[class*="state"][data-id], g[class*="stateNode"][data-id]'));
      const connectedStates = [];
      try {
        const transitionBbox = target.getBBox();
        for (const state of allStates) {
          try {
            const stateBbox = state.getBBox();
            const intersects = transitionBbox.x < stateBbox.x + stateBbox.width && transitionBbox.x + transitionBbox.width > stateBbox.x && transitionBbox.y < stateBbox.y + stateBbox.height && transitionBbox.y + transitionBbox.height > stateBbox.y;
            if (intersects) {
              connectedStates.push(state);
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedStates;
    }
    return [];
  }
};

// src/adapters/strategies/erDiagramStrategy.ts
var ERDiagramStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "erDiagram";
  }
  getTargetableClasses() {
    return ["entity", "relationship", "attribute", "edge"];
  }
  getTargetableTags() {
    return ["g", "rect", "path"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^entity-([A-Za-z0-9_]+)-\d+$/,
      // entity-name-digit
      /^relationship-([A-Za-z0-9_]+)-\d+$/,
      // relationship-name-digit
      /^attribute-([A-Za-z0-9_]+)-\d+$/,
      // attribute-name-digit
      /^edge-([A-Za-z0-9_]+)-\d+$/,
      // edge-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("entity") || className.includes("relationship") || className.includes("attribute") || className.includes("edge"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.entity[data-id="${escapedId}"]`,
      `g.relationship[data-id="${escapedId}"]`,
      `g.attribute[data-id="${escapedId}"]`,
      `g.edge[data-id="${escapedId}"]`,
      `g[class*="entity"][data-id="${escapedId}"]`,
      `g[class*="relationship"][data-id="${escapedId}"]`,
      `g[class*="attribute"][data-id="${escapedId}"]`,
      `g[class*="edge"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && targetClassName.includes("entity")) {
      const allRelations = Array.from(svg.querySelectorAll('g[class*="relationship"][data-id], g[class*="edge"][data-id], path[class*="edge"]'));
      const connectedEntities = [];
      try {
        const targetBbox = target.getBBox();
        for (const relation of allRelations) {
          try {
            const relationBbox = relation.getBBox();
            const intersects = relationBbox.x < targetBbox.x + targetBbox.width && relationBbox.x + relationBbox.width > targetBbox.x && relationBbox.y < targetBbox.y + targetBbox.height && relationBbox.y + relationBbox.height > targetBbox.y;
            if (intersects) {
              const allEntities = Array.from(svg.querySelectorAll('g[class*="entity"][data-id]'));
              for (const entity of allEntities) {
                if (entity === target)
                  continue;
                if (connectedEntities.includes(entity))
                  continue;
                try {
                  const entityBbox = entity.getBBox();
                  const entityIntersects = relationBbox.x < entityBbox.x + entityBbox.width && relationBbox.x + relationBbox.width > entityBbox.x && relationBbox.y < entityBbox.y + entityBbox.height && relationBbox.y + relationBbox.height > entityBbox.y;
                  if (entityIntersects) {
                    connectedEntities.push(entity);
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedEntities;
    }
    if (targetClassName && (targetClassName.includes("relationship") || targetClassName.includes("edge"))) {
      const allEntities = Array.from(svg.querySelectorAll('g[class*="entity"][data-id]'));
      const connectedEntities = [];
      try {
        const relationBbox = target.getBBox();
        for (const entity of allEntities) {
          try {
            const entityBbox = entity.getBBox();
            const intersects = relationBbox.x < entityBbox.x + entityBbox.width && relationBbox.x + relationBbox.width > entityBbox.x && relationBbox.y < entityBbox.y + entityBbox.height && relationBbox.y + relationBbox.height > entityBbox.y;
            if (intersects) {
              connectedEntities.push(entity);
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedEntities;
    }
    return [];
  }
};

// src/adapters/strategies/pieChartStrategy.ts
var PieChartStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "pie";
  }
  getTargetableClasses() {
    return ["slice", "pie"];
  }
  getTargetableTags() {
    return ["g", "path", "text"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^slice-([A-Za-z0-9_]+)-\d+$/,
      // slice-name-digit
      /^pie-([A-Za-z0-9_]+)-\d+$/,
      // pie-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("slice") || className.includes("pie"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        } else if (el.tagName === "path" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.slice[data-id="${escapedId}"]`,
      `g.pie[data-id="${escapedId}"]`,
      `path.slice[data-id="${escapedId}"]`,
      `path.pie[data-id="${escapedId}"]`,
      `g[class*="slice"][data-id="${escapedId}"]`,
      `g[class*="pie"][data-id="${escapedId}"]`,
      `path[class*="slice"][data-id="${escapedId}"]`,
      `path[class*="pie"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(_target, _svg) {
    return [];
  }
};

// src/adapters/strategies/journeyStrategy.ts
var JourneyStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "journey";
  }
  getTargetableClasses() {
    return ["step", "task", "section"];
  }
  getTargetableTags() {
    return ["g", "rect", "text"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^step-([A-Za-z0-9_]+)-\d+$/,
      // step-name-digit
      /^task-([A-Za-z0-9_]+)-\d+$/,
      // task-name-digit
      /^section-([A-Za-z0-9_]+)-\d+$/,
      // section-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("step") || className.includes("task") || className.includes("section"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.step[data-id="${escapedId}"]`,
      `g.task[data-id="${escapedId}"]`,
      `g.section[data-id="${escapedId}"]`,
      `g[class*="step"][data-id="${escapedId}"]`,
      `g[class*="task"][data-id="${escapedId}"]`,
      `g[class*="section"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const allSteps = Array.from(svg.querySelectorAll('g[class*="step"][data-id], g[class*="task"][data-id]'));
    const targetIndex = allSteps.indexOf(target);
    if (targetIndex === -1)
      return [];
    const adjacentSteps = [];
    if (targetIndex > 0) {
      adjacentSteps.push(allSteps[targetIndex - 1]);
    }
    if (targetIndex < allSteps.length - 1) {
      adjacentSteps.push(allSteps[targetIndex + 1]);
    }
    return adjacentSteps;
  }
};

// src/adapters/strategies/gitGraphStrategy.ts
var GitGraphStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "gitGraph";
  }
  getTargetableClasses() {
    return ["commit", "branch", "merge"];
  }
  getTargetableTags() {
    return ["g", "circle", "path", "text"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^commit-([A-Za-z0-9_]+)-\d+$/,
      // commit-name-digit
      /^branch-([A-Za-z0-9_]+)-\d+$/,
      // branch-name-digit
      /^merge-([A-Za-z0-9_]+)-\d+$/,
      // merge-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("commit") || className.includes("branch") || className.includes("merge"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        } else if (el.tagName === "circle" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.commit[data-id="${escapedId}"]`,
      `g.branch[data-id="${escapedId}"]`,
      `g.merge[data-id="${escapedId}"]`,
      `circle.commit[data-id="${escapedId}"]`,
      `circle.branch[data-id="${escapedId}"]`,
      `g[class*="commit"][data-id="${escapedId}"]`,
      `g[class*="branch"][data-id="${escapedId}"]`,
      `g[class*="merge"][data-id="${escapedId}"]`,
      `circle[class*="commit"][data-id="${escapedId}"]`,
      `circle[class*="branch"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && targetClassName.includes("commit")) {
      const allBranches = Array.from(svg.querySelectorAll('g[class*="branch"][data-id], path[class*="branch"], path[class*="edge"]'));
      const connectedCommits = [];
      try {
        const targetBbox = target.getBBox();
        for (const branch of allBranches) {
          try {
            const branchBbox = branch.getBBox();
            const intersects = branchBbox.x < targetBbox.x + targetBbox.width && branchBbox.x + branchBbox.width > targetBbox.x && branchBbox.y < targetBbox.y + targetBbox.height && branchBbox.y + branchBbox.height > targetBbox.y;
            if (intersects) {
              const allCommits = Array.from(svg.querySelectorAll('g[class*="commit"][data-id], circle[class*="commit"][data-id]'));
              for (const commit of allCommits) {
                if (commit === target)
                  continue;
                if (connectedCommits.includes(commit))
                  continue;
                try {
                  const commitBbox = commit.getBBox();
                  const commitIntersects = branchBbox.x < commitBbox.x + commitBbox.width && branchBbox.x + commitBbox.width > commitBbox.x && branchBbox.y < commitBbox.y + commitBbox.height && branchBbox.y + commitBbox.height > commitBbox.y;
                  if (commitIntersects) {
                    connectedCommits.push(commit);
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedCommits;
    }
    if (targetClassName && targetClassName.includes("branch")) {
      const allCommits = Array.from(svg.querySelectorAll('g[class*="commit"][data-id], circle[class*="commit"][data-id]'));
      const connectedCommits = [];
      try {
        const branchBbox = target.getBBox();
        for (const commit of allCommits) {
          try {
            const commitBbox = commit.getBBox();
            const intersects = branchBbox.x < commitBbox.x + commitBbox.width && branchBbox.x + branchBbox.width > commitBbox.x && branchBbox.y < commitBbox.y + commitBbox.height && branchBbox.y + commitBbox.height > commitBbox.y;
            if (intersects) {
              connectedCommits.push(commit);
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedCommits;
    }
    return [];
  }
};

// src/adapters/strategies/timelineStrategy.ts
var TimelineStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "timeline";
  }
  getTargetableClasses() {
    return ["section", "event", "timeline"];
  }
  getTargetableTags() {
    return ["g", "rect", "text"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^section-([A-Za-z0-9_]+)-\d+$/,
      // section-name-digit
      /^event-([A-Za-z0-9_]+)-\d+$/,
      // event-name-digit
      /^timeline-([A-Za-z0-9_]+)-\d+$/,
      // timeline-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("section") || className.includes("event") || className.includes("timeline"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.section[data-id="${escapedId}"]`,
      `g.event[data-id="${escapedId}"]`,
      `g.timeline[data-id="${escapedId}"]`,
      `g[class*="section"][data-id="${escapedId}"]`,
      `g[class*="event"][data-id="${escapedId}"]`,
      `g[class*="timeline"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && targetClassName.includes("section")) {
      const sectionEvents = Array.from(target.querySelectorAll('g[class*="event"][data-id]'));
      return sectionEvents;
    }
    if (targetClassName && targetClassName.includes("event")) {
      let section = target.parentElement;
      while (section && section !== svg) {
        const className = this.getElementClassName(section);
        if (className && className.includes("section")) {
          const sectionEvents = Array.from(section.querySelectorAll('g[class*="event"][data-id]'));
          return sectionEvents.filter((e) => e !== target);
        }
        section = section.parentElement;
      }
      const allEvents = Array.from(svg.querySelectorAll('g[class*="event"][data-id]'));
      return allEvents.filter((e) => e !== target);
    }
    return [];
  }
};

// src/adapters/strategies/quadrantChartStrategy.ts
var QuadrantChartStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "quadrantChart";
  }
  getTargetableClasses() {
    return ["quadrant", "point", "data"];
  }
  getTargetableTags() {
    return ["g", "circle", "rect", "text"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^quadrant-([A-Za-z0-9_]+)-\d+$/,
      // quadrant-name-digit
      /^point-([A-Za-z0-9_]+)-\d+$/,
      // point-name-digit
      /^data-([A-Za-z0-9_]+)-\d+$/,
      // data-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("quadrant") || className.includes("point") || className.includes("data"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        } else if (el.tagName === "circle" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.quadrant[data-id="${escapedId}"]`,
      `g.point[data-id="${escapedId}"]`,
      `g.data[data-id="${escapedId}"]`,
      `circle.quadrant[data-id="${escapedId}"]`,
      `circle.point[data-id="${escapedId}"]`,
      `circle.data[data-id="${escapedId}"]`,
      `g[class*="quadrant"][data-id="${escapedId}"]`,
      `g[class*="point"][data-id="${escapedId}"]`,
      `g[class*="data"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && (targetClassName.includes("point") || targetClassName.includes("data"))) {
      try {
        const targetBbox = target.getBBox();
        const targetCenterX = targetBbox.x + targetBbox.width / 2;
        const targetCenterY = targetBbox.y + targetBbox.height / 2;
        const allQuadrants = Array.from(svg.querySelectorAll('g[class*="quadrant"]'));
        for (const quadrant of allQuadrants) {
          try {
            const quadrantBbox = quadrant.getBBox();
            if (targetCenterX >= quadrantBbox.x && targetCenterX <= quadrantBbox.x + quadrantBbox.width && targetCenterY >= quadrantBbox.y && targetCenterY <= quadrantBbox.y + quadrantBbox.height) {
              const quadrantPoints = Array.from(quadrant.querySelectorAll('g[class*="point"][data-id], circle[class*="point"][data-id], g[class*="data"][data-id], circle[class*="data"][data-id]'));
              return quadrantPoints.filter((p) => p !== target);
            }
          } catch {
            continue;
          }
        }
      } catch {
        const allPoints = Array.from(svg.querySelectorAll('g[class*="point"][data-id], circle[class*="point"][data-id], g[class*="data"][data-id], circle[class*="data"][data-id]'));
        return allPoints.filter((p) => p !== target);
      }
    }
    if (targetClassName && targetClassName.includes("quadrant")) {
      const quadrantPoints = Array.from(target.querySelectorAll('g[class*="point"][data-id], circle[class*="point"][data-id], g[class*="data"][data-id], circle[class*="data"][data-id]'));
      return quadrantPoints;
    }
    return [];
  }
};

// src/adapters/strategies/requirementStrategy.ts
var RequirementStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "requirement";
  }
  getTargetableClasses() {
    return ["requirement", "function", "relationship"];
  }
  getTargetableTags() {
    return ["g", "rect", "path"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const nodeGroups = Array.from(svg.querySelectorAll("g.node[id]"));
    for (const nodeGroup of nodeGroups) {
      const id = nodeGroup.getAttribute("id");
      if (id && id.trim()) {
        nodeIdMap.set(id, nodeGroup);
      }
    }
    const relationshipPaths = Array.from(svg.querySelectorAll("path[data-id].relationshipLine"));
    for (const path of relationshipPaths) {
      const dataId = path.getAttribute("data-id");
      if (dataId && dataId.trim()) {
        nodeIdMap.set(dataId, path);
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      // Try to find node group by id attribute (most common for req1, req2, func1)
      `g.node[id="${escapedId}"]`,
      // Try to find by data-id on label or relationship
      `[data-id="${escapedId}"]`,
      // Fallback: try parent of element with data-id
      `g:has([data-id="${escapedId}"])`
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && (targetClassName.includes("requirement") || targetClassName.includes("function"))) {
      const allRelations = Array.from(svg.querySelectorAll('g[class*="relationship"][data-id], path[class*="relationship"]'));
      const connectedElements = [];
      try {
        const targetBbox = target.getBBox();
        for (const relation of allRelations) {
          try {
            const relationBbox = relation.getBBox();
            const intersects = relationBbox.x < targetBbox.x + targetBbox.width && relationBbox.x + relationBbox.width > targetBbox.x && relationBbox.y < targetBbox.y + targetBbox.height && relationBbox.y + relationBbox.height > targetBbox.y;
            if (intersects) {
              const allElements = Array.from(svg.querySelectorAll('g[class*="requirement"][data-id], g[class*="function"][data-id]'));
              for (const elem of allElements) {
                if (elem === target)
                  continue;
                if (connectedElements.includes(elem))
                  continue;
                try {
                  const elemBbox = elem.getBBox();
                  const elemIntersects = relationBbox.x < elemBbox.x + elemBbox.width && relationBbox.x + relationBbox.width > elemBbox.x && relationBbox.y < elemBbox.y + elemBbox.height && relationBbox.y + relationBbox.height > elemBbox.y;
                  if (elemIntersects) {
                    connectedElements.push(elem);
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedElements;
    }
    return [];
  }
};

// src/adapters/strategies/c4Strategy.ts
var C4Strategy = class extends BaseDiagramStrategy {
  constructor(diagramType) {
    super();
    this.diagramType = diagramType;
  }
  getDiagramType() {
    return this.diagramType;
  }
  getTargetableClasses() {
    return ["c4", "element", "relationship", "boundary"];
  }
  getTargetableTags() {
    return ["g", "rect", "path", "text"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^c4-([A-Za-z0-9_]+)-\d+$/,
      // c4-name-digit
      /^element-([A-Za-z0-9_]+)-\d+$/,
      // element-name-digit
      /^relationship-([A-Za-z0-9_]+)-\d+$/,
      // relationship-name-digit
      /^boundary-([A-Za-z0-9_]+)-\d+$/,
      // boundary-name-digit
      /^([A-Za-z0-9_]+)-\d+$/,
      // name-digit (fallback)
      /^([A-Za-z0-9_]+)$/
      // name only (direct match)
    ];
    const allIds = [];
    const allIdElements = Array.from(svg.querySelectorAll("[id]"));
    for (const el of allIdElements) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      allIds.push(id);
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("c4") || className.includes("element") || className.includes("relationship") || className.includes("boundary"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.c4[data-id="${escapedId}"]`,
      `g.element[data-id="${escapedId}"]`,
      `g.relationship[data-id="${escapedId}"]`,
      `g.boundary[data-id="${escapedId}"]`,
      `g[class*="c4"][data-id="${escapedId}"]`,
      `g[class*="element"][data-id="${escapedId}"]`,
      `g[class*="relationship"][data-id="${escapedId}"]`,
      `g[class*="boundary"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && (targetClassName.includes("c4") || targetClassName.includes("element"))) {
      const allRelations = Array.from(svg.querySelectorAll('g[class*="relationship"][data-id], path[class*="relationship"]'));
      const connectedElements = [];
      try {
        const targetBbox = target.getBBox();
        for (const relation of allRelations) {
          try {
            const relationBbox = relation.getBBox();
            const intersects = relationBbox.x < targetBbox.x + targetBbox.width && relationBbox.x + relationBbox.width > targetBbox.x && relationBbox.y < targetBbox.y + targetBbox.height && relationBbox.y + relationBbox.height > targetBbox.y;
            if (intersects) {
              const allElements = Array.from(svg.querySelectorAll('g[class*="c4"][data-id], g[class*="element"][data-id]'));
              for (const elem of allElements) {
                if (elem === target)
                  continue;
                if (connectedElements.includes(elem))
                  continue;
                try {
                  const elemBbox = elem.getBBox();
                  const elemIntersects = relationBbox.x < elemBbox.x + elemBbox.width && relationBbox.x + relationBbox.width > elemBbox.x && relationBbox.y < elemBbox.y + elemBbox.height && relationBbox.y + relationBbox.height > elemBbox.y;
                  if (elemIntersects) {
                    connectedElements.push(elem);
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedElements;
    }
    if (targetClassName && targetClassName.includes("relationship")) {
      const allElements = Array.from(svg.querySelectorAll('g[class*="c4"][data-id], g[class*="element"][data-id]'));
      const connectedElements = [];
      try {
        const relationBbox = target.getBBox();
        for (const elem of allElements) {
          try {
            const elemBbox = elem.getBBox();
            const intersects = relationBbox.x < elemBbox.x + elemBbox.width && relationBbox.x + relationBbox.width > elemBbox.x && relationBbox.y < elemBbox.y + elemBbox.height && relationBbox.y + relationBbox.height > elemBbox.y;
            if (intersects) {
              connectedElements.push(elem);
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedElements;
    }
    return [];
  }
};

// src/adapters/strategies/blockDiagramStrategy.ts
var BlockDiagramStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "block";
  }
  getTargetableClasses() {
    return ["block", "node", "edge"];
  }
  getTargetableTags() {
    return ["g", "rect", "path"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const patterns = [
      /^block-([A-Za-z0-9_]+)-\d+$/,
      // block-name-digit
      /^node-([A-Za-z0-9_]+)-\d+$/,
      // node-name-digit
      /^edge-([A-Za-z0-9_]+)-\d+$/,
      // edge-name-digit
      /^([A-Za-z0-9_]+)-\d+$/
      // name-digit (fallback)
    ];
    for (const el of Array.from(svg.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (!id)
        continue;
      let nodeId = this.extractIdFromPatterns(id, patterns);
      if (nodeId && !nodeIdMap.has(nodeId)) {
        let current = el;
        let nodeGroup = null;
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes("block") || className.includes("node") || className.includes("edge"))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.block[data-id="${escapedId}"]`,
      `g.node[data-id="${escapedId}"]`,
      `g.edge[data-id="${escapedId}"]`,
      `g[class*="block"][data-id="${escapedId}"]`,
      `g[class*="node"][data-id="${escapedId}"]`,
      `g[class*="edge"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`
      // Fallback
    ];
  }
  findAdjacentElements(target, svg) {
    const targetDataId = target.getAttribute("data-id");
    if (!targetDataId)
      return [];
    const targetClassName = this.getElementClassName(target);
    if (targetClassName && (targetClassName.includes("block") || targetClassName.includes("node"))) {
      const allEdges = Array.from(svg.querySelectorAll('path.edge, path[class*="edge"], g.edge path, path[id*="edge"]'));
      const connectedBlocks = [];
      try {
        const targetBbox = target.getBBox();
        const targetCenterX = targetBbox.x + targetBbox.width / 2;
        const targetCenterY = targetBbox.y + targetBbox.height / 2;
        for (const edgePath of allEdges) {
          try {
            const edgeBbox = edgePath.getBBox();
            const edgeCenterX = edgeBbox.x + edgeBbox.width / 2;
            const edgeCenterY = edgeBbox.y + edgeBbox.height / 2;
            const threshold = Math.max(targetBbox.width, targetBbox.height) * 1.5;
            const distanceToCenter = Math.sqrt(
              Math.pow(edgeCenterX - targetCenterX, 2) + Math.pow(edgeCenterY - targetCenterY, 2)
            );
            const edgeIntersectsTarget = edgeBbox.x < targetBbox.x + targetBbox.width && edgeBbox.x + edgeBbox.width > targetBbox.x && edgeBbox.y < targetBbox.y + targetBbox.height && edgeBbox.y + edgeBbox.height > targetBbox.y;
            if (edgeIntersectsTarget || distanceToCenter < threshold) {
              const allBlocks = Array.from(svg.querySelectorAll("g.block[data-id], g.node[data-id]"));
              for (const block of allBlocks) {
                if (block === target)
                  continue;
                if (connectedBlocks.includes(block))
                  continue;
                try {
                  const blockBbox = block.getBBox();
                  const blockCenterX = blockBbox.x + blockBbox.width / 2;
                  const blockCenterY = blockBbox.y + blockBbox.height / 2;
                  const blockDistanceToEdge = Math.sqrt(
                    Math.pow(blockCenterX - edgeCenterX, 2) + Math.pow(blockCenterY - edgeCenterY, 2)
                  );
                  const blockIntersectsEdge = edgeBbox.x < blockBbox.x + blockBbox.width && edgeBbox.x + edgeBbox.width > blockBbox.x && edgeBbox.y < blockBbox.y + blockBbox.height && edgeBbox.y + edgeBbox.height > blockBbox.y;
                  if (blockIntersectsEdge || blockDistanceToEdge < threshold) {
                    connectedBlocks.push(block);
                  }
                } catch {
                  continue;
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      return connectedBlocks;
    }
    return [];
  }
};

// src/adapters/strategies/labelBasedStrategy.ts
var isNumericLabel = (label) => /^-?\d+(\.\d+)?$/.test(label);
var normalizeDataId = (raw) => {
  const trimmed = raw.trim();
  if (!trimmed)
    return "";
  const normalized = trimmed.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
  return normalized || "";
};
var LabelBasedStrategy = class extends BaseDiagramStrategy {
  constructor(diagramType, options = {}) {
    super();
    this.diagramType = diagramType;
    this.options = options;
  }
  getDiagramType() {
    return this.diagramType;
  }
  extractNodeIds(svg) {
    const map = /* @__PURE__ */ new Map();
    const seenCounts = /* @__PURE__ */ new Map();
    const maxTargets = this.options.maxTargets;
    const texts = Array.from(svg.querySelectorAll("text"));
    for (const textEl of texts) {
      const label = (textEl.textContent ?? "").trim();
      if (!label)
        continue;
      if (this.options.skipNumericLabels && isNumericLabel(label))
        continue;
      let dataId = normalizeDataId(label);
      if (!dataId)
        continue;
      const target = this.findTargetGroupForText(textEl, svg);
      if (!target)
        continue;
      const base = dataId;
      const currentCount = (seenCounts.get(base) ?? 0) + 1;
      seenCounts.set(base, currentCount);
      if (currentCount > 1) {
        dataId = `${base}_${currentCount}`;
      }
      if (!map.has(dataId)) {
        map.set(dataId, target);
      }
      if (typeof maxTargets === "number" && map.size >= maxTargets) {
        break;
      }
    }
    return map;
  }
  getTargetSelectors(dataId) {
    const escaped = this.escapeSelector(dataId);
    return [
      `g[data-id="${escaped}"]`,
      `.node[data-id="${escaped}"]`,
      `.participant[data-id="${escaped}"]`,
      `.message[data-id="${escaped}"]`,
      `[data-id="${escaped}"]`
    ];
  }
  findAdjacentElements(_target, _svg) {
    return [];
  }
  getTargetableClasses() {
    return ["node", "label", "item", "task", "bar", "slice"];
  }
  getTargetableTags() {
    return ["g", "rect", "circle", "ellipse", "polygon", "path", "text"];
  }
  findTargetGroupForText(textEl, svg) {
    let current = textEl;
    while (current && current !== svg) {
      let parent = current.parentElement;
      if (!parent || parent === svg)
        break;
      if (parent.tagName.toLowerCase() === "g") {
        const svgEl = parent;
        const className = typeof svgEl.className === "string" ? svgEl.className : svgEl.className.baseVal;
        const hasShapes = !!parent.querySelector("rect,circle,ellipse,polygon,path");
        if (hasShapes || className.includes("node")) {
          return svgEl;
        }
      }
      current = parent;
    }
    current = textEl;
    while (current && current !== svg) {
      let parent = current.parentElement;
      if (!parent || parent === svg)
        break;
      const tag = parent.tagName.toLowerCase();
      const isGraphicsTag = tag === "g" || tag === "rect" || tag === "circle" || tag === "ellipse" || tag === "polygon" || tag === "path";
      if (isGraphicsTag) {
        return parent;
      }
      current = parent;
    }
    return null;
  }
};

// src/adapters/strategies/mindmapStrategy.ts
var MindmapStrategy = class extends LabelBasedStrategy {
  constructor() {
    super("mindmap", { skipNumericLabels: true, maxTargets: 200 });
  }
};

// src/adapters/strategies/xyChartStrategy.ts
var XYChartStrategy = class extends LabelBasedStrategy {
  constructor() {
    super("xychart", { skipNumericLabels: true, maxTargets: 200 });
  }
};

// src/adapters/strategies/kanbanStrategy.ts
var KanbanStrategy = class extends LabelBasedStrategy {
  constructor() {
    super("kanban", { skipNumericLabels: true, maxTargets: 300 });
  }
};

// src/adapters/strategies/packetStrategy.ts
var PacketStrategy = class extends BaseDiagramStrategy {
  getDiagramType() {
    return "packet";
  }
  getTargetableClasses() {
    return ["packetBlock", "packet"];
  }
  getTargetableTags() {
    return ["g", "rect", "text"];
  }
  extractNodeIds(svg) {
    const nodeIdMap = /* @__PURE__ */ new Map();
    const seenLabels = /* @__PURE__ */ new Map();
    const textElements = Array.from(svg.querySelectorAll("text"));
    for (const textEl of textElements) {
      const label = textEl.textContent?.trim();
      if (!label)
        continue;
      if (/^\d+$/.test(label))
        continue;
      let dataId = label.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
      if (!dataId)
        continue;
      const baseId = dataId;
      const count = (seenLabels.get(baseId) ?? 0) + 1;
      seenLabels.set(baseId, count);
      if (count > 1) {
        dataId = `${baseId}_${count}`;
      }
      let target = null;
      const parent = textEl.parentElement;
      if (parent) {
        const rect = parent.querySelector("rect");
        if (rect) {
          target = parent;
        } else if (parent.tagName.toLowerCase() === "g") {
          target = parent;
        }
      }
      if (!target && textEl.parentElement) {
        target = textEl.parentElement;
      }
      if (target && !nodeIdMap.has(dataId)) {
        nodeIdMap.set(dataId, target);
      }
    }
    return nodeIdMap;
  }
  getTargetSelectors(dataId) {
    const escaped = dataId.replace(/"/g, '\\"');
    return [
      `g[data-id="${escaped}"]`,
      `[data-id="${escaped}"]`
    ];
  }
  findAdjacentElements(_target, _svg) {
    return [];
  }
};

// src/adapters/strategies/radarStrategy.ts
var RadarStrategy = class extends LabelBasedStrategy {
  constructor() {
    super("radar", { skipNumericLabels: true, maxTargets: 300 });
  }
};

// src/adapters/strategies/sankeyStrategy.ts
var SankeyStrategy = class extends LabelBasedStrategy {
  constructor() {
    super("sankey", { skipNumericLabels: true, maxTargets: 300 });
  }
};

// src/adapters/strategies/treemapStrategy.ts
var TreemapStrategy = class extends LabelBasedStrategy {
  constructor() {
    super("treemap", { skipNumericLabels: true, maxTargets: 300 });
  }
};

// src/adapters/strategies/zenumlStrategy.ts
var ZenUMLStrategy = class extends LabelBasedStrategy {
  constructor() {
    super("zenuml", { skipNumericLabels: true, maxTargets: 300 });
  }
  extractNodeIds(svg) {
    const map = /* @__PURE__ */ new Map();
    const foreignObjects = Array.from(svg.querySelectorAll("foreignObject"));
    for (const fo of foreignObjects) {
      const labels = Array.from(fo.querySelectorAll(".participant, .message, .alias, .group"));
      for (const labelEl of labels) {
        let text = (labelEl.textContent ?? "").trim();
        if (!text || text.length > 100)
          continue;
        const cleanText = text.replace(/[«»<>]/g, "").trim();
        const dataIds = /* @__PURE__ */ new Set();
        dataIds.add(text.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, ""));
        dataIds.add(cleanText.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, ""));
        for (const dataId of dataIds) {
          if (!dataId || map.has(dataId))
            continue;
          map.set(dataId, labelEl);
        }
      }
    }
    if (map.size === 0) {
      return super.extractNodeIds(svg);
    }
    return map;
  }
};

// src/adapters/mermaidDiagram.ts
strategyRegistry.register("flowchart", new FlowchartStrategy());
strategyRegistry.register("gantt", new GanttStrategy());
strategyRegistry.register("sequenceDiagram", new SequenceDiagramStrategy());
strategyRegistry.register("classDiagram", new ClassDiagramStrategy());
strategyRegistry.register("stateDiagram", new StateDiagramStrategy());
strategyRegistry.register("stateDiagram-v2", new StateDiagramStrategy());
strategyRegistry.register("erDiagram", new ERDiagramStrategy());
strategyRegistry.register("pie", new PieChartStrategy());
strategyRegistry.register("journey", new JourneyStrategy());
strategyRegistry.register("gitGraph", new GitGraphStrategy());
strategyRegistry.register("timeline", new TimelineStrategy());
strategyRegistry.register("quadrantChart", new QuadrantChartStrategy());
strategyRegistry.register("requirement", new RequirementStrategy());
strategyRegistry.register("c4Context", new C4Strategy("c4Context"));
strategyRegistry.register("c4Container", new C4Strategy("c4Container"));
strategyRegistry.register("c4Component", new C4Strategy("c4Component"));
strategyRegistry.register("block", new BlockDiagramStrategy());
strategyRegistry.register("mindmap", new MindmapStrategy());
strategyRegistry.register("xychart", new XYChartStrategy());
strategyRegistry.register("kanban", new KanbanStrategy());
strategyRegistry.register("packet", new PacketStrategy());
strategyRegistry.register("radar", new RadarStrategy());
strategyRegistry.register("sankey", new SankeyStrategy());
strategyRegistry.register("treemap", new TreemapStrategy());
strategyRegistry.register("zenuml", new ZenUMLStrategy());
strategyRegistry.setDefault(new FlowchartStrategy());
function ensureDataIdFromMermaidIds(svg, strategy, mermaidText) {
  let nodeIdMap = strategy.extractNodeIds(svg);
  const diagramType = strategy.getDiagramType();
  const aliases = mermaidText ? extractC4AliasesFromText(mermaidText) : /* @__PURE__ */ new Set();
  let classAliases = /* @__PURE__ */ new Set();
  if (diagramType === "classDiagram" && mermaidText) {
    const classPattern = /class\s+([A-Za-z0-9_]+)\s*[<{]/g;
    let classMatch;
    while ((classMatch = classPattern.exec(mermaidText)) !== null) {
      classAliases.add(classMatch[1]);
    }
    const classSimplePattern = /class\s+([A-Za-z0-9_]+)(?:\s|$)/g;
    classSimplePattern.lastIndex = 0;
    while ((classMatch = classSimplePattern.exec(mermaidText)) !== null) {
      classAliases.add(classMatch[1]);
    }
  }
  let erAliases = /* @__PURE__ */ new Set();
  if (diagramType === "erDiagram" && mermaidText) {
    const erPattern = /([A-Z][A-Z0-9_]+)\s*\{/g;
    let erMatch;
    while ((erMatch = erPattern.exec(mermaidText)) !== null) {
      erAliases.add(erMatch[1]);
    }
    const relPattern = /([A-Z][A-Z0-9_]+)\s*[|o]+--[|o]+/g;
    relPattern.lastIndex = 0;
    while ((erMatch = relPattern.exec(mermaidText)) !== null) {
      erAliases.add(erMatch[1]);
    }
    const relPattern2 = /[|o]+--[|o]+\s*([A-Z][A-Z0-9_]+)/g;
    relPattern2.lastIndex = 0;
    while ((erMatch = relPattern2.exec(mermaidText)) !== null) {
      erAliases.add(erMatch[1]);
    }
  }
  let gitAliases = /* @__PURE__ */ new Set();
  if (diagramType === "gitGraph" && mermaidText) {
    const branchPattern = /branch\s+([A-Za-z0-9_]+)/g;
    let branchMatch;
    while ((branchMatch = branchPattern.exec(mermaidText)) !== null) {
      gitAliases.add(branchMatch[1]);
    }
    const checkoutPattern = /checkout\s+([A-Za-z0-9_]+)/g;
    checkoutPattern.lastIndex = 0;
    while ((branchMatch = checkoutPattern.exec(mermaidText)) !== null) {
      gitAliases.add(branchMatch[1]);
    }
    const commitPattern = /commit\s+id:\s*"([^"]+)"/g;
    commitPattern.lastIndex = 0;
    while ((branchMatch = commitPattern.exec(mermaidText)) !== null) {
      gitAliases.add(branchMatch[1]);
    }
    const mergePattern = /merge\s+([A-Za-z0-9_]+)/g;
    mergePattern.lastIndex = 0;
    while ((branchMatch = mergePattern.exec(mermaidText)) !== null) {
      gitAliases.add(branchMatch[1]);
    }
    gitAliases.add("merge");
  }
  let journeyAliases = /* @__PURE__ */ new Set();
  if (diagramType === "journey" && mermaidText) {
    const lines = mermaidText.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith("title") || line.trim().startsWith("section")) {
        continue;
      }
      const stepMatch = line.match(/^\s+([^:]+):\s*\d+:/);
      if (stepMatch && stepMatch[1]) {
        const stepName = stepMatch[1].trim();
        if (stepName && !stepName.includes("\n")) {
          journeyAliases.add(stepName);
        }
      }
    }
  }
  let pieAliases = /* @__PURE__ */ new Set();
  if (diagramType === "pie" && mermaidText) {
    const slicePattern = /"([^"]+)"\s*:\s*\d+\.?\d*/g;
    let sliceMatch;
    slicePattern.lastIndex = 0;
    while ((sliceMatch = slicePattern.exec(mermaidText)) !== null) {
      const sliceName = sliceMatch[1].trim();
      if (sliceName) {
        pieAliases.add(sliceName);
      }
    }
  }
  let quadrantAliases = /* @__PURE__ */ new Set();
  if (diagramType === "quadrantChart" && mermaidText) {
    const itemPattern = /"?([^":\n]+)"?\s*:\s*\[?[\d.]+\s*,\s*[\d.]+\]?/g;
    let itemMatch;
    itemPattern.lastIndex = 0;
    while ((itemMatch = itemPattern.exec(mermaidText)) !== null) {
      const itemName = itemMatch[1].trim();
      if (itemName) {
        quadrantAliases.add(itemName);
      }
    }
  }
  let requirementAliases = /* @__PURE__ */ new Set();
  if (diagramType === "requirement" && mermaidText) {
    const requirementPattern = /requirement\s+([A-Za-z0-9_]+)\s*\{/g;
    let requirementMatch;
    requirementPattern.lastIndex = 0;
    while ((requirementMatch = requirementPattern.exec(mermaidText)) !== null) {
      const reqName = requirementMatch[1].trim();
      if (reqName) {
        requirementAliases.add(reqName);
      }
    }
    const elementPattern = /element\s+([A-Za-z0-9_]+)\s*\{/g;
    let elementMatch;
    elementPattern.lastIndex = 0;
    while ((elementMatch = elementPattern.exec(mermaidText)) !== null) {
      const elemName = elementMatch[1].trim();
      if (elemName) {
        requirementAliases.add(elemName);
      }
    }
  }
  let sequenceAliases = /* @__PURE__ */ new Set();
  if (diagramType === "sequenceDiagram" && mermaidText) {
    const participantPattern = /(?:participant|actor)\s+([A-Za-z0-9_]+)/g;
    let participantMatch;
    participantPattern.lastIndex = 0;
    while ((participantMatch = participantPattern.exec(mermaidText)) !== null) {
      const partName = participantMatch[1].trim();
      if (partName) {
        sequenceAliases.add(partName);
      }
    }
    const messagePattern = /(?:->>|->|-->>|-->)\s*[A-Za-z0-9_]+\s*:\s*([^\n]+)/g;
    let messageMatch;
    messagePattern.lastIndex = 0;
    while ((messageMatch = messagePattern.exec(mermaidText)) !== null) {
      const messageLabel = messageMatch[1].trim();
      if (messageLabel) {
        sequenceAliases.add(messageLabel);
      }
    }
  }
  let timelineAliases = /* @__PURE__ */ new Set();
  if (diagramType === "timeline" && mermaidText) {
    const sectionPattern = /section\s+([^\n]+)/g;
    let sectionMatch;
    sectionPattern.lastIndex = 0;
    while ((sectionMatch = sectionPattern.exec(mermaidText)) !== null) {
      const sectionName = sectionMatch[1].trim();
      if (sectionName) {
        timelineAliases.add(sectionName);
      }
    }
  }
  const shouldUseFallback = mermaidText && ((diagramType === "c4Component" || diagramType === "c4Container" || diagramType === "c4Context") && (nodeIdMap.size === 0 || nodeIdMap.size < aliases.size) || diagramType === "classDiagram" && (nodeIdMap.size === 0 || nodeIdMap.size < classAliases.size) || diagramType === "erDiagram" && (nodeIdMap.size === 0 || nodeIdMap.size < erAliases.size) || diagramType === "gitGraph" && (nodeIdMap.size === 0 || nodeIdMap.size < gitAliases.size) || diagramType === "journey" && (nodeIdMap.size === 0 || nodeIdMap.size < journeyAliases.size) || diagramType === "pie" && (nodeIdMap.size === 0 || nodeIdMap.size < pieAliases.size) || diagramType === "quadrantChart" && (nodeIdMap.size === 0 || nodeIdMap.size < quadrantAliases.size) || diagramType === "requirement" && (nodeIdMap.size === 0 || nodeIdMap.size < requirementAliases.size) || diagramType === "sequenceDiagram" && (nodeIdMap.size === 0 || nodeIdMap.size < sequenceAliases.size) || diagramType === "timeline" && (nodeIdMap.size === 0 || nodeIdMap.size < timelineAliases.size));
  if (shouldUseFallback) {
    const boundaryChildren = {};
    if (diagramType === "c4Container" || diagramType === "c4Context") {
      const boundaryPattern = /(?:Container_Boundary|System_Boundary)\s*\(\s*([A-Za-z0-9_]+)\s*,[\s\S]*?\{([\s\S]*?)\}/g;
      let boundaryMatch;
      boundaryPattern.lastIndex = 0;
      while ((boundaryMatch = boundaryPattern.exec(mermaidText)) !== null) {
        const boundaryAlias = boundaryMatch[1];
        const boundaryContent = boundaryMatch[2];
        const childPatterns = [
          /Container\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
          /Component\s*\(\s*([A-Za-z0-9_]+)\s*,/g
        ];
        const children = [];
        for (const childPattern of childPatterns) {
          childPattern.lastIndex = 0;
          let childMatch;
          while ((childMatch = childPattern.exec(boundaryContent)) !== null) {
            children.push(childMatch[1]);
          }
        }
        if (children.length > 0) {
          boundaryChildren[boundaryAlias] = children;
        }
      }
    }
    const allAliases = diagramType === "classDiagram" ? classAliases : diagramType === "erDiagram" ? erAliases : diagramType === "gitGraph" ? gitAliases : diagramType === "journey" ? journeyAliases : diagramType === "pie" ? pieAliases : diagramType === "quadrantChart" ? quadrantAliases : diagramType === "requirement" ? requirementAliases : diagramType === "sequenceDiagram" ? sequenceAliases : diagramType === "timeline" ? timelineAliases : aliases;
    const sortedAliases = diagramType === "erDiagram" || diagramType === "gitGraph" || diagramType === "journey" || diagramType === "pie" || diagramType === "quadrantChart" || diagramType === "requirement" || diagramType === "sequenceDiagram" ? Array.from(allAliases).sort((a, b) => {
      if (b.length !== a.length)
        return b.length - a.length;
      return a.localeCompare(b);
    }) : Array.from(allAliases);
    for (const alias of sortedAliases) {
      if (nodeIdMap.has(alias))
        continue;
      if (boundaryChildren[alias])
        continue;
      const aliasLower = alias.toLowerCase();
      const allElements = Array.from(svg.querySelectorAll("*"));
      const textElements = allElements.filter((el) => {
        const text = el.textContent?.toLowerCase() || "";
        if (diagramType === "erDiagram") {
          const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const entityNamePattern = new RegExp(`\\b${aliasEscaped.replace(/_/g, "\\_")}\\b`, "i");
          if (entityNamePattern.test(text)) {
            return true;
          }
          const aliasNoUnderscore = alias.replace(/_/g, "");
          const aliasNoUnderscoreLower = aliasNoUnderscore.toLowerCase();
          if (text.trim().startsWith(aliasNoUnderscoreLower) || text.trim().endsWith(aliasNoUnderscoreLower)) {
            return true;
          }
          const entityNamePatternNoUnderscore = new RegExp(`\\b${aliasNoUnderscoreLower}\\b`, "i");
          if (entityNamePatternNoUnderscore.test(text)) {
            return true;
          }
          if (text.trim().startsWith(aliasLower) || text.trim().endsWith(aliasLower)) {
            return true;
          }
        }
        if (diagramType === "gitGraph") {
          const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const gitNamePattern = new RegExp(`\\b${aliasEscaped}\\b`, "i");
          if (gitNamePattern.test(text)) {
            return true;
          }
          if (text.trim().startsWith(aliasLower) || text.trim().endsWith(aliasLower)) {
            return true;
          }
        }
        if (diagramType === "journey") {
          const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const journeyNamePattern = new RegExp(aliasEscaped.replace(/\s+/g, "\\s+"), "i");
          if (journeyNamePattern.test(text)) {
            return true;
          }
          const journeyWordPattern = new RegExp(`\\b${aliasEscaped.replace(/\s+/g, "\\s+")}\\b`, "i");
          if (journeyWordPattern.test(text)) {
            return true;
          }
          if (text.trim().startsWith(aliasLower) || text.trim().endsWith(aliasLower)) {
            return true;
          }
        }
        if (diagramType === "timeline") {
          const normalizedText = text.replace(/\s+/g, " ").trim().toLowerCase();
          const normalizedAlias = aliasLower.replace(/\s+/g, " ").trim();
          if (normalizedText.includes(normalizedAlias)) {
            return true;
          }
          const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const timelineNamePattern = new RegExp(aliasEscaped.replace(/\s+/g, "\\s+"), "i");
          if (timelineNamePattern.test(text)) {
            return true;
          }
          if (normalizedText.startsWith(normalizedAlias) || normalizedText.endsWith(normalizedAlias)) {
            return true;
          }
        }
        if (diagramType === "classDiagram") {
          const classNamePattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
          if (classNamePattern.test(text)) {
            return true;
          }
          if (text.trim().startsWith(aliasLower) || text.trim().endsWith(aliasLower)) {
            return true;
          }
        }
        const dbPattern = aliasLower === "db" ? /<<system_db>>/i : null;
        if (dbPattern && dbPattern.test(text)) {
          return true;
        }
        if (text.includes(aliasLower) && (text.startsWith(aliasLower) || text.includes(" " + aliasLower) || text.includes(aliasLower + " ") || text.includes("<<" + aliasLower) || text.includes(aliasLower + ">>"))) {
          return true;
        }
        const camelCaseWords = alias.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
        if (camelCaseWords !== aliasLower && camelCaseWords.includes(" ")) {
          const words = camelCaseWords.split(" ");
          if (words.length > 1 && words.every((word) => text.includes(word))) {
            const joinedWords = words.join("");
            if (text.includes(joinedWords) || words.every((word, idx) => {
              if (idx === 0)
                return text.includes(word);
              const prevWord = words[idx - 1];
              return text.includes(prevWord + " " + word) || text.includes(prevWord + word);
            })) {
              return true;
            }
          }
        }
        if (aliasLower.length > 3) {
          const commonWordEndings = ["app", "api", "ui", "db", "service", "system", "user"];
          for (const ending of commonWordEndings) {
            if (aliasLower.endsWith(ending) && aliasLower.length > ending.length) {
              const prefix = aliasLower.slice(0, -ending.length);
              if (text.includes(prefix) && (text.includes(ending) || text.includes(ending + "lication") || text.includes(ending + "i"))) {
                if (text.includes(prefix + " " + ending) || text.includes(prefix + ending) || text.includes(prefix) && text.includes(ending + "lication")) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      });
      let found = false;
      for (const textEl of textElements) {
        let current = textEl;
        let nodeGroup = null;
        if (diagramType === "pie") {
          let legendGroup = null;
          let temp = textEl;
          while (temp && temp !== svg) {
            if (temp instanceof SVGElement && temp.tagName === "g") {
              const className = typeof temp.className === "string" ? temp.className : temp.className.baseVal;
              if (className && className.includes("legend")) {
                legendGroup = temp;
                break;
              }
            }
            temp = temp.parentElement;
          }
          if (legendGroup) {
            const allPaths = Array.from(svg.querySelectorAll("path"));
            const allLegendGroups = Array.from(svg.querySelectorAll("g")).filter((g) => {
              const cn = typeof g.className === "string" ? g.className : g.className.baseVal;
              return cn && cn.includes("legend");
            });
            const legendIndex = legendGroup ? allLegendGroups.indexOf(legendGroup) : -1;
            const slicePaths = allPaths.filter((p) => {
              const d = p.getAttribute("d");
              return d && d.includes("M") && (d.includes("A") || d.includes("L"));
            });
            if (legendIndex >= 0 && legendIndex < slicePaths.length) {
              const slicePath = slicePaths[legendIndex];
              if (slicePath instanceof SVGGraphicsElement) {
                const aliasStr = String(alias);
                if (!nodeIdMap.has(aliasStr)) {
                  nodeIdMap.set(aliasStr, slicePath);
                  found = true;
                  continue;
                }
              }
            }
          }
        }
        if (diagramType === "sequenceDiagram") {
          if (textEl instanceof SVGElement) {
            const textClassName = typeof textEl.className === "string" ? textEl.className : textEl.className.baseVal;
            if (textClassName && textClassName.includes("message")) {
              let messageElement = null;
              try {
                if (textEl instanceof SVGGraphicsElement) {
                  const textBbox = textEl.getBBox();
                  const allElements2 = Array.from(svg.querySelectorAll("line, path"));
                  for (const el of allElements2) {
                    try {
                      const elBbox = el.getBBox();
                      const distance = Math.sqrt(
                        Math.pow(textBbox.x + textBbox.width / 2 - (elBbox.x + elBbox.width / 2), 2) + Math.pow(textBbox.y + textBbox.height / 2 - (elBbox.y + elBbox.height / 2), 2)
                      );
                      if (distance < 150) {
                        let parent = el.parentElement;
                        while (parent && parent !== svg) {
                          if (parent instanceof SVGElement && parent.tagName === "g") {
                            const parentClassName = typeof parent.className === "string" ? parent.className : parent.className.baseVal;
                            if (parentClassName && (parentClassName.includes("message") || parent.contains(textEl))) {
                              messageElement = parent;
                              break;
                            }
                          }
                          parent = parent.parentElement;
                        }
                        if (messageElement)
                          break;
                        messageElement = el;
                        break;
                      }
                    } catch {
                      continue;
                    }
                  }
                }
              } catch {
              }
              let temp = textEl;
              while (temp && temp !== svg && !messageElement) {
                if (temp instanceof SVGElement && temp.tagName === "g") {
                  const className = typeof temp.className === "string" ? temp.className : temp.className.baseVal;
                  if (className && className.includes("message")) {
                    messageElement = temp;
                    break;
                  }
                }
                temp = temp.parentElement;
              }
              if (messageElement) {
                nodeGroup = messageElement;
              } else if (textEl instanceof SVGGraphicsElement) {
                nodeGroup = textEl;
              }
              if (nodeGroup) {
                found = true;
                const aliasStr = String(alias);
                let existingElement = null;
                for (const [existingId, existingEl] of nodeIdMap.entries()) {
                  if (existingId === aliasStr) {
                    existingElement = existingEl;
                    break;
                  }
                }
                if (existingElement && existingElement !== nodeGroup) {
                  nodeIdMap.delete(aliasStr);
                }
                if (!nodeIdMap.has(aliasStr)) {
                  nodeIdMap.set(aliasStr, nodeGroup);
                }
                continue;
              }
            }
          }
        }
        if (diagramType === "quadrantChart") {
          let temp = textEl;
          while (temp && temp !== svg) {
            if (temp instanceof SVGElement && temp.tagName === "g") {
              const className = typeof temp.className === "string" ? temp.className : temp.className.baseVal;
              if (className && className.includes("data-point") && !className.includes("data-points") && !className.includes("main")) {
                if (temp.querySelector("circle")) {
                  nodeGroup = temp;
                  found = true;
                  const aliasStr = String(alias);
                  let existingElement = null;
                  for (const [existingId, existingEl] of nodeIdMap.entries()) {
                    if (existingId === aliasStr) {
                      existingElement = existingEl;
                      break;
                    }
                  }
                  if (existingElement) {
                    const existingClassName = typeof existingElement.className === "string" ? existingElement.className : existingElement.className.baseVal;
                    if (existingClassName && (existingClassName.includes("main") || existingClassName.includes("data-points"))) {
                      nodeIdMap.delete(aliasStr);
                    }
                  }
                  let existingAlias = null;
                  for (const [existingId, existingEl] of nodeIdMap.entries()) {
                    if (existingEl === nodeGroup) {
                      existingAlias = existingId;
                      break;
                    }
                  }
                  if (existingAlias && aliasStr.length <= existingAlias.length) {
                    found = false;
                    break;
                  }
                  if (existingAlias) {
                    nodeIdMap.delete(existingAlias);
                  }
                  nodeIdMap.set(aliasStr, nodeGroup);
                  break;
                }
              }
            }
            temp = temp.parentElement;
          }
          if (found && nodeGroup) {
            continue;
          }
        }
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = current instanceof SVGElement ? typeof current.className === "string" ? current.className : current.className.baseVal : "";
            const hasShapes = current.querySelector("rect, circle, ellipse, polygon, path");
            if (diagramType === "pie" && className && className.includes("legend")) {
              current = current.parentElement;
              continue;
            }
            if (diagramType === "quadrantChart" && className && (className.includes("main") || className.includes("data-points"))) {
              current = current.parentElement;
              continue;
            }
            if (diagramType === "quadrantChart" && className && (className.includes("point") || className.includes("quadrant") || className.includes("data"))) {
              if (className && className.includes("data-point") && !className.includes("data-points")) {
                nodeGroup = current;
                if (current.querySelector("circle"))
                  break;
              } else if (!nodeGroup) {
                if (!className.includes("main") && !className.includes("data-points")) {
                  nodeGroup = current;
                  if (current.querySelector("circle"))
                    break;
                }
              }
            }
            if (className && (className.includes("c4") || className.includes("element") || className.includes("component") || className.includes("container") || className.includes("relationship") || className.includes("boundary") || className.includes("branch") || className.includes("commit") || className.includes("merge") || className.includes("branchLabel") || className.includes("label") || className.includes("step") || className.includes("task") || className.includes("section") || className.includes("journey") || className.includes("slice") || className.includes("segment") || className.includes("pie") || className.includes("quadrant") || className.includes("point") || className.includes("timeline") || className.includes("event")) || hasShapes || !nodeGroup) {
              nodeGroup = current;
              if (hasShapes || className && (className.includes("branchLabel") || className.includes("label") || className.includes("step") || className.includes("task") || className.includes("slice") || className.includes("point") || className.includes("quadrant")))
                break;
            }
          }
          current = current.parentElement;
        }
        if (nodeGroup) {
          const aliasStr = String(alias);
          if (diagramType === "quadrantChart") {
            const existingElement = nodeIdMap.get(aliasStr);
            if (existingElement) {
              const existingClassName = typeof existingElement.className === "string" ? existingElement.className : existingElement.className.baseVal;
              if (existingClassName && (existingClassName.includes("main") || existingClassName.includes("data-points"))) {
                continue;
              }
              if (existingClassName && existingClassName.includes("data-point") && !existingClassName.includes("data-points")) {
                continue;
              }
            }
          }
          if (diagramType === "erDiagram" || diagramType === "gitGraph" || diagramType === "journey" || diagramType === "pie" || diagramType === "quadrantChart") {
            let existingAlias = null;
            for (const [existingId, existingEl] of nodeIdMap.entries()) {
              if (existingEl === nodeGroup) {
                existingAlias = existingId;
                break;
              }
            }
            if (existingAlias && aliasStr.length <= existingAlias.length) {
              continue;
            }
            if (existingAlias) {
              nodeIdMap.delete(existingAlias);
            }
          }
          if (!nodeIdMap.has(aliasStr)) {
            nodeIdMap.set(aliasStr, nodeGroup);
            found = true;
          }
          break;
        }
      }
    }
    for (const [boundaryAlias, childAliases] of Object.entries(boundaryChildren)) {
      if (nodeIdMap.has(boundaryAlias))
        continue;
      const childElements = [];
      for (const childAlias of childAliases) {
        if (nodeIdMap.has(childAlias)) {
          childElements.push(nodeIdMap.get(childAlias));
        } else {
          const childEl = svg.querySelector(`[data-id="${childAlias}"]`);
          if (childEl && childEl instanceof SVGElement) {
            childElements.push(childEl);
          }
        }
      }
      if (childElements.length >= Math.min(2, childAliases.length)) {
        const allGroups = Array.from(svg.querySelectorAll("g"));
        const ancestorCandidates = [];
        for (const group of allGroups) {
          let containsAll = true;
          for (const childEl of childElements) {
            if (!group.contains(childEl)) {
              containsAll = false;
              break;
            }
          }
          if (containsAll) {
            ancestorCandidates.push(group);
          }
        }
        let selectedGroup = null;
        if (ancestorCandidates.length === 0) {
          let svgContainsAll = true;
          for (const childEl of childElements) {
            if (!svg.contains(childEl)) {
              svgContainsAll = false;
              break;
            }
          }
          if (svgContainsAll) {
            selectedGroup = svg;
          }
        } else {
          for (const candidate of ancestorCandidates) {
            const className = candidate instanceof SVGElement ? typeof candidate.className === "string" ? candidate.className : candidate.className.baseVal : "";
            const hasShapes = !!candidate.querySelector("rect, circle, ellipse, polygon, path");
            if (hasShapes || className.includes("boundary") || className.includes("container") || className.includes("system")) {
              selectedGroup = candidate;
              break;
            }
            if (!selectedGroup) {
              selectedGroup = candidate;
            }
          }
        }
        if (selectedGroup && !nodeIdMap.has(boundaryAlias)) {
          nodeIdMap.set(boundaryAlias, selectedGroup);
        }
      }
    }
  }
  const mergeToCommitMap = /* @__PURE__ */ new Map();
  if (diagramType === "gitGraph" && mermaidText) {
    const mergePattern = /merge\s+([A-Za-z0-9_]+)/g;
    const mergeLines = mermaidText.split("\n");
    mergePattern.lastIndex = 0;
    let mergeMatch;
    while ((mergeMatch = mergePattern.exec(mermaidText)) !== null) {
      const mergeLineIdx = mergeLines.findIndex((line) => line.includes(mergeMatch[0]));
      if (mergeLineIdx >= 0 && mergeLineIdx < mergeLines.length - 1) {
        const nextLine = mergeLines[mergeLineIdx + 1];
        const commitAfterMerge = nextLine.match(/commit\s+id:\s*"([^"]+)"/);
        if (commitAfterMerge && commitAfterMerge[1] && nodeIdMap.has(commitAfterMerge[1])) {
          if (!mergeToCommitMap.has("merge")) {
            mergeToCommitMap.set("merge", commitAfterMerge[1]);
          }
        }
      }
    }
  }
  for (const [nodeId, el] of nodeIdMap) {
    el.setAttribute("data-id", nodeId);
  }
  for (const [specialAlias, mappedNodeId] of mergeToCommitMap.entries()) {
    const mappedEl = nodeIdMap.get(mappedNodeId);
    if (mappedEl) {
      nodeIdMap.set(specialAlias, mappedEl);
      mappedEl.setAttribute("data-id", specialAlias);
    }
  }
  for (const [specialAlias, mappedNodeId] of mergeToCommitMap.entries()) {
    const mappedEl = nodeIdMap.get(mappedNodeId);
    if (mappedEl) {
      mappedEl.setAttribute("data-id-merge", specialAlias);
      if (!nodeIdMap.has(specialAlias)) {
        nodeIdMap.set(specialAlias, mappedEl);
        mappedEl.setAttribute("data-id", specialAlias);
      }
    }
  }
}
var createDiagramHandle = (container, svg, strategy) => {
  return {
    getRoot: () => svg,
    getContainer: () => container,
    resolveTarget: (target) => resolveTarget({ getRoot: () => svg, getStrategy: () => strategy }, target),
    getStrategy: () => strategy,
    destroy: () => {
      container.innerHTML = "";
    }
  };
};
function extractC4AliasesFromText(mermaidText) {
  const aliases = /* @__PURE__ */ new Set();
  const c4Patterns = [
    /Component\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /Container\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /Person\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /System\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /System_Ext\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /SystemDb\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /Container_Boundary\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /System_Boundary\s*\(\s*([A-Za-z0-9_]+)\s*,/g
  ];
  for (const pattern of c4Patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(mermaidText)) !== null) {
      aliases.add(match[1]);
    }
  }
  return aliases;
}
var createMermaidDiagramAdapter = () => {
  return {
    async render({ mountEl, mermaidText }) {
      const mermaid = window.mermaid;
      if (!mermaid || typeof mermaid.render !== "function") {
        throw new MPFError(
          "Mermaid is not available on window.mermaid",
          "MPF_MERMAID_UNAVAILABLE",
          {
            mermaidAvailable: typeof window.mermaid !== "undefined"
          }
        );
      }
      const renderId = `finsteps-${Math.random().toString(36).slice(2, 8)}`;
      let renderResult;
      if (detectDiagramType(mermaidText) === "zenuml") {
        console.log("[MermaidAdapter] ZenUML detected, checking registry...");
        const registered = mermaid.diagrams || {};
        console.log("[MermaidAdapter] Registered diagrams:", Object.keys(registered));
      }
      try {
        renderResult = await mermaid.render(renderId, mermaidText);
      } catch (error) {
        const diagType = detectDiagramType(mermaidText);
        throw new MPFError(
          `Failed to render Mermaid diagram (type: ${diagType}): ${error}`,
          "MPF_MERMAID_RENDER_FAILED",
          {
            mermaidTextLength: mermaidText?.length || 0,
            detectedType: diagType,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        );
      }
      const { svg } = renderResult;
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
      if (diagramType === "zenuml") {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      ensureDataIdFromMermaidIds(svgElement, strategy, mermaidText);
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");
      svgElement.setAttribute("width", "100%");
      svgElement.setAttribute("height", "100%");
      if (!svgElement.getAttribute("preserveAspectRatio")) {
        svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
      const existingViewBox = svgElement.getAttribute("viewBox");
      let initialViewBox = existingViewBox;
      if (!existingViewBox || existingViewBox === "0 0 0 0") {
        const rootGroup = svgElement.querySelector("g");
        if (rootGroup) {
          try {
            const bbox = rootGroup.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
              const padding = 40;
              initialViewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`;
              svgElement.setAttribute("viewBox", initialViewBox);
            }
          } catch {
            const width = svgElement.getAttribute("width");
            const height = svgElement.getAttribute("height");
            if (width && height) {
              const w = parseFloat(width) || 1e3;
              const h = parseFloat(height) || 1e3;
              initialViewBox = `0 0 ${w} ${h}`;
              svgElement.setAttribute("viewBox", initialViewBox);
            }
          }
        }
      }
      if (initialViewBox) {
        svgElement.setAttribute("data-initial-viewbox", initialViewBox);
      }
      return createDiagramHandle(container, svgElement, strategy);
    }
  };
};

// src/actions/actionEngine.ts
var ActionEngine = class {
  constructor(handlers) {
    this.handlers = handlers;
  }
  async run(actions, context, errorPolicy) {
    const errors = [];
    for (const action of actions) {
      const handler = this.handlers[action.type];
      if (!handler) {
        const error = new ActionError(
          `Unknown action: ${action.type}`,
          "MPF_ACTION_UNKNOWN",
          { actionType: action.type }
        );
        if (errorPolicy === "haltOnError") {
          throw error;
        }
        errors.push(error);
        continue;
      }
      try {
        await handler(context, action);
      } catch (error) {
        if (error instanceof Error) {
          if (errorPolicy === "haltOnError") {
            throw error;
          }
          errors.push(error);
        } else if (errorPolicy === "haltOnError") {
          throw error;
        }
      }
    }
    return errors;
  }
};

// src/actions/defaultActionHandlers.ts
var ensureHighlight = (state, elements, className) => {
  for (const element of state.elements) {
    element.classList.remove(state.className);
  }
  state.elements.clear();
  state.className = className;
  for (const element of elements) {
    element.classList.add(className);
    state.elements.add(element);
  }
};
var getTargets = (context, target) => {
  if (!target) {
    return [];
  }
  const resolved = resolveTarget(context.diagram, target);
  return resolved ? [resolved] : [];
};
var createDefaultActionHandlers = () => {
  const highlightState = {
    className: "finsteps-highlight",
    elements: /* @__PURE__ */ new Set()
  };
  const handlers = {
    "nav.next": async ({ controller }) => {
      await controller.next();
    },
    "nav.prev": async ({ controller }) => {
      await controller.prev();
    },
    "nav.goto": async ({ controller }, action) => {
      const index = action.payload?.index;
      const id = action.payload?.id;
      if (typeof index === "number") {
        await controller.goto(index);
        return;
      }
      if (typeof id === "string") {
        await controller.goto(id);
        return;
      }
      throw new ActionError("nav.goto requires index or id", "MPF_ACTION_INVALID_ARGS");
    },
    "nav.reset": async ({ controller }) => {
      await controller.reset();
    },
    "camera.fit": async (context, action) => {
      if (!context.camera) {
        return;
      }
      const target = action.payload?.target;
      const resolved = resolveTarget(context.diagram, target);
      if (!resolved) {
        throw new ActionError(
          "camera.fit missing target",
          "MPF_ACTION_INVALID_ARGS",
          { target: target ? JSON.stringify(target) : void 0 }
        );
      }
      const durationMs = action.payload?.durationMs;
      const duration = durationMs ?? action.payload?.duration;
      const easing = action.payload?.easing;
      await context.camera.fit(resolved, {
        padding: typeof action.payload?.padding === "number" ? action.payload.padding : void 0,
        duration: typeof duration === "number" ? duration : void 0,
        easing: typeof easing === "string" ? easing : void 0
      });
    },
    "camera.reset": ({ camera }) => {
      camera?.reset();
    },
    "camera.fitAll": (context, action) => {
      if (!context.camera) {
        return;
      }
      const padding = typeof action.payload?.padding === "number" ? action.payload.padding : void 0;
      if (context.camera.fitAll) {
        context.camera.fitAll(padding);
      } else if (context.camera.reset) {
        context.camera.reset();
      }
    },
    "overlay.bubble": (context, action) => {
      if (!context.overlay) {
        return;
      }
      const target = action.payload?.target;
      const resolved = resolveTarget(context.diagram, target);
      if (!resolved) {
        throw new ActionError(
          "overlay.bubble missing target",
          "MPF_ACTION_INVALID_ARGS",
          { target: target ? JSON.stringify(target) : void 0 }
        );
      }
      const text = String(action.payload?.text ?? "");
      context.overlay.showBubble({
        id: typeof action.payload?.id === "string" ? action.payload.id : void 0,
        target: resolved,
        text
      });
    },
    "overlay.hide": (context, action) => {
      context.overlay?.hideBubble(
        typeof action.payload?.id === "string" ? action.payload.id : void 0
      );
    },
    "style.highlight": (context, action) => {
      const target = action.payload?.target;
      const className = typeof action.payload?.className === "string" ? action.payload.className : "finsteps-highlight";
      const elements = getTargets(context, target);
      ensureHighlight(highlightState, elements, className);
    },
    "style.clear": () => {
      ensureHighlight(highlightState, [], highlightState.className);
    },
    "wait": async (_context, action) => {
      const delayMs = typeof action.payload?.ms === "number" ? action.payload.ms : 0;
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  };
  return handlers;
};

// src/bindings/bindingEngine.ts
var BindingEngine = class {
  constructor() {
    this.disposers = [];
    this.timeouts = [];
  }
  bind(bindings, context) {
    for (const binding of bindings) {
      if (binding.event === "timer") {
        const timeoutId = window.setTimeout(async () => {
          const errors = await context.actionEngine.run(
            binding.actions,
            {
              controller: context.controller,
              diagram: context.diagram,
              event: {
                type: "timer",
                target: null,
                currentTarget: null,
                originalEvent: null,
                timeStamp: Date.now()
              },
              camera: context.camera,
              overlay: context.overlay
            },
            context.errorPolicy
          );
          for (const error of errors) {
            context.onError(error);
          }
        }, binding.delayMs ?? 0);
        this.timeouts.push(timeoutId);
        continue;
      }
      const defaultTarget = binding.event === "key" ? context.diagram.getContainer() : context.diagram.getRoot();
      const target = resolveTarget(context.diagram, binding.target) ?? defaultTarget;
      const eventName = binding.event === "click" ? "click" : binding.event === "hover" ? "mouseenter" : binding.event === "key" ? "keydown" : binding.eventName ?? binding.event;
      const handler = async (event) => {
        if (binding.event === "key" && binding.key) {
          const key = event.key;
          if (key !== binding.key) {
            return;
          }
        }
        const normalized = normalizeEvent(event, eventName);
        const errors = await context.actionEngine.run(
          binding.actions,
          {
            controller: context.controller,
            diagram: context.diagram,
            event: normalized,
            camera: context.camera,
            overlay: context.overlay
          },
          context.errorPolicy
        );
        for (const error of errors) {
          context.onError(error);
        }
      };
      target.addEventListener(eventName, handler);
      this.disposers.push(() => target.removeEventListener(eventName, handler));
    }
  }
  destroy() {
    for (const disposer of this.disposers) {
      disposer();
    }
    for (const timeout of this.timeouts) {
      window.clearTimeout(timeout);
    }
    this.disposers = [];
    this.timeouts = [];
  }
};
var normalizeEvent = (event, type) => {
  if (event instanceof MouseEvent) {
    return {
      type,
      target: event.target,
      currentTarget: event.currentTarget,
      clientX: event.clientX,
      clientY: event.clientY,
      timeStamp: event.timeStamp,
      originalEvent: event
    };
  }
  if (event instanceof KeyboardEvent) {
    return {
      type,
      target: event.target,
      currentTarget: event.currentTarget,
      key: event.key,
      timeStamp: event.timeStamp,
      originalEvent: event
    };
  }
  return {
    type,
    target: event.target,
    currentTarget: event.currentTarget,
    timeStamp: event.timeStamp,
    originalEvent: event
  };
};

// src/eventEmitter.ts
var EventEmitter = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  on(event, handler) {
    const set = this.listeners.get(event) ?? /* @__PURE__ */ new Set();
    set.add(handler);
    this.listeners.set(event, set);
    return () => {
      set.delete(handler);
    };
  }
  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(payload);
    }
  }
  clear() {
    this.listeners.clear();
  }
};

// src/controller/controller.ts
var MermaidController = class {
  constructor(deps) {
    this.deps = deps;
    this.emitter = new EventEmitter();
    this.bindingEngine = new BindingEngine();
    this.stepBindingEngine = new BindingEngine();
    this.currentStepIndex = -1;
    this.previousStepIndex = -1;
    this.lastError = null;
    this.failedStepIndex = null;
    this.executionContext = {};
    const handlers = {
      ...createDefaultActionHandlers(),
      ...deps.actionHandlers ?? {}
    };
    this.actionEngine = new ActionEngine(handlers);
    this.steps = deps.ast.steps ?? [];
  }
  async init(renderPayload) {
    if (renderPayload) {
      this.emitter.emit("render", renderPayload);
    }
    if (this.deps.ast.bindings?.length) {
      this.bindingEngine.bind(this.deps.ast.bindings, {
        diagram: this.deps.diagram,
        actionEngine: this.actionEngine,
        errorPolicy: this.deps.errorPolicy,
        controller: this,
        camera: this.deps.camera,
        overlay: this.deps.overlay,
        onError: (error) => this.emitActionError(error)
      });
    }
    if (this.steps.length > 0) {
      await this.goto(0);
    }
    if (this.deps.hooks?.onInit) {
      try {
        await this.deps.hooks.onInit(this);
      } catch (error) {
        console.warn("[MermaidController] onInit hook error:", error);
      }
    }
  }
  async next() {
    await this.goto(this.currentStepIndex + 1);
  }
  async prev() {
    await this.goto(this.currentStepIndex - 1);
  }
  async goto(step) {
    const index = typeof step === "number" ? step : this.steps.findIndex((s) => s.id === step);
    if (index < 0 || index >= this.steps.length) {
      return;
    }
    const stepDef = this.steps[index];
    const errorPolicy = stepDef.errorPolicy ?? this.deps.errorPolicy;
    this.previousStepIndex = this.currentStepIndex;
    const previousStep = this.previousStepIndex >= 0 ? this.steps[this.previousStepIndex] : void 0;
    this.executionContext.previousStep = previousStep;
    this.executionContext.currentStep = stepDef;
    this.stepBindingEngine.destroy();
    if (this.deps.overlay?.clear) {
      this.deps.overlay.clear();
    }
    const firstActionIsCamera = stepDef.actions.length > 0 && (stepDef.actions[0].type === "camera.fit" || stepDef.actions[0].type === "camera.reset" || stepDef.actions[0].type === "camera.fitAll");
    if (this.deps.camera && !firstActionIsCamera) {
      this.deps.camera.reset();
    }
    await this.actionEngine.run(
      [{ type: "style.clear" }],
      {
        controller: this,
        diagram: this.deps.diagram,
        camera: this.deps.camera,
        overlay: this.deps.overlay
      },
      "continueOnError"
    );
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    let actionErrors = [];
    let actionFailed = false;
    try {
      for (const action of stepDef.actions) {
        this.executionContext.currentAction = action;
        const actionStartPayload = {
          action: { ...action },
          step: { ...stepDef },
          context: this.getExecutionContext()
        };
        this.emitter.emit("actionstart", actionStartPayload);
        if (this.deps.hooks?.onActionStart) {
          try {
            this.deps.hooks.onActionStart(action, stepDef);
          } catch (error) {
            console.warn("[MermaidController] onActionStart hook error:", error);
          }
        }
      }
      const errors = await this.actionEngine.run(
        stepDef.actions,
        {
          controller: this,
          diagram: this.deps.diagram,
          camera: this.deps.camera,
          overlay: this.deps.overlay
        },
        errorPolicy
      );
      actionErrors = errors;
      for (const action of stepDef.actions) {
        const actionError = errors.find(
          (e) => e instanceof Error && e.message.includes(action.type)
        );
        const result = {
          success: !actionError,
          error: actionError
        };
        const actionCompletePayload = {
          action: { ...action },
          result,
          step: { ...stepDef },
          context: this.getExecutionContext()
        };
        this.emitter.emit("actioncomplete", actionCompletePayload);
        if (this.deps.hooks?.onActionComplete) {
          try {
            this.deps.hooks.onActionComplete(action, result);
          } catch (error) {
            console.warn("[MermaidController] onActionComplete hook error:", error);
          }
        }
      }
      for (const error of errors) {
        this.emitActionError(error, stepDef);
      }
    } catch (error) {
      actionFailed = true;
      const actionError = error instanceof Error ? error : new Error(String(error));
      this.lastError = actionError;
      this.failedStepIndex = index;
      this.emitActionError(actionError, stepDef);
      if (errorPolicy === "haltOnError") {
        this.currentStepIndex = index;
        this.emitter.emit("stepchange", {
          state: this.getState(),
          previousState: {
            stepIndex: this.previousStepIndex,
            stepId: this.steps[this.previousStepIndex]?.id,
            stepCount: this.steps.length
          },
          step: { ...stepDef },
          previousStep: previousStep ? { ...previousStep } : void 0
        });
        return;
      }
    }
    if (!actionFailed && actionErrors.length === 0) {
      this.lastError = null;
      this.failedStepIndex = null;
    }
    this.currentStepIndex = index;
    if (stepDef.bindings?.length) {
      this.stepBindingEngine.bind(stepDef.bindings, {
        diagram: this.deps.diagram,
        actionEngine: this.actionEngine,
        errorPolicy,
        controller: this,
        camera: this.deps.camera,
        overlay: this.deps.overlay,
        onError: (error) => this.emitActionError(error, stepDef)
      });
    }
    this.executionContext.currentAction = void 0;
    const stepChangePayload = {
      state: this.getState(),
      previousState: {
        stepIndex: this.previousStepIndex,
        stepId: this.steps[this.previousStepIndex]?.id,
        stepCount: this.steps.length
      },
      step: { ...stepDef },
      previousStep: previousStep ? { ...previousStep } : void 0
    };
    this.emitter.emit("stepchange", stepChangePayload);
    if (this.deps.hooks?.onStepChange) {
      try {
        await this.deps.hooks.onStepChange(this.getState(), stepDef);
      } catch (error) {
        console.warn("[MermaidController] onStepChange hook error:", error);
      }
    }
  }
  async reset() {
    await this.goto(0);
  }
  async retry() {
    if (this.failedStepIndex !== null && this.failedStepIndex >= 0) {
      await this.goto(this.failedStepIndex);
    } else if (this.currentStepIndex >= 0) {
      await this.goto(this.currentStepIndex);
    }
  }
  clearError() {
    this.lastError = null;
    this.failedStepIndex = null;
  }
  async updateAst(newAst, options) {
    const preserveState = options?.preserveState ?? false;
    const previousState = this.getState();
    const currentStepId = this.steps[this.currentStepIndex]?.id;
    this.deps.ast = newAst;
    this.steps = newAst.steps ?? [];
    this.bindingEngine.destroy();
    if (newAst.bindings?.length) {
      this.bindingEngine.bind(newAst.bindings, {
        diagram: this.deps.diagram,
        actionEngine: this.actionEngine,
        errorPolicy: this.deps.errorPolicy,
        controller: this,
        camera: this.deps.camera,
        overlay: this.deps.overlay,
        onError: (error) => this.emitActionError(error)
      });
    }
    if (preserveState && currentStepId) {
      const newStepIndex = this.steps.findIndex((s) => s.id === currentStepId);
      if (newStepIndex >= 0) {
        this.currentStepIndex = newStepIndex;
        await this.goto(newStepIndex);
      } else {
        if (this.steps.length > 0) {
          await this.goto(0);
        } else {
          this.currentStepIndex = -1;
        }
      }
    } else {
      if (this.steps.length > 0) {
        await this.goto(0);
      } else {
        this.currentStepIndex = -1;
      }
    }
    this.emitter.emit("astchange", {
      previousState,
      newState: this.getState(),
      previousSteps: previousState.stepCount,
      newSteps: this.steps.length
    });
  }
  destroy() {
    this.bindingEngine.destroy();
    this.stepBindingEngine.destroy();
    this.deps.camera?.destroy();
    this.deps.overlay?.destroy();
    this.deps.diagram.destroy();
    this.emitter.clear();
  }
  getState() {
    return {
      stepIndex: this.currentStepIndex,
      stepId: this.steps[this.currentStepIndex]?.id,
      stepCount: this.steps.length,
      errorState: this.lastError ? {
        hasError: true,
        lastError: this.lastError,
        failedStep: this.failedStepIndex ?? void 0
      } : void 0
    };
  }
  getExecutionContext() {
    return {
      currentAction: this.executionContext.currentAction ? { ...this.executionContext.currentAction } : void 0,
      currentStep: this.executionContext.currentStep ? { ...this.executionContext.currentStep } : void 0,
      previousStep: this.executionContext.previousStep ? { ...this.executionContext.previousStep } : void 0
    };
  }
  async setState(partial) {
    if (typeof partial.stepIndex === "number") {
      await this.goto(partial.stepIndex);
      return;
    }
    if (typeof partial.stepId === "string") {
      await this.goto(partial.stepId);
    }
  }
  on(event, handler) {
    return this.emitter.on(event, handler);
  }
  // Accessor methods for editor and dynamic use cases
  getDeps() {
    return {
      diagram: this.deps.diagram,
      camera: this.deps.camera,
      overlay: this.deps.overlay
    };
  }
  getSteps() {
    return this.steps.map((step) => ({ ...step }));
  }
  getCurrentStep() {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.steps.length) {
      return null;
    }
    return { ...this.steps[this.currentStepIndex] };
  }
  getActionEngine() {
    return this.actionEngine;
  }
  emitActionError(error, step) {
    this.lastError = error;
    const errorContext = {
      step: step ? { ...step } : this.executionContext.currentStep,
      action: this.executionContext.currentAction
    };
    const context = {
      error,
      ...errorContext,
      context: this.getExecutionContext()
    };
    this.emitter.emit("actionerror", context);
    this.emitter.emit("error", context);
    if (this.deps.hooks?.onError) {
      try {
        this.deps.hooks.onError(error, errorContext);
      } catch (hookError) {
        console.warn("[MermaidController] onError hook error:", hookError);
      }
    }
  }
};

// src/adapters/floatingControls.ts
function createIconButton(icon, title, onClick) {
  const button = document.createElement("button");
  button.className = "finsteps-control-btn";
  button.setAttribute("aria-label", title);
  button.title = title;
  const iconMap = {
    play: "\u25B6",
    pause: "\u23F8",
    prev: "\u25C0",
    next: "\u25B6",
    zoomIn: "+",
    zoomOut: "\u2212",
    fitAll: "\u229E"
  };
  const iconText = iconMap[icon] || icon;
  button.innerHTML = `<span class="finsteps-control-icon">${iconText}</span>`;
  button.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: rgba(30, 41, 59, 0.9);
    color: #e2e8f0;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 16px;
    backdrop-filter: blur(8px);
  `;
  button.addEventListener("mouseenter", () => {
    button.style.background = "rgba(51, 65, 85, 0.95)";
    button.style.transform = "scale(1.1)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "rgba(30, 41, 59, 0.9)";
    button.style.transform = "scale(1)";
  });
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return button;
}
function createFloatingControls(options) {
  const {
    controller,
    camera,
    position = "bottom-right",
    showPlayPause = true,
    showPrevNext = true,
    showZoomControls = true,
    showStepIndicator = true,
    autoHide = false,
    offset = { x: 20, y: 20 }
  } = options;
  const container = document.createElement("div");
  container.className = "finsteps-floating-controls";
  container.style.cssText = `
    position: fixed;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  `;
  const positionStyles = {
    "bottom-right": { bottom: `${offset.y}px`, right: `${offset.x}px` },
    "bottom-left": { bottom: `${offset.y}px`, left: `${offset.x}px` },
    "top-right": { top: `${offset.y}px`, right: `${offset.x}px` },
    "top-left": { top: `${offset.y}px`, left: `${offset.x}px` },
    "bottom-center": { bottom: `${offset.y}px`, left: "50%", transform: "translateX(-50%)" }
  };
  Object.assign(container.style, positionStyles[position] || positionStyles["bottom-right"]);
  const navGroup = document.createElement("div");
  navGroup.className = "finsteps-control-group";
  navGroup.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;
  let isPlaying = false;
  let playbackInterval = null;
  const stopPlayback = () => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
    }
    isPlaying = false;
    updatePlayPauseButton();
  };
  const startPlayback = () => {
    const steps = controller.getSteps?.() || [];
    if (steps.length === 0)
      return;
    isPlaying = true;
    updatePlayPauseButton();
    playbackInterval = setInterval(() => {
      const state = controller.getState();
      if (state.stepIndex < state.stepCount - 1) {
        controller.next().catch(() => stopPlayback());
      } else {
        stopPlayback();
      }
    }, 3e3);
  };
  const playPauseBtn = showPlayPause ? createIconButton("play", "Play/Pause", () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }) : null;
  const updatePlayPauseButton = () => {
    if (!playPauseBtn)
      return;
    const iconSpan = playPauseBtn.querySelector(".finsteps-control-icon");
    if (iconSpan) {
      iconSpan.textContent = isPlaying ? "\u23F8" : "\u25B6";
    }
    playPauseBtn.title = isPlaying ? "Pause" : "Play";
  };
  const prevBtn = showPrevNext ? createIconButton("prev", "Previous Step", () => {
    stopPlayback();
    controller.prev().catch(() => {
    });
  }) : null;
  const nextBtn = showPrevNext ? createIconButton("next", "Next Step", () => {
    stopPlayback();
    controller.next().catch(() => {
    });
  }) : null;
  if (prevBtn)
    navGroup.appendChild(prevBtn);
  if (playPauseBtn)
    navGroup.appendChild(playPauseBtn);
  if (nextBtn)
    navGroup.appendChild(nextBtn);
  const stepIndicator = showStepIndicator ? document.createElement("div") : null;
  if (stepIndicator) {
    stepIndicator.className = "finsteps-step-indicator";
    stepIndicator.style.cssText = `
      padding: 6px 12px;
      background: rgba(30, 41, 59, 0.9);
      border-radius: 8px;
      color: #94a3b8;
      font-size: 12px;
      font-family: monospace;
      text-align: center;
      min-width: 80px;
    `;
    navGroup.appendChild(stepIndicator);
  }
  container.appendChild(navGroup);
  if (showZoomControls && camera) {
    const zoomGroup = document.createElement("div");
    zoomGroup.className = "finsteps-control-group";
    zoomGroup.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      border-top: 1px solid rgba(51, 65, 85, 0.5);
      padding-top: 8px;
    `;
    const zoomOutBtn = createIconButton("zoomOut", "Zoom Out", () => {
      if (camera.zoom) {
        camera.zoom(0.8);
      }
    });
    const zoomInBtn = createIconButton("zoomIn", "Zoom In", () => {
      if (camera.zoom) {
        camera.zoom(1.2);
      }
    });
    const fitAllBtn = createIconButton("fitAll", "Fit All", () => {
      if (camera.fitAll) {
        camera.fitAll();
      }
    });
    zoomGroup.appendChild(zoomOutBtn);
    zoomGroup.appendChild(zoomInBtn);
    zoomGroup.appendChild(fitAllBtn);
    container.appendChild(zoomGroup);
  }
  document.body.appendChild(container);
  const updateState = (state) => {
    if (stepIndicator) {
      stepIndicator.textContent = `Step ${state.stepIndex + 1} / ${state.stepCount}`;
    }
    if (prevBtn) {
      prevBtn.disabled = state.stepIndex <= 0;
      prevBtn.style.opacity = state.stepIndex <= 0 ? "0.5" : "1";
      prevBtn.style.cursor = state.stepIndex <= 0 ? "not-allowed" : "pointer";
    }
    if (nextBtn) {
      nextBtn.disabled = state.stepIndex >= state.stepCount - 1;
      nextBtn.style.opacity = state.stepIndex >= state.stepCount - 1 ? "0.5" : "1";
      nextBtn.style.cursor = state.stepIndex >= state.stepCount - 1 ? "not-allowed" : "pointer";
    }
    if (isPlaying && state.stepIndex >= state.stepCount - 1) {
      stopPlayback();
    }
  };
  const unsubscribe = controller.on("stepchange", (payload) => {
    if (payload && typeof payload === "object" && "state" in payload) {
      updateState(payload.state);
    } else if (payload && typeof payload === "object" && "stepIndex" in payload) {
      updateState(payload);
    }
  });
  updateState(controller.getState());
  let hideTimeout = null;
  if (autoHide) {
    const resetHideTimeout = () => {
      if (hideTimeout)
        clearTimeout(hideTimeout);
      container.style.opacity = "1";
      hideTimeout = setTimeout(() => {
        container.style.opacity = "0.3";
      }, 3e3);
    };
    container.addEventListener("mouseenter", () => {
      container.style.opacity = "1";
      if (hideTimeout)
        clearTimeout(hideTimeout);
    });
    container.addEventListener("mouseleave", resetHideTimeout);
    resetHideTimeout();
  }
  return {
    show() {
      container.style.display = "flex";
    },
    hide() {
      container.style.display = "none";
    },
    updateState,
    destroy() {
      stopPlayback();
      unsubscribe();
      if (hideTimeout)
        clearTimeout(hideTimeout);
      container.remove();
    }
  };
}

// src/mocks/mockHandles.ts
var createMockDiagramHandle = (svg) => {
  const container = svg.parentElement ?? document.body;
  return {
    getRoot: () => svg,
    getContainer: () => container,
    resolveTarget: (target) => resolveTarget({ getRoot: () => svg }, target),
    destroy: () => {
      svg.remove();
    }
  };
};
var createMockCameraHandle = () => {
  return {
    fit: () => void 0,
    reset: () => void 0,
    destroy: () => void 0
  };
};
var createMockOverlayHandle = () => {
  return {
    showBubble: () => void 0,
    hideBubble: () => void 0,
    destroy: () => void 0
  };
};

// src/lexer.ts
var keywords = /* @__PURE__ */ new Set([
  "mpd",
  "deck",
  "meta",
  "let",
  "use",
  "diagram",
  "mermaid",
  "config",
  "assets",
  "runtime",
  "camera",
  "overlay",
  "navigation",
  "performance",
  "selectors",
  "styles",
  "scene",
  "step",
  "as",
  "focus",
  "pad",
  "align",
  "lock",
  "id",
  "do",
  "assert",
  "else",
  "binding",
  "priority",
  "on",
  "target",
  "when",
  "node",
  "edge",
  "subgraph",
  "css",
  "text",
  "group",
  "union",
  "intersect",
  "except",
  "true",
  "false",
  "null",
  "or",
  "and",
  "viewport",
  "container",
  "svg",
  "engine",
  "options",
  "bounds",
  "strategy",
  "fallback",
  "classes",
  "spotlight",
  "theme",
  "keys",
  "wheelZoom",
  "dragPan",
  "tapToAdvance",
  "progressUI",
  "startAt",
  "click",
  "dblclick",
  "hover",
  "mouseenter",
  "mouseleave",
  "wheel",
  "scroll",
  "key",
  "timer",
  "custom",
  "any"
]);
var operators = /* @__PURE__ */ new Set(["==", "!=", "<=", ">=", "<", ">", "+", "-", "*", "/", "%", "!"]);
var punctuators = /* @__PURE__ */ new Set(["{", "}", "(", ")", "[", "]", ":", ";", ",", ".", "=", "$"]);
var numberPattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)/;
var intPattern = /^\d+/;
var identPattern = /^[A-Za-z_][A-Za-z0-9_-]*/;
var colorPattern = /^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?/;
function advancePosition(position, text) {
  let { line, column, offset } = position;
  for (const char of text) {
    offset += 1;
    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column, offset };
}
function makeSpan(start, end) {
  return { start, end };
}
function lexMPD(source) {
  const tokens = [];
  const diagnostics = [];
  let position = { offset: 0, line: 1, column: 1 };
  let index = 0;
  const pushToken = (type, value, image, start, end, heredoc) => {
    tokens.push({ type, value, start, end, image, heredoc });
  };
  while (index < source.length) {
    const char = source[index];
    if (char === " " || char === "	" || char === "\r" || char === "\n") {
      const match = /^[ \t\r\n]+/.exec(source.slice(index));
      if (match) {
        const image = match[0];
        position = advancePosition(position, image);
        index += image.length;
        continue;
      }
    }
    if (char === "#" || char === "/" && source[index + 1] === "/") {
      const match = /^(#|\/\/)[^\n\r]*/.exec(source.slice(index));
      if (match) {
        const image = match[0];
        position = advancePosition(position, image);
        index += image.length;
        continue;
      }
    }
    if (source.startsWith("<<<", index)) {
      const heredoc = scanHeredoc(source, index);
      if (heredoc) {
        const { image, tag, body } = heredoc;
        const start = position;
        const end = advancePosition(position, image);
        pushToken("heredoc", image, image, start, end, { tag, body });
        position = end;
        index += image.length;
        continue;
      }
    }
    if (char === '"' || char === "'") {
      const { image, value } = scanString(source, index, position, diagnostics);
      const start = position;
      const end = advancePosition(position, image);
      pushToken("string", value, image, start, end);
      position = end;
      index += image.length;
      continue;
    }
    if (char === "#") {
      const match = colorPattern.exec(source.slice(index));
      if (match) {
        const image = match[0];
        const start = position;
        const end = advancePosition(position, image);
        pushToken("color", image, image, start, end);
        position = end;
        index += image.length;
        continue;
      }
    }
    const numberMatch = numberPattern.exec(source.slice(index));
    if (numberMatch) {
      const image = numberMatch[0];
      const next = source.slice(index + image.length);
      const durationMatch = /^(ms|s|m)/.exec(next);
      if (durationMatch) {
        const full = image + durationMatch[0];
        const start2 = position;
        const end2 = advancePosition(position, full);
        pushToken("duration", full, full, start2, end2);
        position = end2;
        index += full.length;
        continue;
      }
      if (next.startsWith("%")) {
        const full = `${image}%`;
        const start2 = position;
        const end2 = advancePosition(position, full);
        pushToken("percent", full, full, start2, end2);
        position = end2;
        index += full.length;
        continue;
      }
      const start = position;
      const end = advancePosition(position, image);
      pushToken("number", image, image, start, end);
      position = end;
      index += image.length;
      continue;
    }
    const intMatch = intPattern.exec(source.slice(index));
    if (intMatch) {
      const image = intMatch[0];
      const start = position;
      const end = advancePosition(position, image);
      pushToken("int", image, image, start, end);
      position = end;
      index += image.length;
      continue;
    }
    const identMatch = identPattern.exec(source.slice(index));
    if (identMatch) {
      const image = identMatch[0];
      const start = position;
      const end = advancePosition(position, image);
      if (image === "true" || image === "false") {
        pushToken("boolean", image, image, start, end);
      } else if (image === "null") {
        pushToken("null", image, image, start, end);
      } else if (keywords.has(image)) {
        pushToken("keyword", image, image, start, end);
      } else {
        pushToken("identifier", image, image, start, end);
      }
      position = end;
      index += image.length;
      continue;
    }
    const twoChar = source.slice(index, index + 2);
    if (operators.has(twoChar)) {
      const start = position;
      const end = advancePosition(position, twoChar);
      pushToken("operator", twoChar, twoChar, start, end);
      position = end;
      index += twoChar.length;
      continue;
    }
    if (operators.has(char)) {
      const start = position;
      const end = advancePosition(position, char);
      pushToken("operator", char, char, start, end);
      position = end;
      index += 1;
      continue;
    }
    if (punctuators.has(char)) {
      const start = position;
      const end = advancePosition(position, char);
      pushToken("punct", char, char, start, end);
      position = end;
      index += 1;
      continue;
    }
    diagnostics.push({
      message: `Unexpected character '${char}'.`,
      severity: "error",
      span: makeSpan(position, advancePosition(position, char)),
      code: "lex/unexpected-character"
    });
    position = advancePosition(position, char);
    index += 1;
  }
  tokens.push({
    type: "eof",
    value: "<eof>",
    start: position,
    end: position,
    image: ""
  });
  return { tokens, diagnostics };
}
function scanString(source, startIndex, start, diagnostics) {
  const quote = source[startIndex];
  let index = startIndex + 1;
  let value = "";
  while (index < source.length) {
    const char = source[index];
    if (char === quote) {
      const image2 = source.slice(startIndex, index + 1);
      return { image: image2, value };
    }
    if (char === "\\") {
      const next = source[index + 1];
      if (next === "n") {
        value += "\n";
        index += 2;
        continue;
      }
      if (next === "t") {
        value += "	";
        index += 2;
        continue;
      }
      if (next === "r") {
        value += "\r";
        index += 2;
        continue;
      }
      if (next === quote) {
        value += quote;
        index += 2;
        continue;
      }
      value += next ?? "";
      index += 2;
      continue;
    }
    value += char;
    index += 1;
  }
  const image = source.slice(startIndex, index);
  diagnostics.push({
    message: "Unterminated string literal.",
    severity: "error",
    span: { start, end: advancePosition(start, image) },
    code: "lex/unterminated-string"
  });
  return { image, value };
}
function scanHeredoc(source, startIndex) {
  const identMatch = identPattern.exec(source.slice(startIndex + 3));
  if (!identMatch) {
    return null;
  }
  const tag = identMatch[0];
  const afterTagIndex = startIndex + 3 + tag.length;
  const lineBreak = source[afterTagIndex];
  if (lineBreak !== "\n") {
    return null;
  }
  const endMarker = `
${tag}>>>`;
  const endIndex = source.indexOf(endMarker, afterTagIndex + 1);
  if (endIndex === -1) {
    return null;
  }
  const image = source.slice(startIndex, endIndex + endMarker.length);
  const body = source.slice(afterTagIndex + 1, endIndex);
  return { image, tag, body };
}

// src/parser.ts
var SUPPORTED_VERSION = "1.0";
function parseMPD(source) {
  const lexed = lexMPD(source);
  const parser = new MPDParser(source, lexed.tokens, lexed.diagnostics);
  const ast = parser.parseProgram();
  const diagnostics = parser.diagnostics;
  if (ast) {
    diagnostics.push(...validateAST(ast));
  }
  return { ast, diagnostics };
}
var _MPDParser = class _MPDParser {
  constructor(source, tokens, diagnostics) {
    this.source = source;
    this.tokens = tokens;
    this.index = 0;
    this.diagnostics = diagnostics.slice();
  }
  parseProgram() {
    const start = this.peek();
    if (!this.consumeKeyword("mpd")) {
      return null;
    }
    const version = this.parseVersion();
    if (!version) {
      return null;
    }
    const body = [];
    if (this.matchKeyword("deck")) {
      const deck = this.parseDeck();
      if (deck) {
        body.push(deck);
      }
    } else {
      while (!this.isAtEnd()) {
        const item = this.parseTopLevelItem();
        if (!item) {
          break;
        }
        body.push(item);
      }
    }
    const end = this.previous();
    return {
      type: "Program",
      version: version.value,
      body,
      span: spanFrom(start, end)
    };
  }
  parseDeck() {
    const start = this.consumeKeyword("deck");
    if (!start) {
      return null;
    }
    const name = this.parseOptionalName();
    const { items, end } = this.parseBlock(() => this.parseDeckItem());
    return {
      type: "Deck",
      name: name ?? void 0,
      items,
      span: spanFrom(start, end)
    };
  }
  parseTopLevelItem() {
    return this.parseDeckItemInternal(true);
  }
  parseDeckItem() {
    return this.parseDeckItemInternal(false);
  }
  parseDeckItemInternal(reportErrors) {
    if (this.isAtEnd()) {
      return null;
    }
    const token = this.peek();
    if (token.type === "keyword") {
      const handler = _MPDParser.KEYWORD_ITEM_PARSERS[token.value];
      if (handler) {
        return handler(this);
      }
    }
    if (token.type === "identifier") {
      return this.parseUnknownBlock();
    }
    if (reportErrors) {
      this.error(token, "top-level declaration");
    }
    return null;
  }
  parseUnknownBlock() {
    const nameToken = this.consume("identifier");
    if (!nameToken) {
      return null;
    }
    const brace = this.consumePunct("{");
    if (!brace) {
      return null;
    }
    let depth = 1;
    while (!this.isAtEnd() && depth > 0) {
      const token = this.peek();
      if (token.type === "punct" && token.value === "{") {
        depth += 1;
      } else if (token.type === "punct" && token.value === "}") {
        depth -= 1;
      }
      this.advance();
    }
    const end = this.previous();
    const content = this.source.slice(brace.start.offset, end.end.offset);
    return {
      type: "UnknownBlock",
      name: nameToken.value,
      content,
      span: spanFrom(nameToken, end)
    };
  }
  parseMetaDecl() {
    const start = this.consumeKeyword("meta");
    if (!start) {
      return null;
    }
    const items = [];
    this.consumePunct("{");
    while (!this.isAtEnd() && !this.matchPunct("}")) {
      const entry = this.parseMetaEntry();
      if (entry) {
        items.push(entry);
      }
      if (this.matchPunct(",")) {
        this.consumePunct(",");
      }
    }
    const end = this.consumePunct("}") ?? this.previous();
    return {
      type: "MetaDecl",
      entries: items,
      span: spanFrom(start, end)
    };
  }
  parseMetaEntry() {
    const key = this.consume("identifier");
    if (!key) {
      return null;
    }
    this.consumePunct(":");
    const value = this.parseExpr();
    if (!value) {
      return null;
    }
    return {
      type: "MetaEntry",
      key: key.value,
      value,
      span: spanFrom(key, this.previous())
    };
  }
  parseConstDecl() {
    const start = this.consumeKeyword("let");
    if (!start) {
      return null;
    }
    const name = this.consume("identifier");
    if (!name) {
      return null;
    }
    this.consumePunct("=");
    const value = this.parseExpr();
    this.consumePunct(";");
    return {
      type: "ConstDecl",
      name: name.value,
      value: value ?? this.emptyLiteral(name),
      span: spanFrom(start, this.previous())
    };
  }
  parsePluginDecl() {
    const start = this.consumeKeyword("use");
    if (!start) {
      return null;
    }
    const ref = this.parseName();
    let options;
    if (this.peek().type === "punct" && this.peek().value === "{") {
      options = this.parseObjectExpr();
    }
    this.consumePunct(";");
    return {
      type: "PluginDecl",
      ref,
      options,
      span: spanFrom(start, this.previous())
    };
  }
  parseDiagramDecl() {
    const start = this.consumeKeyword("diagram");
    if (!start) {
      return null;
    }
    const id = this.parseName();
    const { items, end } = this.parseBlock(() => this.parseDiagramItem());
    return {
      type: "DiagramDecl",
      id,
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseDiagramItem() {
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "mermaid":
          return this.parseMermaidSourceDecl();
        case "config":
          return this.parseMermaidConfigDecl();
        case "assets":
          return this.parseDiagramAssetsDecl();
        case "meta":
          return this.parseMetaDecl();
        default:
          break;
      }
    }
    return null;
  }
  parseMermaidSourceDecl() {
    const start = this.consumeKeyword("mermaid");
    if (!start) {
      return null;
    }
    const heredocToken = this.consume("heredoc");
    if (!heredocToken || !heredocToken.heredoc) {
      return null;
    }
    this.consumePunct(";");
    return {
      type: "MermaidSourceDecl",
      source: heredocToken.heredoc.body,
      tag: heredocToken.heredoc.tag,
      span: spanFrom(start, this.previous())
    };
  }
  parseMermaidConfigDecl() {
    const start = this.consumeKeyword("config");
    if (!start) {
      return null;
    }
    const config = this.parseObjectExpr();
    this.consumePunct(";");
    return {
      type: "MermaidConfigDecl",
      config,
      span: spanFrom(start, this.previous())
    };
  }
  parseDiagramAssetsDecl() {
    const start = this.consumeKeyword("assets");
    if (!start) {
      return null;
    }
    const assets = this.parseObjectExpr();
    this.consumePunct(";");
    return {
      type: "DiagramAssetsDecl",
      assets,
      span: spanFrom(start, this.previous())
    };
  }
  parseRuntimeDecl() {
    const start = this.consumeKeyword("runtime");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseRuntimeItem());
    return {
      type: "RuntimeDecl",
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseRuntimeItem() {
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "camera":
          return this.parseCameraDecl();
        case "overlay":
          return this.parseOverlayDecl();
        case "navigation":
          return this.parseNavigationDecl();
        case "controls":
          return this.parseControlsDecl();
        case "performance":
          return this.parsePerformanceDecl();
        case "meta":
          return this.parseMetaDecl();
        default:
          break;
      }
    }
    return null;
  }
  parseCameraDecl() {
    const start = this.consumeKeyword("camera");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseCameraItem());
    return {
      type: "CameraDecl",
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseCameraItem() {
    if (this.matchKeyword("engine")) {
      const start = this.consumeKeyword("engine");
      this.consumePunct(":");
      const name = this.parseName();
      this.consumePunct(";");
      return {
        type: "CameraEngine",
        name,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("options")) {
      const start = this.consumeKeyword("options");
      this.consumePunct(":");
      const options = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "CameraOptions",
        options,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("bounds")) {
      const start = this.consumeKeyword("bounds");
      this.consumePunct(":");
      const boundsToken = this.consume("keyword");
      const bounds = boundsToken?.value ?? "viewport";
      this.consumePunct(";");
      return {
        type: "CameraBounds",
        bounds,
        span: spanFrom(start, this.previous())
      };
    }
    return null;
  }
  parseOverlayDecl() {
    const start = this.consumeKeyword("overlay");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseOverlayItem());
    return {
      type: "OverlayDecl",
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseOverlayItem() {
    if (this.matchKeyword("engine")) {
      const start = this.consumeKeyword("engine");
      this.consumePunct(":");
      const name = this.parseName();
      this.consumePunct(";");
      return {
        type: "OverlayEngine",
        name,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("options")) {
      const start = this.consumeKeyword("options");
      this.consumePunct(":");
      const options = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "OverlayOptions",
        options,
        span: spanFrom(start, this.previous())
      };
    }
    return null;
  }
  parseNavigationDecl() {
    const start = this.consumeKeyword("navigation");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseNavigationItem());
    return {
      type: "NavigationDecl",
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseNavigationItem() {
    if (this.matchKeyword("keys")) {
      const start = this.consumeKeyword("keys");
      this.consumePunct(":");
      const options = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "NavigationKeys",
        options,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("wheelZoom")) {
      const start = this.consumeKeyword("wheelZoom");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "NavigationWheelZoom",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("dragPan")) {
      const start = this.consumeKeyword("dragPan");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "NavigationDragPan",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("tapToAdvance")) {
      const start = this.consumeKeyword("tapToAdvance");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "NavigationTapToAdvance",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("progressUI")) {
      const start = this.consumeKeyword("progressUI");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "NavigationProgressUI",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("startAt")) {
      const start = this.consumeKeyword("startAt");
      this.consumePunct(":");
      const valueToken = this.peek();
      let value = 0;
      if (valueToken.type === "int" || valueToken.type === "number") {
        this.advance();
        value = Number(valueToken.value);
      } else if (valueToken.type === "string") {
        this.advance();
        value = valueToken.value;
      } else {
        this.error(valueToken, "number or string");
      }
      this.consumePunct(";");
      return {
        type: "NavigationStartAt",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    return null;
  }
  parseControlsDecl() {
    const start = this.consumeKeyword("controls");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseControlsItem());
    return {
      type: "ControlsDecl",
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseControlsItem() {
    if (this.matchKeyword("mode")) {
      const start = this.consumeKeyword("mode");
      this.consumePunct(":");
      const mode = this.parseName();
      this.consumePunct(";");
      return {
        type: "ControlsMode",
        mode: mode ?? { type: "Name", value: "floating", kind: "identifier", span: spanFrom(start, this.previous()) },
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("position")) {
      const start = this.consumeKeyword("position");
      this.consumePunct(":");
      const position = this.parseName();
      this.consumePunct(";");
      return {
        type: "ControlsPosition",
        position: position ?? { type: "Name", value: "bottom-right", kind: "identifier", span: spanFrom(start, this.previous()) },
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("showPlayPause")) {
      const start = this.consumeKeyword("showPlayPause");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "ControlsShowPlayPause",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("showPrevNext")) {
      const start = this.consumeKeyword("showPrevNext");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "ControlsShowPrevNext",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("showZoomControls")) {
      const start = this.consumeKeyword("showZoomControls");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "ControlsShowZoomControls",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("showStepIndicator")) {
      const start = this.consumeKeyword("showStepIndicator");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "ControlsShowStepIndicator",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("autoHide")) {
      const start = this.consumeKeyword("autoHide");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "ControlsAutoHide",
        value,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("offset")) {
      const start = this.consumeKeyword("offset");
      this.consumePunct(":");
      const offset = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "ControlsOffset",
        offset,
        span: spanFrom(start, this.previous())
      };
    }
    return null;
  }
  parsePerformanceDecl() {
    const start = this.consumeKeyword("performance");
    if (!start) {
      return null;
    }
    const options = this.parseObjectExpr();
    this.consumePunct(";");
    return {
      type: "PerformanceDecl",
      options,
      span: spanFrom(start, this.previous())
    };
  }
  parseSelectorsDecl() {
    const start = this.consumeKeyword("selectors");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseSelectorsItem());
    return {
      type: "SelectorsDecl",
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseSelectorsItem() {
    if (this.matchKeyword("strategy")) {
      const start = this.consumeKeyword("strategy");
      this.consumePunct(":");
      const strategyToken = this.consume("keyword");
      const strategy = strategyToken?.value ?? "css";
      this.consumePunct(";");
      return {
        type: "SelectorsStrategy",
        strategy,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("fallback")) {
      const start = this.consumeKeyword("fallback");
      this.consumePunct(":");
      const fallback = this.parseArrayExpr();
      this.consumePunct(";");
      return {
        type: "SelectorsFallback",
        fallback,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("node")) {
      const start = this.consumeKeyword("node");
      this.consumePunct(":");
      const spec = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "SelectorsNode",
        spec,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("edge")) {
      const start = this.consumeKeyword("edge");
      this.consumePunct(":");
      const spec = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "SelectorsEdge",
        spec,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("subgraph")) {
      const start = this.consumeKeyword("subgraph");
      this.consumePunct(":");
      const spec = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "SelectorsSubgraph",
        spec,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("meta")) {
      return this.parseMetaDecl();
    }
    return null;
  }
  parseStylesDecl() {
    const start = this.consumeKeyword("styles");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseStylesItem());
    return {
      type: "StylesDecl",
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseStylesItem() {
    if (this.matchKeyword("classes")) {
      const start = this.consumeKeyword("classes");
      this.consumePunct(":");
      const classes = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "StylesClasses",
        classes,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("spotlight")) {
      const start = this.consumeKeyword("spotlight");
      this.consumePunct(":");
      const spotlight = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "StylesSpotlight",
        spotlight,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("theme")) {
      const start = this.consumeKeyword("theme");
      this.consumePunct(":");
      const theme = this.parseName();
      this.consumePunct(";");
      return {
        type: "StylesTheme",
        theme,
        span: spanFrom(start, this.previous())
      };
    }
    if (this.matchKeyword("meta")) {
      return this.parseMetaDecl();
    }
    return null;
  }
  parseSceneDecl() {
    const start = this.consumeKeyword("scene");
    if (!start) {
      return null;
    }
    const name = this.parseName();
    let diagram;
    if (this.matchKeyword("diagram")) {
      this.consumeKeyword("diagram");
      diagram = this.parseName();
    }
    const { items, end } = this.parseBlock(() => this.parseSceneItem());
    return {
      type: "SceneDecl",
      name,
      diagram,
      items: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseSceneItem() {
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "step":
          return this.parseStepDecl();
        case "binding":
          return this.parseBindingDecl();
        case "meta":
          return this.parseMetaDecl();
        case "let":
          return this.parseConstDecl();
        default:
          break;
      }
    }
    return null;
  }
  parseStepDecl() {
    const start = this.consumeKeyword("step");
    if (!start) {
      return null;
    }
    const name = this.parseName();
    let alias;
    if (this.matchKeyword("as")) {
      this.consumeKeyword("as");
      const ident = this.consume("identifier");
      alias = ident?.value;
    }
    const { items, end } = this.parseBlock(() => this.parseStepStmt());
    return {
      type: "StepDecl",
      name,
      alias,
      statements: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseStepStmt() {
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "focus":
          return this.parseFocusStmt();
        case "do":
          return this.parseDoStmt();
        case "let":
          return this.parseLetStmt();
        case "assert":
          return this.parseAssertStmt();
        case "meta":
          return this.parseMetaDecl();
        default:
          break;
      }
    }
    if (token.type === "identifier" || token.type === "keyword") {
      if (token.type === "keyword" && (token.value === "focus" || token.value === "let" || token.value === "assert" || token.value === "meta")) {
        return null;
      }
      const action = this.parseActionCall();
      if (action) {
        return {
          type: "DoStmt",
          action,
          span: action.span
        };
      }
    }
    return null;
  }
  parseFocusStmt() {
    const start = this.consumeKeyword("focus");
    if (!start) {
      return null;
    }
    const target = this.parseTargetExpr();
    const options = {};
    while (true) {
      if (this.matchKeyword("pad")) {
        this.consumeKeyword("pad");
        const value = this.parseNumber();
        options.pad = value;
        continue;
      }
      if (this.matchKeyword("align")) {
        this.consumeKeyword("align");
        const alignToken = this.consume("keyword");
        options.align = alignToken?.value ?? "center";
        continue;
      }
      if (this.matchKeyword("lock")) {
        this.consumeKeyword("lock");
        const lockToken = this.consume("keyword");
        options.lock = lockToken?.value ?? "none";
        continue;
      }
      if (this.matchKeyword("id")) {
        this.consumeKeyword("id");
        const ident = this.consume("identifier");
        if (ident) {
          options.id = ident.value;
        }
        continue;
      }
      break;
    }
    this.consumePunct(";");
    return {
      type: "FocusStmt",
      target: target ?? this.emptyTarget(start),
      options,
      span: spanFrom(start, this.previous())
    };
  }
  parseDoStmt() {
    const start = this.consumeKeyword("do");
    if (!start) {
      return null;
    }
    const action = this.parseActionCall();
    this.consumePunct(";");
    return {
      type: "DoStmt",
      action: action ?? this.emptyAction(start),
      span: spanFrom(start, this.previous())
    };
  }
  parseLetStmt() {
    const start = this.consumeKeyword("let");
    if (!start) {
      return null;
    }
    const name = this.consume("identifier");
    this.consumePunct("=");
    const value = this.parseExpr();
    this.consumePunct(";");
    return {
      type: "LetStmt",
      name: name?.value ?? "",
      value: value ?? this.emptyLiteral(start),
      span: spanFrom(start, this.previous())
    };
  }
  parseAssertStmt() {
    const start = this.consumeKeyword("assert");
    if (!start) {
      return null;
    }
    const condition = this.parseExpr();
    let message;
    if (this.matchKeyword("else")) {
      this.consumeKeyword("else");
      const messageToken = this.consume("string");
      message = messageToken?.value;
    }
    this.consumePunct(";");
    return {
      type: "AssertStmt",
      condition: condition ?? this.emptyLiteral(start),
      message,
      span: spanFrom(start, this.previous())
    };
  }
  parseBindingDecl() {
    const start = this.consumeKeyword("binding");
    if (!start) {
      return null;
    }
    let name;
    if (this.peek().type === "identifier" || this.peek().type === "string") {
      name = this.parseName();
    }
    let priority;
    if (this.matchKeyword("priority")) {
      this.consumeKeyword("priority");
      const value = this.consume("int");
      priority = value ? Number(value.value) : void 0;
      this.consumePunct(";");
    }
    const { items, end } = this.parseBlock(() => this.parseBindingRule());
    return {
      type: "BindingDecl",
      name,
      priority,
      rules: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseBindingRule() {
    const start = this.consumeKeyword("on");
    if (!start) {
      return null;
    }
    const event = this.parseEventSpec();
    let target;
    if (this.matchKeyword("target")) {
      this.consumeKeyword("target");
      if (this.matchKeyword("any")) {
        this.consumeKeyword("any");
        target = "any";
      } else {
        target = this.parseTargetExpr() ?? void 0;
      }
    }
    let when;
    if (this.matchKeyword("when")) {
      this.consumeKeyword("when");
      when = this.parseExpr() ?? void 0;
    }
    const { items, end } = this.parseBlock(() => this.parseBindingStmt());
    return {
      type: "BindingRule",
      event: event ?? this.emptyEvent(start),
      target,
      when,
      statements: items.filter((item) => item !== null),
      span: spanFrom(start, end)
    };
  }
  parseBindingStmt() {
    if (this.matchKeyword("do")) {
      return this.parseDoStmt();
    }
    if (this.matchKeyword("let")) {
      return this.parseLetStmt();
    }
    if (this.matchKeyword("assert")) {
      return this.parseAssertStmt();
    }
    return null;
  }
  parseEventSpec() {
    const token = this.consume("keyword");
    if (!token) {
      return null;
    }
    if (token.value === "key") {
      const keyToken = this.consume("string");
      return {
        type: "EventSpec",
        kind: "key",
        value: keyToken?.value,
        span: spanFrom(token, this.previous())
      };
    }
    if (token.value === "timer") {
      const durationToken = this.consume("duration");
      return {
        type: "EventSpec",
        kind: "timer",
        value: durationToken ? parseDuration(durationToken.value) : void 0,
        span: spanFrom(token, this.previous())
      };
    }
    if (token.value === "custom") {
      const name = this.parseName();
      return {
        type: "EventSpec",
        kind: "custom",
        value: name.value,
        span: spanFrom(token, this.previous())
      };
    }
    return {
      type: "EventSpec",
      kind: token.value,
      span: spanFrom(token, token)
    };
  }
  parseActionCall() {
    const start = this.peek();
    const nameParts = [];
    const firstPart = this.consumeNamePart();
    if (!firstPart) {
      return null;
    }
    nameParts.push(firstPart.value);
    while (!this.isAtEnd()) {
      if (this.matchPunct(".")) {
        this.consumePunct(".");
        const part = this.consumeNamePart();
        if (part) {
          nameParts.push(part.value);
        }
        continue;
      }
      const token = this.peek();
      if (token.type === "identifier" || token.type === "keyword") {
        const nextToken = this.peekNext();
        if (nextToken.type === "punct" && nextToken.value === "(") {
          const part2 = this.consumeNamePart();
          if (part2) {
            nameParts.push(part2.value);
          }
          break;
        }
        const part = this.consumeNamePart();
        if (part) {
          nameParts.push(part.value);
        }
        continue;
      }
      break;
    }
    this.consumePunct("(");
    const args = [];
    if (!this.matchPunct(")")) {
      do {
        const arg = this.parseActionArg();
        if (arg) {
          args.push(arg);
        }
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct(")");
    return {
      type: "ActionCall",
      name: nameParts.join(" "),
      args,
      span: spanFrom(start, this.previous())
    };
  }
  parseActionArg() {
    const start = this.peek();
    const token = this.peek();
    if ((token.type === "identifier" || token.type === "keyword") && this.peekNext().type === "punct" && this.peekNext().value === ":") {
      const key = this.advance();
      this.consumePunct(":");
      const value2 = this.parseExpr();
      return {
        type: "ActionArg",
        key: key?.value,
        value: value2 ?? this.emptyLiteral(start),
        span: spanFrom(start, this.previous())
      };
    }
    const value = this.parseExpr();
    return {
      type: "ActionArg",
      value: value ?? this.emptyLiteral(start),
      span: spanFrom(start, this.previous())
    };
  }
  parseExpr() {
    return this.parseOrExpr();
  }
  parseOrExpr() {
    let expr = this.parseAndExpr();
    while (this.matchKeyword("or")) {
      const operator = this.consumeKeyword("or");
      const right = this.parseAndExpr();
      expr = {
        type: "BinaryExpr",
        operator: "or",
        left: expr ?? this.emptyLiteral(operator),
        right: right ?? this.emptyLiteral(operator),
        span: spanFrom(operator, this.previous())
      };
    }
    return expr;
  }
  parseAndExpr() {
    let expr = this.parseEqExpr();
    while (this.matchKeyword("and")) {
      const operator = this.consumeKeyword("and");
      const right = this.parseEqExpr();
      expr = {
        type: "BinaryExpr",
        operator: "and",
        left: expr ?? this.emptyLiteral(operator),
        right: right ?? this.emptyLiteral(operator),
        span: spanFrom(operator, this.previous())
      };
    }
    return expr;
  }
  parseEqExpr() {
    let expr = this.parseRelExpr();
    while (this.matchOperator("==") || this.matchOperator("!=")) {
      const op = this.consume("operator");
      const right = this.parseRelExpr();
      expr = {
        type: "BinaryExpr",
        operator: op.value,
        left: expr ?? this.emptyLiteral(op),
        right: right ?? this.emptyLiteral(op),
        span: spanFrom(op, this.previous())
      };
    }
    return expr;
  }
  parseRelExpr() {
    let expr = this.parseAddExpr();
    while (this.matchOperator("<") || this.matchOperator("<=") || this.matchOperator(">") || this.matchOperator(">=")) {
      const op = this.consume("operator");
      const right = this.parseAddExpr();
      expr = {
        type: "BinaryExpr",
        operator: op.value,
        left: expr ?? this.emptyLiteral(op),
        right: right ?? this.emptyLiteral(op),
        span: spanFrom(op, this.previous())
      };
    }
    return expr;
  }
  parseAddExpr() {
    let expr = this.parseMulExpr();
    while (this.matchOperator("+") || this.matchOperator("-")) {
      const op = this.consume("operator");
      const right = this.parseMulExpr();
      expr = {
        type: "BinaryExpr",
        operator: op.value,
        left: expr ?? this.emptyLiteral(op),
        right: right ?? this.emptyLiteral(op),
        span: spanFrom(op, this.previous())
      };
    }
    return expr;
  }
  parseMulExpr() {
    let expr = this.parseUnaryExpr();
    while (this.matchOperator("*") || this.matchOperator("/") || this.matchOperator("%")) {
      const op = this.consume("operator");
      const right = this.parseUnaryExpr();
      expr = {
        type: "BinaryExpr",
        operator: op.value,
        left: expr ?? this.emptyLiteral(op),
        right: right ?? this.emptyLiteral(op),
        span: spanFrom(op, this.previous())
      };
    }
    return expr;
  }
  parseUnaryExpr() {
    if (this.matchOperator("!") || this.matchOperator("-")) {
      const operator = this.consume("operator");
      const argument = this.parseUnaryExpr();
      return {
        type: "UnaryExpr",
        operator: operator.value,
        argument: argument ?? this.emptyLiteral(operator),
        span: spanFrom(operator, this.previous())
      };
    }
    return this.parsePrimaryExpr();
  }
  parsePrimaryExpr() {
    const token = this.peek();
    if (token.type === "number" || token.type === "int" || token.type === "duration" || token.type === "percent" || token.type === "boolean" || token.type === "null" || token.type === "string" || token.type === "color") {
      this.advance();
      return this.literalFromToken(token);
    }
    if (token.type === "punct" && token.value === "{") {
      return this.parseObjectExpr();
    }
    if (token.type === "punct" && token.value === "[") {
      return this.parseArrayExpr();
    }
    if (token.type === "punct" && token.value === "(") {
      const start = this.consumePunct("(");
      const expr = this.parseExpr();
      this.consumePunct(")");
      return expr ? { ...expr, span: spanFrom(start, this.previous()) } : null;
    }
    if (token.type === "punct" && token.value === "$") {
      return this.parseVarRef();
    }
    if (this.isTargetKeyword(token)) {
      return this.parseTargetExpr();
    }
    if (token.type === "identifier") {
      return this.parseCallExpr();
    }
    return null;
  }
  parseVarRef() {
    const start = this.consumePunct("$");
    const path = [];
    const root = this.consume("identifier");
    if (root) {
      path.push(root.value);
    }
    while (this.matchPunct(".")) {
      this.consumePunct(".");
      const segment = this.consume("identifier");
      if (segment) {
        path.push(segment.value);
      }
    }
    return {
      type: "VarRef",
      path,
      span: spanFrom(start, this.previous())
    };
  }
  parseCallExpr() {
    const start = this.peek();
    const name = this.consume("identifier");
    if (!name) {
      return null;
    }
    this.consumePunct("(");
    const args = [];
    if (!this.matchPunct(")")) {
      do {
        const arg = this.parseActionArg();
        if (arg) {
          args.push(arg);
        }
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct(")");
    return {
      type: "CallExpr",
      name: name.value,
      args,
      span: spanFrom(start, this.previous())
    };
  }
  parseObjectExpr() {
    const start = this.consumePunct("{");
    const entries = [];
    if (!this.matchPunct("}")) {
      do {
        const token = this.peek();
        const key = token.type === "identifier" || token.type === "keyword" ? this.advance() : this.consume("string");
        if (!key) {
          break;
        }
        this.consumePunct(":");
        const value = this.parseExpr();
        const keyValue = key.type === "string" ? key.value.slice(1, -1) : key.value;
        entries.push({
          type: "ObjectEntry",
          key: keyValue,
          value: value ?? this.emptyLiteral(key),
          span: spanFrom(key, this.previous())
        });
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct("}");
    return {
      type: "ObjectExpr",
      entries,
      span: spanFrom(start, this.previous())
    };
  }
  parseArrayExpr() {
    const start = this.consumePunct("[");
    const items = [];
    if (!this.matchPunct("]")) {
      do {
        const value = this.parseExpr();
        if (value) {
          items.push(value);
        }
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct("]");
    return {
      type: "ArrayExpr",
      items,
      span: spanFrom(start, this.previous())
    };
  }
  parseTargetExpr() {
    const next = this.peek();
    if (!this.isTargetKeyword(next)) {
      this.error(next, "target expression");
      return null;
    }
    const token = this.consume("keyword");
    if (!token) {
      return null;
    }
    switch (token.value) {
      case "node":
        return this.parseTargetUnary(token, "TargetNode", () => this.parseNodeRef());
      case "edge":
        return this.parseTargetUnary(token, "TargetEdge", () => this.parseEdgeRef());
      case "subgraph":
        return this.parseTargetUnary(token, "TargetSubgraph", () => this.parseSubgraphRef());
      case "css":
        return this.parseTargetString(token, "TargetCss");
      case "id":
        return this.parseTargetString(token, "TargetId");
      case "text":
        return this.parseTargetString(token, "TargetText");
      case "group":
        return this.parseTargetList(token, "TargetGroup");
      case "union":
        return this.parseTargetList(token, "TargetUnion");
      case "intersect":
        return this.parseTargetList(token, "TargetIntersect");
      case "except":
        return this.parseTargetExcept(token);
      default:
        return null;
    }
  }
  parseTargetUnary(start, type, parser) {
    this.consumePunct("(");
    const ref = parser();
    this.consumePunct(")");
    return {
      type,
      ref,
      span: spanFrom(start, this.previous())
    };
  }
  parseTargetString(start, type) {
    this.consumePunct("(");
    const value = this.consume("string");
    this.consumePunct(")");
    const textValue = value?.value ?? "";
    if (type === "TargetCss") {
      return {
        type: "TargetCss",
        selector: textValue,
        span: spanFrom(start, this.previous())
      };
    }
    if (type === "TargetId") {
      return {
        type: "TargetId",
        id: textValue,
        span: spanFrom(start, this.previous())
      };
    }
    return {
      type: "TargetText",
      text: textValue,
      span: spanFrom(start, this.previous())
    };
  }
  parseTargetList(start, type) {
    this.consumePunct("(");
    const targets = [];
    if (!this.matchPunct(")")) {
      do {
        const target = this.parseTargetExpr();
        if (target) {
          targets.push(target);
        }
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct(")");
    const node = {
      type,
      targets,
      span: spanFrom(start, this.previous())
    };
    return node;
  }
  parseTargetExcept(start) {
    this.consumePunct("(");
    const left = this.parseTargetExpr();
    this.consumePunct(",");
    const right = this.parseTargetExpr();
    this.consumePunct(")");
    return {
      type: "TargetExcept",
      left: left ?? this.emptyTarget(start),
      right: right ?? this.emptyTarget(start),
      span: spanFrom(start, this.previous())
    };
  }
  parseNodeRef() {
    if (this.matchOperator("*")) {
      this.consume("operator");
      return "*";
    }
    if (this.peek().type === "string") {
      const str = this.consume("string");
      return this.makeName(str);
    }
    const ident = this.consume("identifier");
    return ident ? this.makeName(ident) : "*";
  }
  parseEdgeRef() {
    const firstToken = this.peek();
    const from = this.parseNodeRef();
    if (this.matchPunct(",")) {
      this.consumePunct(",");
      const to = this.parseNodeRef();
      return { from, to };
    }
    if (from === "*") {
      return {
        type: "Name",
        value: "*",
        kind: "identifier",
        span: spanFrom(firstToken, this.previous())
      };
    }
    return from;
  }
  parseSubgraphRef() {
    if (this.matchOperator("*")) {
      this.consume("operator");
      return "*";
    }
    if (this.peek().type === "string") {
      const str = this.consume("string");
      return this.makeName(str);
    }
    const ident = this.consume("identifier");
    return ident ? this.makeName(ident) : "*";
  }
  parseQualifiedName() {
    const parts = [];
    const first = this.consumeNamePart();
    if (first) {
      parts.push(first.value);
    }
    while (this.matchPunct(".")) {
      this.consumePunct(".");
      const next = this.consumeNamePart();
      if (next) {
        parts.push(next.value);
      }
    }
    return parts.join(".");
  }
  consumeNamePart() {
    const token = this.peek();
    if (token.type === "identifier" || token.type === "keyword") {
      return this.advance();
    }
    this.error(token, "identifier");
    return null;
  }
  parseName() {
    const token = this.peek();
    if (token.type === "string") {
      this.advance();
      return {
        type: "Name",
        value: token.value,
        kind: "string",
        span: spanFrom(token, token)
      };
    }
    const ident = this.consume("identifier");
    return {
      type: "Name",
      value: ident?.value ?? "",
      kind: "identifier",
      span: spanFrom(ident ?? token, this.previous())
    };
  }
  parseOptionalName() {
    const token = this.peek();
    if (token.type === "identifier" || token.type === "string") {
      return this.parseName();
    }
    return null;
  }
  parseNumber() {
    const token = this.consume("number") ?? this.consume("int");
    return token ? Number(token.value) : 0;
  }
  parseBoolean() {
    const token = this.consume("boolean");
    return token ? token.value === "true" : false;
  }
  parseVersion() {
    const start = this.consume("number") ?? this.consume("int");
    if (!start) {
      return null;
    }
    const parts = [start.value];
    while (this.matchPunct(".")) {
      this.consumePunct(".");
      const part = this.consume("number") ?? this.consume("int");
      if (!part) {
        break;
      }
      parts.push(part.value);
    }
    return { value: parts.join("."), end: this.previous() };
  }
  parseBlock(parser) {
    const items = [];
    const start = this.consumePunct("{");
    while (!this.isAtEnd() && !this.matchPunct("}")) {
      const item = parser();
      if (item) {
        items.push(item);
      } else {
        this.advance();
      }
    }
    const end = this.consumePunct("}") ?? this.previous();
    return { items, end: end ?? start };
  }
  literalFromToken(token) {
    const raw = token.value;
    if (token.type === "boolean") {
      return {
        type: "Literal",
        literalType: "boolean",
        value: token.value === "true",
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "null") {
      return {
        type: "Literal",
        literalType: "null",
        value: null,
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "string") {
      return {
        type: "Literal",
        literalType: "string",
        value: token.value,
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "color") {
      return {
        type: "Literal",
        literalType: "color",
        value: token.value,
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "duration") {
      return {
        type: "Literal",
        literalType: "duration",
        value: parseDuration(token.value),
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "percent") {
      return {
        type: "Literal",
        literalType: "percent",
        value: Number(token.value.replace("%", "")),
        raw,
        span: spanFrom(token, token)
      };
    }
    return {
      type: "Literal",
      literalType: token.type === "int" ? "int" : "number",
      value: Number(token.value),
      raw,
      span: spanFrom(token, token)
    };
  }
  emptyLiteral(token) {
    return {
      type: "Literal",
      literalType: "null",
      value: null,
      raw: "null",
      span: spanFrom(token, token)
    };
  }
  emptyTarget(token) {
    return {
      type: "TargetNode",
      ref: "*",
      span: spanFrom(token, token)
    };
  }
  emptyAction(token) {
    return {
      type: "ActionCall",
      name: "",
      args: [],
      span: spanFrom(token, token)
    };
  }
  emptyEvent(token) {
    return {
      type: "EventSpec",
      kind: "click",
      span: spanFrom(token, token)
    };
  }
  makeName(token) {
    return {
      type: "Name",
      value: token.value,
      kind: token.type === "string" ? "string" : "identifier",
      span: spanFrom(token, token)
    };
  }
  isTargetKeyword(token) {
    return token.type === "keyword" && ["node", "edge", "subgraph", "css", "id", "text", "group", "union", "intersect", "except"].includes(token.value);
  }
  matchKeyword(value) {
    const token = this.peek();
    return token.type === "keyword" && token.value === value;
  }
  matchOperator(value) {
    const token = this.peek();
    return token.type === "operator" && token.value === value;
  }
  matchPunct(value) {
    const token = this.peek();
    return token.type === "punct" && token.value === value;
  }
  consumeKeyword(value) {
    const token = this.peek();
    if (token.type === "keyword" && token.value === value) {
      return this.advance();
    }
    this.error(token, `keyword '${value}'`);
    return null;
  }
  consumePunct(value) {
    const token = this.peek();
    if (token.type === "punct" && token.value === value) {
      return this.advance();
    }
    this.error(token, `symbol '${value}'`);
    return null;
  }
  consume(type) {
    const token = this.peek();
    if (token.type === type) {
      return this.advance();
    }
    this.error(token, type);
    return null;
  }
  error(token, expected) {
    if (token.type === "eof") {
      this.diagnostics.push({
        message: `Unexpected end of input, expected ${expected}.`,
        severity: "error",
        span: spanFrom(token, token),
        code: "parse/unexpected-eof"
      });
      return;
    }
    this.diagnostics.push({
      message: `Unexpected '${token.image || token.value}', expected ${expected}.`,
      severity: "error",
      span: spanFrom(token, token),
      code: "parse/unexpected-token"
    });
  }
  advance() {
    if (!this.isAtEnd()) {
      this.index += 1;
    }
    return this.tokens[this.index - 1];
  }
  peek() {
    return this.tokens[this.index];
  }
  peekNext() {
    return this.tokens[this.index + 1];
  }
  previous() {
    return this.tokens[Math.max(0, this.index - 1)];
  }
  isAtEnd() {
    return this.peek().type === "eof";
  }
};
_MPDParser.KEYWORD_ITEM_PARSERS = {
  diagram: (parser) => parser.parseDiagramDecl(),
  runtime: (parser) => parser.parseRuntimeDecl(),
  selectors: (parser) => parser.parseSelectorsDecl(),
  styles: (parser) => parser.parseStylesDecl(),
  let: (parser) => parser.parseConstDecl(),
  scene: (parser) => parser.parseSceneDecl(),
  binding: (parser) => parser.parseBindingDecl(),
  use: (parser) => parser.parsePluginDecl(),
  meta: (parser) => parser.parseMetaDecl()
};
var MPDParser = _MPDParser;
function spanFrom(start, end) {
  return {
    start: start.start,
    end: end.end
  };
}
function parseDuration(value) {
  if (value.endsWith("ms")) {
    return Number(value.replace("ms", ""));
  }
  if (value.endsWith("s")) {
    return Number(value.replace("s", "")) * 1e3;
  }
  if (value.endsWith("m")) {
    return Number(value.replace("m", "")) * 6e4;
  }
  return Number(value);
}
function validateAST(ast) {
  const diagnostics = [];
  if (ast.version !== SUPPORTED_VERSION && ast.version !== "1") {
    diagnostics.push({
      message: `MPD version '${ast.version}' differs from supported version ${SUPPORTED_VERSION}.`,
      severity: "warning",
      span: ast.span,
      code: "validate/version-mismatch"
    });
  }
  for (const item of ast.body) {
    if (item.type === "SceneDecl") {
      const seen = /* @__PURE__ */ new Set();
      for (const stmt of item.items) {
        if (stmt.type === "StepDecl") {
          const name = stmt.name.value;
          if (seen.has(name)) {
            diagnostics.push({
              message: `Duplicate step name '${name}' in scene '${item.name.value}'.`,
              severity: "error",
              span: stmt.span,
              code: "validate/duplicate-step"
            });
          } else {
            seen.add(name);
          }
        }
      }
    }
    if (item.type === "UnknownBlock") {
      diagnostics.push({
        message: `Unknown block '${item.name}'.`,
        severity: "warning",
        span: item.span,
        code: "validate/unknown-block"
      });
    }
  }
  const visitExpr = (expr) => {
    switch (expr.type) {
      case "TargetEdge": {
        const ref = expr.ref;
        if (typeof ref === "object" && (ref.from === "*" || ref.to === "*")) {
          diagnostics.push({
            message: "Edge target cannot use '*' in edge tuple.",
            severity: "error",
            span: expr.span,
            code: "validate/malformed-target"
          });
        }
        break;
      }
      case "TargetCss":
      case "TargetId":
      case "TargetText": {
        const value = expr.selector ?? expr.id ?? expr.text ?? "";
        if (!value) {
          diagnostics.push({
            message: "Target string cannot be empty.",
            severity: "error",
            span: expr.span,
            code: "validate/malformed-target"
          });
        }
        break;
      }
      case "TargetGroup":
      case "TargetUnion":
      case "TargetIntersect":
        expr.targets.forEach(visitExpr);
        break;
      case "TargetExcept":
        visitExpr(expr.left);
        visitExpr(expr.right);
        break;
      case "BinaryExpr":
        visitExpr(expr.left);
        visitExpr(expr.right);
        break;
      case "UnaryExpr":
        visitExpr(expr.argument);
        break;
      case "ObjectExpr":
        expr.entries.forEach((entry) => visitExpr(entry.value));
        break;
      case "ArrayExpr":
        expr.items.forEach(visitExpr);
        break;
      case "CallExpr":
        expr.args.forEach((arg) => visitExpr(arg.value));
        break;
      case "Literal":
      case "VarRef":
      case "TargetNode":
      case "TargetSubgraph":
        break;
      default:
        break;
    }
  };
  const visitNode = (node) => {
    if (!node || typeof node !== "object") {
      return;
    }
    const typed = node;
    switch (typed.type) {
      case "StepDecl": {
        const step = node;
        step.statements.forEach(visitNode);
        break;
      }
      case "SceneDecl": {
        const scene = node;
        scene.items.forEach(visitNode);
        break;
      }
      case "FocusStmt":
        visitExpr(node.target);
        break;
      case "LetStmt":
        visitExpr(node.value);
        break;
      case "AssertStmt":
        visitExpr(node.condition);
        break;
      case "DoStmt":
        node.action.args.forEach((arg) => visitExpr(arg.value));
        break;
      case "BindingDecl":
        node.rules.forEach(visitNode);
        break;
      case "BindingRule": {
        const rule = node;
        if (rule.when) {
          visitExpr(rule.when);
        }
        rule.statements.forEach(visitNode);
        break;
      }
      case "ConstDecl":
        visitExpr(node.value);
        break;
      case "MetaDecl":
        node.entries.forEach((entry) => visitExpr(entry.value));
        break;
      default:
        break;
    }
  };
  ast.body.forEach(visitNode);
  return diagnostics;
}

// src/diagnostics.ts
function formatDiagnostics(diagnostics) {
  if (!diagnostics.length) {
    return "No diagnostics.";
  }
  return diagnostics.map((diag) => {
    const location = diag.span ? `(${diag.span.start.line}:${diag.span.start.column})` : "";
    const code = diag.code ? ` [${diag.code}]` : "";
    return `${diag.severity.toUpperCase()}: ${diag.message} ${location}${code}`.trim();
  }).join("\n");
}

// src/index.ts
var resolveAst = (options) => {
  if (options.ast) {
    return options.ast;
  }
  if (options.mpdText && options.options?.parseMpd) {
    return options.options.parseMpd(options.mpdText);
  }
  throw new MPFError(
    "presentMermaid requires ast or mpdText with parseMpd",
    "MPF_INVALID_PRESENT_OPTIONS",
    {
      hasAst: !!options.ast,
      hasMpdText: !!options.mpdText,
      hasParseMpd: !!options.options?.parseMpd
    }
  );
};
var presentMermaid = async (options) => {
  const ast = resolveAst(options);
  const diagramAdapter = options.options?.diagram ?? createMermaidDiagramAdapter();
  const diagram = await diagramAdapter.render({
    mountEl: options.mountEl,
    mermaidText: options.mermaidText
  });
  const camera = options.options?.camera ?? createBasicCameraHandle(diagram);
  const overlay = options.options?.overlay ?? createBasicOverlayHandle();
  const controller = new MermaidController({
    diagram,
    camera,
    overlay,
    ast,
    actionHandlers: options.options?.actionHandlers,
    errorPolicy: options.options?.errorPolicy ?? "haltOnError",
    hooks: options.options?.hooks
  });
  await controller.init({ diagram });
  if (options.options?.controls) {
    options.options.controls.updateState(controller.getState());
  }
  return controller;
};
function validateMPD(mpdText) {
  const result = parseMPD(mpdText);
  const errors = result.diagnostics.filter((d) => d.severity === "error");
  const warnings = result.diagnostics.filter((d) => d.severity === "warning");
  const valid = result.ast !== null && errors.length === 0;
  return {
    valid,
    ast: result.ast,
    errors,
    warnings
  };
}
var src_default = presentMermaid;
export {
  ActionError,
  MPFError,
  ParseError,
  createBasicCameraHandle,
  createBasicOverlayHandle,
  createFloatingControls,
  createMermaidDiagramAdapter,
  createMockCameraHandle,
  createMockDiagramHandle,
  createMockOverlayHandle,
  src_default as default,
  formatDiagnostics,
  parseMPD,
  presentMermaid,
  validateMPD
};
