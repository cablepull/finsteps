import { FlowchartStrategy } from "./adapters/strategies/flowchartStrategy.js";
const escapeSelector = (value) => {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
};
export const resolveTarget = (diagram, target) => {
    if (!target) {
        return null;
    }
    if (target.element) {
        return target.element;
    }
    const root = diagram.getRoot();
    let element = null;
    if (target.selector) {
        // Try diagram root first (for elements inside SVG/diagram)
        element = root.querySelector(target.selector);
        // If not found and we have a selector, also try document (for elements outside diagram, like buttons)
        if (!element && typeof document !== 'undefined') {
            element = document.querySelector(target.selector);
        }
    }
    else if (target.id) {
        element = root.querySelector(`#${escapeSelector(target.id)}`);
    }
    else if (target.dataId) {
        // Use strategy to get target selectors, or fall back to default flowchart selectors
        const strategy = diagram.getStrategy?.() || new FlowchartStrategy();
        const selectors = strategy.getTargetSelectors(target.dataId);
        // Try each selector in order until one matches
        for (const selector of selectors) {
            element = root.querySelector(selector);
            if (element) {
                break;
            }
        }
        // If not found and we're looking for a data-id, check if the root element itself has the data-id
        // (querySelector doesn't include the element itself, only descendants)
        if (!element && root instanceof Element && root.getAttribute('data-id') === target.dataId) {
            element = root;
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
        let current = element;
        while (current) {
            const parentEl = current.parentElement;
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
                    const parentParent = parentEl.parentElement;
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
        const elementParent = element.parentElement;
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
//# sourceMappingURL=targetResolver.js.map