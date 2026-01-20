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
        // #region agent log
        const logDataEntry = { location: 'targetResolver.ts:35', message: 'resolving target by dataId', data: { dataId: target.dataId, diagramType: strategy.getDiagramType(), selectors: selectors }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' };
        const diagramType = strategy.getDiagramType();
        if (diagramType === 'c4Component' || (target.dataId && ['controller', 'service', 'repo', 'api', 'db'].includes(target.dataId))) {
            console.log('[TargetResolver]', logDataEntry.message, logDataEntry.data);
        }
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataEntry) }).catch(() => { });
        // #endregion
        // Try each selector in order until one matches
        for (const selector of selectors) {
            element = root.querySelector(selector);
            if (element) {
                // #region agent log
                const logDataFound = { location: 'targetResolver.ts:46', message: 'target found', data: { dataId: target.dataId, diagramType: diagramType, selector: selector, elementTag: element.tagName }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' };
                if (diagramType === 'c4Component' || (target.dataId && ['controller', 'service', 'repo', 'api', 'db'].includes(target.dataId))) {
                    console.log('[TargetResolver]', logDataFound.message, logDataFound.data);
                }
                fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFound) }).catch(() => { });
                // #endregion
                break;
            }
        }
        // If not found and we're looking for a data-id, check if the root element itself has the data-id
        // (querySelector doesn't include the element itself, only descendants)
        if (!element && root instanceof Element && root.getAttribute('data-id') === target.dataId) {
            element = root;
            // #region agent log
            const logDataFoundRoot = { location: 'targetResolver.ts:62', message: 'target found on root element', data: { dataId: target.dataId, diagramType: diagramType, elementTag: element.tagName }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' };
            if (diagramType === 'c4Component' || diagramType === 'c4Container' || diagramType === 'c4Context' || (target.dataId && ['controller', 'service', 'repo', 'api', 'db', 'webapp', 'web', 'user'].includes(target.dataId))) {
                console.log('[TargetResolver]', logDataFoundRoot.message, logDataFoundRoot.data);
                fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFoundRoot) }).catch(() => { });
            }
            // #endregion
        }
        // #region agent log
        if (!element) {
            const availableDataIds = Array.from(root.querySelectorAll('[data-id]')).map((el) => el.getAttribute('data-id')).filter((id) => id);
            const logDataNotFound = { location: 'targetResolver.ts:56', message: 'target NOT found', data: { dataId: target.dataId, diagramType: diagramType, selectors: selectors, availableDataIds: availableDataIds.slice(0, 20) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' };
            if (diagramType === 'c4Component' || (target.dataId && ['controller', 'service', 'repo', 'api', 'db'].includes(target.dataId))) {
                console.log('[TargetResolver]', logDataNotFound.message, logDataNotFound.data);
            }
            fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataNotFound) }).catch(() => { });
        }
        // #endregion
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