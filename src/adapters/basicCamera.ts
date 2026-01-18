import { CameraHandle, DiagramHandle } from "../types.js";

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
function findAdjacentNodes(targetNode: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[] {
  const targetDataId = targetNode.getAttribute('data-id');
  if (!targetDataId) return [];
  
  // Get target node's bounding box (in local coordinates, we'll need to account for transform)
  let targetBbox: DOMRect;
  try {
    const bboxLocal = targetNode.getBBox();
    const transform = targetNode.getAttribute('transform');
    
    // Apply transform if present
    if (transform && transform.includes('translate')) {
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
  
  // Calculate target node center for edge proximity checks
  const targetCenterX = targetBbox.x + targetBbox.width / 2;
  const targetCenterY = targetBbox.y + targetBbox.height / 2;
  
  // Find all edge paths in the SVG
  // Mermaid edges are typically path elements with class "edge" or inside g.edge
  const edgePaths = Array.from(svg.querySelectorAll<SVGPathElement>('path.edge, path[class*="edge"], g.edge path, path[id*="edge"]'));
  
  const adjacentNodes = new Set<SVGGraphicsElement>();
  
  // For each edge, check if it connects to the target node
  for (const edgePath of edgePaths) {
    try {
      const edgeBbox = edgePath.getBBox();
      const edgeCenterX = edgeBbox.x + edgeBbox.width / 2;
      const edgeCenterY = edgeBbox.y + edgeBbox.height / 2;
      
      // Check if edge is near the target node (within a reasonable distance)
      // Use a threshold based on node size
      const threshold = Math.max(targetBbox.width, targetBbox.height) * 1.5;
      const distanceToCenter = Math.sqrt(
        Math.pow(edgeCenterX - targetCenterX, 2) + Math.pow(edgeCenterY - targetCenterY, 2)
      );
      
      // Check if edge intersects target node bbox or is very close
      const edgeIntersectsTarget = 
        edgeBbox.x < targetBbox.x + targetBbox.width &&
        edgeBbox.x + edgeBbox.width > targetBbox.x &&
        edgeBbox.y < targetBbox.y + targetBbox.height &&
        edgeBbox.y + edgeBbox.height > targetBbox.y;
      
      // Also check if edge path data contains points near target node
      // This handles curved edges that might not intersect the bbox
      const pathData = edgePath.getAttribute('d');
      let pathNearTarget = false;
      if (pathData) {
        // Extract path points (simplified - just check M and L commands)
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
        // This edge connects to our target node, now find the other node it connects to
        // Find all other nodes and check if they're near the other end of this edge
        
        const allNodes = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g.node[data-id]'));
        
        for (const node of allNodes) {
          if (node === targetNode) continue;
          if (adjacentNodes.has(node)) continue; // Already found
          
          try {
            const nodeBboxLocal = node.getBBox();
            const nodeTransform = node.getAttribute('transform');
            
            let nodeBbox = nodeBboxLocal;
            if (nodeTransform && nodeTransform.includes('translate')) {
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
            
            // Check if this node is near the edge (indicating it's connected)
            const nodeNearEdge = 
              edgeBbox.x < nodeBbox.x + nodeBbox.width &&
              edgeBbox.x + edgeBbox.width > nodeBbox.x &&
              edgeBbox.y < nodeBbox.y + nodeBbox.height &&
              edgeBbox.y + edgeBbox.height > nodeBbox.y;
            
            const nodeDistanceToEdge = Math.sqrt(
              Math.pow(nodeCenterX - edgeCenterX, 2) + Math.pow(nodeCenterY - edgeCenterY, 2)
            );
            
            // Check if path points are near this node
            let pathNearNode = false;
            if (pathData) {
              const pathCommands = pathData.match(/[ML]\s*([-\d.]+)\s+([-\d.]+)/g);
              if (pathCommands) {
                for (const cmd of pathCommands) {
                const coords = cmd.match(/[ML]\s*([-\d.]+)\s+([-\d.]+)/);
                if (coords) {
                  const x = parseFloat(coords[1]);
                  const y = parseFloat(coords[2]);
                  const dist = Math.sqrt(Math.pow(x - nodeCenterX, 2) + Math.pow(y - nodeCenterY, 2));
                  const nodeThreshold = Math.max(nodeBbox.width, nodeBbox.height) * 1.5;
                  if (dist < nodeThreshold) {
                    pathNearNode = true;
                    break;
                  }
                }
              }
            }
            
            if (nodeNearEdge || pathNearNode || nodeDistanceToEdge < threshold) {
              adjacentNodes.add(node);
            }
            }
          } catch {
            // Skip if we can't process this node
            continue;
          }
        }
      }
    } catch {
      // Skip if we can't process this edge
      continue;
    }
  }
  
  return Array.from(adjacentNodes);
}

const calculateFullBoundingBox = (svg: SVGSVGElement, padding: number = 40): string | null => {
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

  // If root group didn't work, calculate from all top-level groups and shapes
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
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

    for (const el of topLevelElements) {
      try {
        const bbox = el.getBBox();
        // getBBox() returns coordinates in the SVG's local coordinate system
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      } catch {
        // Some elements might not have valid bboxes (e.g., empty groups, hidden elements)
        continue;
      }
    }
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    // Last resort: use the SVG's existing viewBox or dimensions
    const existingViewBox = getSvgViewBox(svg);
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
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2
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
  const originalViewBox = getSvgViewBox(svg);

  return {
    fit(target, options) {
      // #region agent log
      const viewBoxBeforeFit = svg.getAttribute("viewBox");
      const targetClassName = target instanceof SVGElement ? (typeof target.className === 'string' ? target.className : target.className.baseVal) : '';
      const targetInfo = {tagName:target.tagName,id:target.id,dataId:target.getAttribute('data-id'),className:targetClassName};
      const logFit1 = {location:'basicCamera.ts:103',message:'fit entry',data:{targetInfo,viewBoxBeforeFit,isSVGGraphics:target instanceof SVGGraphicsElement},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'};
      console.log('[DEBUG]', logFit1);
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit1)}).catch(()=>{});
      // #endregion
      if (!(target instanceof SVGGraphicsElement)) {
        return;
      }
      
      try {
        // getBBox() returns coordinates in SVG's local coordinate system (after transforms)
        // Get the current viewBox to understand the coordinate space
        const currentViewBoxStr = svg.getAttribute("viewBox");
        let currentViewBox: {x: number, y: number, width: number, height: number} | null = null;
        if (currentViewBoxStr) {
          const parts = currentViewBoxStr.split(" ").map(Number);
          if (parts.length === 4) {
            currentViewBox = {x: parts[0], y: parts[1], width: parts[2], height: parts[3]};
          }
        }
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
        
        // Find adjacent nodes and calculate union bounding box
        const adjacentNodes = findAdjacentNodes(target, svg);
        
        // Calculate union bounding box including adjacent nodes
        let unionBbox = bbox; // Start with target bbox
        
        // #region agent log
        const logAdjacent = {location:'basicCamera.ts:248',message:'finding adjacent nodes',data:{targetDataId:target.getAttribute('data-id'),adjacentCount:adjacentNodes.length,adjacentIds:adjacentNodes.map(n => n.getAttribute('data-id')).filter(Boolean)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
        console.log('[DEBUG]', logAdjacent);
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logAdjacent)}).catch(()=>{});
        // #endregion
        
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
        
        // Get screen coordinates for debugging
        const clientRect = target.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        
        // #region agent log
        const logFit2 = {
          location:'basicCamera.ts:116',
          message:'getBBox result',
          data:{
            bboxLocal:{x:bboxLocal.x,y:bboxLocal.y,width:bboxLocal.width,height:bboxLocal.height},
            bboxTransformed:{x:bbox.x,y:bbox.y,width:bbox.width,height:bbox.height},
            isFinite:{x:isFinite(bbox.x),y:isFinite(bbox.y),w:isFinite(bbox.width),h:isFinite(bbox.height)},
            validSize:bbox.width>0&&bbox.height>0,
            currentViewBox,
            targetId:target.id,
            targetDataId:target.getAttribute('data-id'),
            targetClassName:target instanceof SVGElement ? (typeof target.className === 'string' ? target.className : target.className.baseVal) : '',
            transform,
            hasCTM:target instanceof SVGGraphicsElement && target.getCTM() !== null,
            clientRect:{x:clientRect.x,y:clientRect.y,width:clientRect.width,height:clientRect.height},
            svgRect:{x:svgRect.x,y:svgRect.y,width:svgRect.width,height:svgRect.height}
          },
          timestamp:Date.now(),
          sessionId:'debug-session',
          runId:'run1',
          hypothesisId:'B'
        };
        console.log('[DEBUG]', logFit2);
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit2)}).catch(()=>{});
        // #endregion
        
        // Ensure we have valid dimensions
        if (!isFinite(bbox.width) || !isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) {
          // #region agent log
          const logFit4 = {location:'basicCamera.ts:114',message:'bbox invalid trying parent',data:{bbox:{x:bbox.x,y:bbox.y,width:bbox.width,height:bbox.height}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
          console.log('[DEBUG]', logFit4);
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit4)}).catch(()=>{});
          // #endregion
          // If bbox is invalid, try to get it from the parent group
          const parent = target.parentElement;
          if (parent instanceof SVGGraphicsElement) {
            const parentBBox = parent.getBBox();
            // #region agent log
            const logFit5 = {location:'basicCamera.ts:118',message:'parent bbox',data:{parentBBox:{x:parentBBox.x,y:parentBBox.y,width:parentBBox.width,height:parentBBox.height},valid:isFinite(parentBBox.width)&&isFinite(parentBBox.height)&&parentBBox.width>0&&parentBBox.height>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
            console.log('[DEBUG]', logFit5);
            fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit5)}).catch(()=>{});
            // #endregion
            if (isFinite(parentBBox.width) && isFinite(parentBBox.height) && parentBBox.width > 0 && parentBBox.height > 0) {
              const viewBox = {
                x: parentBBox.x - padding,
                y: parentBBox.y - padding,
                width: parentBBox.width + padding * 2,
                height: parentBBox.height + padding * 2
              };
              svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
              // #region agent log
              const viewBoxAfterFit = svg.getAttribute("viewBox");
              const logFit6 = {location:'basicCamera.ts:127',message:'fit using parent exit',data:{viewBoxAfterFit,usedParent:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
              console.log('[DEBUG]', logFit6);
              fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit6)}).catch(()=>{});
              // #endregion
              return;
            }
          }
          // #region agent log
          const logFit7 = {location:'basicCamera.ts:130',message:'fit failed no valid bbox',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
          console.log('[DEBUG]', logFit7);
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit7)}).catch(()=>{});
          // #endregion
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
        
        const viewBox = {
          x: bbox.x - padding,
          y: bbox.y - padding,
          width: bbox.width + padding * 2,
          height: bbox.height + padding * 2
        };
        
        // #region agent log
        const logBBoxValidation = {
          location:'basicCamera.ts:180',
          message:'bbox validation',
          data:{
            bboxLocal:{x:bboxLocal.x,y:bboxLocal.y,width:bboxLocal.width,height:bboxLocal.height},
            bbox:{x:bbox.x,y:bbox.y,width:bbox.width,height:bbox.height},
            calculatedViewBox:viewBox,
            padding,
            rootGroupBBox:rootGroupBBox ? {x:rootGroupBBox.x,y:rootGroupBBox.y,width:rootGroupBBox.width,height:rootGroupBBox.height} : null,
            bboxWithinRoot:rootGroupBBox ? (bbox.x >= rootGroupBBox.x && bbox.y >= rootGroupBBox.y && bbox.x + bbox.width <= rootGroupBBox.x + rootGroupBBox.width && bbox.y + bbox.height <= rootGroupBBox.y + rootGroupBBox.height) : null,
            bboxFitsInViewBox:viewBox.x <= bbox.x && viewBox.y <= bbox.y && viewBox.x + viewBox.width >= bbox.x + bbox.width && viewBox.y + viewBox.height >= bbox.y + bbox.height
          },
          timestamp:Date.now(),
          sessionId:'debug-session',
          runId:'run1',
          hypothesisId:'B'
        };
        console.log('[DEBUG]', logBBoxValidation);
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logBBoxValidation)}).catch(()=>{});
        // #endregion
        
        const viewBoxString = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
        
        // Check if we should animate the transition
        const duration = options?.duration ?? 0; // 0 = instant (no animation)
        const easingName = options?.easing ?? "easeOut";
        
        if (duration <= 0) {
          // Instant transition (current behavior - backward compatible)
          svg.setAttribute("viewBox", viewBoxString);
          // #region agent log
          const viewBoxAfterFit = svg.getAttribute("viewBox");
        const container = svg.parentElement;
        
        // Verify the target is actually visible in the viewBox
        const targetInView = (() => {
          const viewBoxParts = viewBoxAfterFit?.split(" ").map(Number) || [];
          if (viewBoxParts.length !== 4) return null;
          const [vbX, vbY, vbW, vbH] = viewBoxParts;
          const targetRight = bbox.x + bbox.width;
          const targetBottom = bbox.y + bbox.height;
          return {
            targetX: bbox.x,
            targetY: bbox.y,
            targetRight,
            targetBottom,
            viewBoxX: vbX,
            viewBoxY: vbY,
            viewBoxRight: vbX + vbW,
            viewBoxBottom: vbY + vbH,
            targetVisible: bbox.x >= vbX && bbox.y >= vbY && targetRight <= vbX + vbW && targetBottom <= vbY + vbH,
            targetXInView: bbox.x >= vbX && bbox.x <= vbX + vbW,
            targetYInView: bbox.y >= vbY && bbox.y <= vbY + vbH,
          };
        })();
        
        const logFit3Immediate = {
          location:'basicCamera.ts:173',
          message:'fit exit immediate',
          data:{
            viewBoxAfterFit,
            calculatedViewBox:viewBox,
            viewBoxString,
            targetInView,
            svgWidth:svg.clientWidth,
            svgHeight:svg.clientHeight,
            svgWidthAttr:svg.getAttribute("width"),
            svgHeightAttr:svg.getAttribute("height"),
            svgPreserveAspectRatio:svg.getAttribute("preserveAspectRatio"),
            containerWidth:container?.clientWidth,
            containerHeight:container?.clientHeight,
            containerDisplay:container ? window.getComputedStyle(container).display : null,
            svgDisplay:window.getComputedStyle(svg).display
          },
          timestamp:Date.now(),
          sessionId:'debug-session',
          runId:'run1',
          hypothesisId:'B,D'
        };
        console.log('[DEBUG]', logFit3Immediate);
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit3Immediate)}).catch(()=>{});
        // #endregion
        // Also check after a delay
        setTimeout(() => {
          const viewBoxCheck = svg.getAttribute("viewBox");
          const logFit3Delayed = {
            location:'basicCamera.ts:200',
            message:'fit exit delayed',
            data:{
              viewBoxAfterFit,
              viewBoxCheck,
              calculatedViewBox:viewBox,
              viewBoxString,
              svgWidth:svg.clientWidth,
              svgHeight:svg.clientHeight,
              containerWidth:container?.clientWidth,
              containerHeight:container?.clientHeight
            },
            timestamp:Date.now(),
            sessionId:'debug-session',
            runId:'run1',
            hypothesisId:'D'
          };
          console.log('[DEBUG]', logFit3Delayed);
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit3Delayed)}).catch(()=>{});
        }, 300);
        } else {
          // Animated transition
          const startViewBox = parseViewBox(svg.getAttribute("viewBox"));
          const endViewBox = viewBox;
          const easing = getEasingFunction(easingName);
          
          // #region agent log
          const logAnimate = {location:'basicCamera.ts:603',message:'starting animation',data:{duration,easingName,startViewBox,endViewBox},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
          console.log('[DEBUG]', logAnimate);
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logAnimate)}).catch(()=>{});
          // #endregion
          
          return animateViewBox(svg, startViewBox, endViewBox, duration, easing);
        }
      } catch (error) {
        // getBBox() can fail if element is not in the DOM or not visible
        // #region agent log
        const logFit8 = {location:'basicCamera.ts:143',message:'fit error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
        console.log('[DEBUG]', logFit8);
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logFit8)}).catch(()=>{});
        // #endregion
        console.warn("Failed to get bounding box for camera.fit:", error);
      }
    },
    reset() {
      // #region agent log
      const viewBoxBeforeReset = svg.getAttribute("viewBox");
      const logReset1 = {location:'basicCamera.ts:145',message:'reset entry',data:{viewBoxBeforeReset,originalViewBox},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
      console.log('[DEBUG]', logReset1);
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logReset1)}).catch(()=>{});
      // #endregion
      // Calculate full bounding box to show entire diagram
      const fullViewBox = calculateFullBoundingBox(svg);
      // #region agent log
      const logReset2 = {location:'basicCamera.ts:147',message:'reset calculated',data:{fullViewBox,originalViewBox},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
      console.log('[DEBUG]', logReset2);
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logReset2)}).catch(()=>{});
      // #endregion
      if (fullViewBox) {
        svg.setAttribute("viewBox", fullViewBox);
      } else if (originalViewBox) {
        // Fallback to original if calculation fails
        svg.setAttribute("viewBox", originalViewBox);
      }
      // #region agent log
      const viewBoxAfterReset = svg.getAttribute("viewBox");
      const logReset3 = {location:'basicCamera.ts:154',message:'reset exit',data:{viewBoxAfterReset},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
      console.log('[DEBUG]', logReset3);
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logReset3)}).catch(()=>{});
      // #endregion
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

      const newX = currentViewBox.x - deltaX * scaleX;
      const newY = currentViewBox.y - deltaY * scaleY;

      svg.setAttribute("viewBox", `${newX} ${newY} ${currentViewBox.width} ${currentViewBox.height}`);
    },
    fitAll(padding: number = 40) {
      const fullViewBox = calculateFullBoundingBox(svg, padding);
      if (fullViewBox) {
        svg.setAttribute("viewBox", fullViewBox);
      }
    },
    destroy() {
      const fullViewBox = calculateFullBoundingBox(svg);
      if (fullViewBox) {
        svg.setAttribute("viewBox", fullViewBox);
      } else if (originalViewBox) {
        svg.setAttribute("viewBox", originalViewBox);
      }
    }
  };
};
