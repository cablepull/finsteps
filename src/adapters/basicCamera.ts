import { CameraHandle, DiagramHandle } from "../types.js";
import { DiagramStrategy } from "./diagramStrategies.js";
import { FlowchartStrategy } from "./strategies/flowchartStrategy.js";

/**
 * Easing function type
 */
type EasingFunction = (t: number) => number;

/**
 * Easing function implementations
 */
const easingFunctions: Record<string, EasingFunction> = {
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
  
  sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  
  expoIn: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoInOut: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  circIn: (t) => 1 - Math.sqrt(1 - t * t),
  circOut: (t) => Math.sqrt(1 - --t * t),
  circInOut: (t) => t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2,
  
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
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
};

function getEasingFunction(name: string): EasingFunction {
  return easingFunctions[name] || easingFunctions.easeOut; // Default to easeOut
}

const getSvgViewBox = (svg: SVGSVGElement): string | null => {
  const baseVal = svg.viewBox?.baseVal;
  if (baseVal && baseVal.width && baseVal.height) {
    return `${baseVal.x} ${baseVal.y} ${baseVal.width} ${baseVal.height}`;
  }
  return svg.getAttribute("viewBox");
};


/**
 * Finds nodes adjacent to the target node (parent and child nodes connected by edges)
 * @param targetNode - The target node element
 * @param svg - The root SVG element
 * @returns Array of adjacent node elements
 */
function findAdjacentNodes(targetNode: SVGGraphicsElement, svg: SVGSVGElement, strategy: DiagramStrategy): SVGGraphicsElement[] {
  return strategy.findAdjacentElements(targetNode, svg);
}

