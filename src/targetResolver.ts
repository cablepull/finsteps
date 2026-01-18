import { DiagramHandle, TargetDescriptor } from "./types.js";

const escapeSelector = (value: string): string => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
};

export const resolveTarget = (
  diagram: DiagramHandle,
  target?: TargetDescriptor
): Element | null => {
  if (!target) {
    return null;
  }
  if (target.element) {
    return target.element;
  }
  const root = diagram.getRoot();
  let element: Element | null = null;
  
  if (target.selector) {
    element = root.querySelector(target.selector);
  } else if (target.id) {
    element = root.querySelector(`#${escapeSelector(target.id)}`);
  } else if (target.dataId) {
    // First, try to find a node group with the data-id (preferred)
    element = root.querySelector(`g.node[data-id="${escapeSelector(target.dataId)}"]`);
    // If not found, fall back to any element with the data-id
    if (!element) {
      element = root.querySelector(`[data-id="${escapeSelector(target.dataId)}"]`);
    }
  }
  
  if (!element) {
    return null;
  }
  
  // If element is not an SVGGraphicsElement OR if it's a text/label element,
  // find the parent node group
  // Mermaid puts data-id on node groups, but sometimes child elements (like text labels)
  // might also have the data-id set, so we need to find the actual node group
  if (!(element instanceof SVGGraphicsElement) || 
      element.tagName === "text" || 
      (element instanceof SVGElement && ((typeof element.className === 'string' && element.className.includes('flowchart-label')) || (typeof element.className !== 'string' && element.className.baseVal.includes('flowchart-label'))))) {
    let current: Element | null = element;
    while (current) {
      const parentEl: Element | null = current.parentElement;
      if (!parentEl || parentEl === root) {
        break;
      }
      if (parentEl instanceof SVGGraphicsElement) {
        // Prefer groups with class "node" (Mermaid node groups)
        // IMPORTANT: We want the specific node group, not the root group
        // Mermaid structure: <svg> -> <g> (root group) -> <g class="node"> (individual nodes)
        if (parentEl.tagName === "g") {
          const parentClassName = parentEl instanceof SVGElement ? (typeof parentEl.className === 'string' ? parentEl.className : parentEl.className.baseVal) : '';
          if (parentClassName.includes("node") && parentEl !== root && parentEl.getAttribute('data-id') === target?.dataId) {
            // Found the node group with matching data-id
            return parentEl;
          }
          // If this is the root group (first child of svg), don't return it
          const parentParent: Element | null = parentEl.parentElement;
          if (parentParent === root || (parentParent && parentParent.tagName === "svg")) {
            // This is likely the root group, continue searching
            current = parentEl;
            continue;
          }
        }
        // If we've reached the SVG root, return the parent we found
        if (parentEl === root) {
          break;
        }
      }
      current = parentEl;
    }
    // If we didn't find a node group but found a graphics element, return that
    if (current instanceof SVGGraphicsElement && current !== root) {
      const currentParent = current.parentElement;
      if (currentParent && currentParent.tagName !== "svg") {
        return current;
      }
    }
  }
  
  // If we have a graphics element that's not a node group but has data-id,
  // check if its parent is a node group with matching data-id
  if (element instanceof SVGGraphicsElement && element.tagName !== "g") {
    const parent = element.parentElement;
    if (parent instanceof SVGGraphicsElement && parent.tagName === "g") {
      const parentClassName = parent instanceof SVGElement ? (typeof parent.className === 'string' ? parent.className : parent.className.baseVal) : '';
      if (parentClassName.includes("node") && parent.getAttribute('data-id') === target?.dataId) {
        return parent;
      }
    }
  }
  
  // Final check: if the element is a group but might be the root group,
  // ensure it's not the first child of svg (which would be the root group)
  if (element instanceof SVGGraphicsElement && element.tagName === "g") {
    const elementParent: Element | null = element.parentElement;
    if (elementParent === root || (elementParent && elementParent.tagName === "svg")) {
      // This might be the root group - check if it has the specific data-id we're looking for
      const elementDataId = element.getAttribute('data-id');
      const elementClassName = element instanceof SVGElement ? (typeof element.className === 'string' ? element.className : element.className.baseVal) : '';
      if (elementDataId !== target?.dataId || !elementClassName.includes("node")) {
        // This is likely the root group, search for the actual node within it
        const escapedDataId = target?.dataId ? escapeSelector(target.dataId) : '';
        const nodeGroup = root.querySelector(`g.node[data-id="${escapedDataId}"]`);
        if (nodeGroup instanceof SVGGraphicsElement) {
          return nodeGroup;
        }
      }
    }
  }
  
  return element;
};