const calculateFullBoundingBox = (svg: SVGSVGElement, padding: number = 40): string | null => {
  // Check if there's a stored initial viewBox on the SVG (set by mermaidDiagram)
  const storedInitialViewBox = svg.getAttribute('data-initial-viewbox');
  
  // If we have a stored initial viewBox, prefer it for fitAll (it represents the full diagram)
  // This is especially important for sequence diagrams where root group bbox might only capture visible parts
  if (storedInitialViewBox) {
    return storedInitialViewBox;
  }
  
  // Try to get bounds from the root group first (Mermaid wraps everything in a g element)
  let rootGroup: SVGGElement | null = null;
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

  // If we have a root group, use its bbox (handles all transforms correctly)
  if (rootGroup) {
    try {
      const bbox = rootGroup.getBBox();
      minX = bbox.x;
      minY = bbox.y;
      maxX = bbox.x + bbox.width;
      maxY = bbox.y + bbox.height;
    } catch {
      // Fall through to individual element calculation
    }
  }

  // Check if root group bbox is valid and reasonable
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
  
  // Parse initial viewBox size if available (already checked above, but need size for comparison)
  let initialViewBoxSize = { width: 0, height: 0 };
  if (storedInitialViewBox) {
    const parts = storedInitialViewBox.split(" ").map(Number);
    if (parts.length === 4) {
      initialViewBoxSize = { width: parts[2], height: parts[3] };
    }
  }
  
  // For sequence diagrams and similar, the root group bbox might only capture visible parts
  // Use initial viewBox if available, otherwise calculate from all elements if root group bbox seems too small
  const shouldUseElementCalculation = !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY) || 
      calculatedWidth < 10 || calculatedHeight < 10 ||
      (existingViewBoxSize.width > 0 && calculatedWidth < existingViewBoxSize.width * 0.1) ||
      (initialViewBoxSize.width > 0 && calculatedWidth < initialViewBoxSize.width * 0.5);
  
  // If root group bbox is too small or invalid, try calculating from elements
  if (shouldUseElementCalculation) {
    
    // Find all top-level groups and graphical elements
    const topLevelElements: SVGGraphicsElement[] = [];
    for (const child of Array.from(svg.children)) {
      if (child instanceof SVGGraphicsElement) {
        topLevelElements.push(child);
      }
    }

    if (topLevelElements.length === 0) {
      // Fallback: query all elements
      topLevelElements.push(
        ...Array.from(svg.querySelectorAll<SVGGraphicsElement>("g, rect, circle, ellipse, line, polyline, polygon, path, text"))
      );
    }

    // Reset min/max for element-based calculation
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;

    for (const el of topLevelElements) {
      try {
        const bbox = el.getBBox();
        // getBBox() returns coordinates in the SVG's local coordinate system
        // Skip elements with invalid or zero-size bboxes
        if (isFinite(bbox.x) && isFinite(bbox.y) && isFinite(bbox.width) && isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
          minX = Math.min(minX, bbox.x);
          minY = Math.min(minY, bbox.y);
          maxX = Math.max(maxX, bbox.x + bbox.width);
          maxY = Math.max(maxY, bbox.y + bbox.height);
        }
      } catch {
        // Some elements might not have valid bboxes (e.g., empty groups, hidden elements)
        continue;
      }
    }
    
  }

  const finalWidth = maxX - minX;
  const finalHeight = maxY - minY;

  // If calculation failed or result is too small, use stored initial viewBox or existing viewBox
  // Also check if calculated size is significantly smaller than the initial viewBox (which represents full diagram)
  const isSignificantlySmallerThanInitial = initialViewBoxSize.width > 0 && finalWidth < initialViewBoxSize.width * 0.7;
  
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY) || 
      finalWidth < 10 || finalHeight < 10 ||
      (existingViewBoxSize.width > 0 && finalWidth < existingViewBoxSize.width * 0.1) ||
      isSignificantlySmallerThanInitial) {
    // First try: use stored initial viewBox (the original full diagram bounds)
    if (storedInitialViewBox && initialViewBoxSize.width > 0 && initialViewBoxSize.height > 0) {
      return storedInitialViewBox;
    }
    // Second try: use the SVG's existing viewBox
    if (existingViewBox) {
      return existingViewBox;
    }
    // If SVG has width/height attributes, use those
    const width = svg.getAttribute("width");
    const height = svg.getAttribute("height");
    if (width && height) {
      const w = parseFloat(width) || 1000;
      const h = parseFloat(height) || 1000;
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

function parseViewBox(viewBoxStr: string | null): {x: number, y: number, width: number, height: number} | null {
  if (!viewBoxStr) return null;
  const parts = viewBoxStr.split(" ").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

function animateViewBox(
  svg: SVGSVGElement,
  start: {x: number, y: number, width: number, height: number} | null,
  end: {x: number, y: number, width: number, height: number},
  duration: number,
  easing: EasingFunction
): Promise<void> {
  return new Promise((resolve) => {
    if (!start) {
      // If no start viewBox, set immediately
      svg.setAttribute("viewBox", `${end.x} ${end.y} ${end.width} ${end.height}`);
      resolve();
      return;
    }
    
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1); // Clamp to [0, 1]
      
      // Apply easing function
      const eased = easing(progress);
      
      // Interpolate viewBox values
      const currentViewBox = {
        x: start.x + (end.x - start.x) * eased,
        y: start.y + (end.y - start.y) * eased,
        width: start.width + (end.width - start.width) * eased,
        height: start.height + (end.height - start.height) * eased,
      };
      
      // Update viewBox
      svg.setAttribute(
        "viewBox",
        `${currentViewBox.x} ${currentViewBox.y} ${currentViewBox.width} ${currentViewBox.height}`
      );
      
      if (progress < 1) {
        // Continue animation
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        // Set final viewBox to ensure exact values
        svg.setAttribute("viewBox", `${end.x} ${end.y} ${end.width} ${end.height}`);
        resolve();
      }
    };
    
    requestAnimationFrame(animate);
  });
}

export const createBasicCameraHandle = (diagram: DiagramHandle): CameraHandle => {
  const svg = diagram.getRoot();
  let container = diagram.getContainer();
  const originalViewBox = getSvgViewBox(svg);
  
  // Setup drag-to-pan functionality
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  
  // Define pan function first so it can be referenced
  const pan = (deltaX: number, deltaY: number) => {
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

    // Calculate scale factor to adjust pan delta
    const svgWidth = svg.clientWidth || baseVal.width;
    const svgHeight = svg.clientHeight || baseVal.height;
    const scaleX = currentViewBox.width / svgWidth;
    const scaleY = currentViewBox.height / svgHeight;

    // When dragging the diagram (like grabbing and pulling):
    // - Drag right = pull diagram right = content on left moves into view = decrease viewBox.x
    // - Drag down = pull diagram down = content on top moves into view = decrease viewBox.y
    // The viewBox moves opposite to the drag direction
    const newX = currentViewBox.x - deltaX * scaleX;
    const newY = currentViewBox.y - deltaY * scaleY;

    svg.setAttribute("viewBox", `${newX} ${newY} ${currentViewBox.width} ${currentViewBox.height}`);
  };
  
  const handleMouseDown = (e: MouseEvent) => {
    // Only start dragging on left mouse button and if not clicking on interactive elements
    if (e.button !== 0) return;
    if ((e.target as Element)?.closest("button") || 
        (e.target as Element)?.closest(".nav-btn") || 
        (e.target as Element)?.closest(".dataid-chip") ||
        (e.target as Element)?.closest("a")) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
    e.preventDefault();
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Pan the camera
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
  
  // Initialize cursor style
  container.style.cursor = "grab";
  
  // Attach event listeners
  container.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  container.addEventListener("mouseleave", handleMouseLeave);

  return {
    fit(target, options) {
      if (!(target instanceof SVGGraphicsElement)) {
        return;
      }
      
      try {
        // getBBox() returns coordinates in SVG's local coordinate system (after transforms)
        // Get the current viewBox to understand the coordinate space
        const currentViewBoxStr = svg.getAttribute("viewBox");
        // getBBox() returns coordinates in the element's LOCAL coordinate space (before transforms)
        // If the element has a transform, we need to account for it to get the actual position in SVG user space
        // IMPORTANT: getCTM() includes viewBox scaling, so we need to use getScreenCTM() or parse transform attribute
        // Instead, we'll use getBBox() on a temporary group at the root level to get user-space coordinates
        const bboxLocal = target.getBBox();
        const transform = target instanceof SVGElement ? target.getAttribute('transform') : null;
        
        // Parse transform attribute to extract translate values (most common case)
        // This avoids the viewBox scaling issue with getCTM()
        let bbox = bboxLocal;
        if (transform && transform.includes('translate')) {
          try {
            // Parse translate( tx, ty ) - handle both comma and space separators
            const translateMatch = transform.match(/translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/);
            if (translateMatch) {
              const tx = parseFloat(translateMatch[1]);
              const ty = parseFloat(translateMatch[2]);
              
              // Apply translation to local bbox to get user-space coordinates
              // The bbox dimensions don't change with translation, only position
              bbox = new DOMRect(
                bboxLocal.x + tx,
                bboxLocal.y + ty,
                bboxLocal.width,
                bboxLocal.height
              );
            } else {
              // For other transform types, fall back to local bbox
              // Complex transforms would require full matrix parsing
            }
          } catch {
            // If transform parsing fails, fall back to local bbox
          }
        }
        
        const padding = options?.padding ?? 16;
        
        // Ensure minimum dimensions for line elements (they have width or height 0)
        // For horizontal lines, add a minimum height; for vertical lines, add a minimum width
        const minDimension = 40; // Minimum dimension for fitting line elements
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
        
        // Find adjacent nodes using the diagram strategy
        const strategy = diagram.getStrategy?.() || new FlowchartStrategy();
        const adjacentNodes = findAdjacentNodes(target, svg, strategy);
        
        // Calculate union bounding box including adjacent nodes
        let unionBbox = bbox; // Start with target bbox (already adjusted for min size)
        for (const adjacentNode of adjacentNodes) {
          try {
            const adjBboxLocal = adjacentNode.getBBox();
            const adjTransform = adjacentNode.getAttribute('transform');
            
            let adjBbox = adjBboxLocal;
            if (adjTransform && adjTransform.includes('translate')) {
              const translateMatch = adjTransform.match(/translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/);
              if (translateMatch) {
                const tx = parseFloat(translateMatch[1]);
                const ty = parseFloat(translateMatch[2]);
                adjBbox = new DOMRect(
                  adjBboxLocal.x + tx,
                  adjBboxLocal.y + ty,
                  adjBboxLocal.width,
                  adjBboxLocal.height
                );
              }
            }
            
            // Expand union bbox to include this adjacent node
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
            // Skip if we can't get bbox for this adjacent node
            continue;
          }
        }
        
        // Use union bbox instead of target bbox for viewBox calculation
        bbox = unionBbox;
        // Ensure we have valid dimensions
        if (!isFinite(bbox.width) || !isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) {
          // If bbox is invalid, try to get it from the parent group
          const parent = target.parentElement;
          if (parent instanceof SVGGraphicsElement) {
            const parentBBox = parent.getBBox();
            if (isFinite(parentBBox.width) && isFinite(parentBBox.height) && parentBBox.width > 0 && parentBBox.height > 0) {
              const viewBox = {
                x: parentBBox.x - padding,
                y: parentBBox.y - padding,
                width: parentBBox.width + padding * 2,
                height: parentBBox.height + padding * 2
              };
              svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
              return;
            }
          }
          return;
        }
        
        // Validate that bbox coordinates are reasonable
        // getBBox() returns coordinates in SVG's user coordinate space
        // But we need to ensure these coordinates will actually show content
        // If the bbox is very small or in an unexpected location, we might need to adjust
        
        // Get the root group's bbox to understand the coordinate space
        let rootGroupBBox: DOMRect | null = null;
        try {
          const rootGroup = Array.from(svg.children).find((child) => child instanceof SVGGElement) as SVGGElement | undefined;
          if (rootGroup) {
            rootGroupBBox = rootGroup.getBBox();
          }
        } catch {
          // Ignore errors
        }
        
        // For ER diagrams, elements might be positioned outside the root group's bbox
        // If the target bbox is outside the root group, we should still show it
        // But we need to ensure the viewBox includes both the root group and the target
        if (rootGroupBBox && (bbox.x < rootGroupBBox.x || bbox.y < rootGroupBBox.y || 
            bbox.x + bbox.width > rootGroupBBox.x + rootGroupBBox.width ||
            bbox.y + bbox.height > rootGroupBBox.y + rootGroupBBox.height)) {
          // Target is outside root group - expand union bbox to include both
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
        
        // Use unionBbox (which includes adjacent nodes) instead of just bbox
        const finalBbox = unionBbox;
        const viewBox = {
          x: finalBbox.x - padding,
          y: finalBbox.y - padding,
          width: finalBbox.width + padding * 2,
          height: finalBbox.height + padding * 2
        };
        
        const viewBoxString = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
        
        // Check if we should animate the transition
        const duration = options?.duration ?? 0; // 0 = instant (no animation)
        const easingName = options?.easing ?? "easeOut";
        
        if (duration <= 0) {
          // Instant transition (current behavior - backward compatible)
          svg.setAttribute("viewBox", viewBoxString);
        } else {
          // Animated transition
          const startViewBox = parseViewBox(svg.getAttribute("viewBox"));
          const endViewBox = viewBox;
          const easing = getEasingFunction(easingName);
          
          return animateViewBox(svg, startViewBox, endViewBox, duration, easing);
        }
      } catch (error) {
        // getBBox() can fail if element is not in the DOM or not visible
        console.warn("Failed to get bounding box for camera.fit:", error);
      }
    },
    reset() {
      // Calculate full bounding box to show entire diagram
      const fullViewBox = calculateFullBoundingBox(svg);
      if (fullViewBox) {
        svg.setAttribute("viewBox", fullViewBox);
      } else if (originalViewBox) {
        // Fallback to original if calculation fails
        svg.setAttribute("viewBox", originalViewBox);
      }
    },
    zoom(factor: number, center?: { x: number; y: number }) {
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
    pan(deltaX: number, deltaY: number) {
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

      // Calculate scale factor to adjust pan delta
      const svgWidth = svg.clientWidth || baseVal.width;
      const svgHeight = svg.clientHeight || baseVal.height;
      const scaleX = currentViewBox.width / svgWidth;
      const scaleY = currentViewBox.height / svgHeight;

      // To pan right (see content further right), increase viewBox x (viewBox x is the left edge of visible area)
      // To pan down (see content further down), increase viewBox y (viewBox y is the top edge of visible area)
      // Positive deltaX should pan right, positive deltaY should pan down
      const newX = currentViewBox.x + deltaX * scaleX;
      const newY = currentViewBox.y + deltaY * scaleY;

      svg.setAttribute("viewBox", `${newX} ${newY} ${currentViewBox.width} ${currentViewBox.height}`);
    },
    fitAll(padding: number = 40) {
      const fullViewBox = calculateFullBoundingBox(svg, padding);
      if (fullViewBox) {
        svg.setAttribute("viewBox", fullViewBox);
      }
    },
    destroy() {
      // Remove drag-to-pan event listeners
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
