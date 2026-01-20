import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for state diagrams (both v1 and v2)
 * Handles states, transitions, and nested states
 */
export class StateDiagramStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return 'stateDiagram';
    }
    getTargetableClasses() {
        return ['state', 'stateNode', 'transition', 'edge'];
    }
    getTargetableTags() {
        return ['g', 'rect', 'ellipse', 'path'];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Patterns for state diagram IDs - Mermaid v10 uses various formats
        const patterns = [
            /^stateDiagram-([A-Za-z0-9_]+)-\d+$/, // stateDiagram-name-digit (Mermaid v10)
            /^state-([A-Za-z0-9_]+)-\d+$/, // state-name-digit
            /^stateNode-([A-Za-z0-9_]+)-\d+$/, // stateNode-name-digit
            /^node-([A-Za-z0-9_]+)-\d+$/, // node-name-digit
            /^stateDiagram-([A-Za-z0-9_]+)$/, // stateDiagram-name (without digit)
            /^state-([A-Za-z0-9_]+)$/, // state-name (without digit)
            /^([A-Za-z0-9_]+)-\d+$/, // name-digit (fallback)
            /^([A-Za-z0-9_]+)$/, // name only (direct match for simple IDs)
        ];
        // Also try to find state nodes by class name and text content
        // Mermaid often uses class-based identification
        const stateGroupsNodes = svg.querySelectorAll('g[class*="state"], g[class*="node"]');
        for (let groupIdx = 0; groupIdx < stateGroupsNodes.length; groupIdx++) {
            const group = stateGroupsNodes[groupIdx];
            const className = this.getElementClassName(group);
            if (!className)
                continue;
            // Look for text elements within the group that contain the state name
            const textNodes = group.querySelectorAll('text');
            for (let textIdx = 0; textIdx < textNodes.length; textIdx++) {
                const textEl = textNodes[textIdx];
                const textContent = textEl.textContent?.trim();
                if (textContent && /^[A-Za-z][A-Za-z0-9_]*$/.test(textContent)) {
                    // Check if this looks like a state name (not a transition label)
                    let parentEl = group;
                    if (textEl.parentElement && textEl.parentElement instanceof SVGElement) {
                        parentEl = textEl.parentElement;
                    }
                    const parentClasses = this.getElementClassName(parentEl);
                    if (parentClasses && !parentClasses.includes('edgeLabel') && !parentClasses.includes('label')) {
                        if (!nodeIdMap.has(textContent)) {
                            nodeIdMap.set(textContent, group);
                        }
                    }
                }
            }
        }
        const allIds = [];
        // First pass: find all elements with ids and extract node ids
        for (const el of Array.from(svg.querySelectorAll("[id]"))) {
            const id = el.getAttribute("id");
            if (!id)
                continue;
            allIds.push(id);
            let nodeId = this.extractIdFromPatterns(id, patterns);
            if (nodeId && !nodeIdMap.has(nodeId)) {
                // Find the group that contains this element
                let current = el;
                let nodeGroup = null;
                // Walk up the tree to find the state/transition group
                while (current && current !== svg) {
                    if (current instanceof SVGElement && current.tagName === "g") {
                        const className = this.getElementClassName(current);
                        if (className && (className.includes('state') || className.includes('node') ||
                            className.includes('transition') || className.includes('edge'))) {
                            nodeGroup = current;
                            break;
                        }
                    }
                    current = current.parentElement;
                }
                // If we found a group, use it
                if (nodeGroup) {
                    nodeIdMap.set(nodeId, nodeGroup);
                }
                else if (el.tagName === "g" && this.hasTargetableClass(el)) {
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
            `[data-id="${escapedId}"]`, // Fallback
        ];
    }
    findAdjacentElements(target, svg) {
        const targetDataId = target.getAttribute('data-id');
        if (!targetDataId)
            return [];
        const targetClassName = this.getElementClassName(target);
        // For states: find states connected by transitions
        if (targetClassName && (targetClassName.includes('state') || targetClassName.includes('stateNode'))) {
            // Find all transition edges
            const allTransitions = Array.from(svg.querySelectorAll('g[class*="transition"][data-id], g[class*="edge"][data-id], path[class*="edge"]'));
            const connectedStates = [];
            try {
                const targetBbox = target.getBBox();
                for (const transition of allTransitions) {
                    try {
                        const transitionBbox = transition.getBBox();
                        // Check if transition intersects or is near this state
                        const intersects = transitionBbox.x < targetBbox.x + targetBbox.width &&
                            transitionBbox.x + transitionBbox.width > targetBbox.x &&
                            transitionBbox.y < targetBbox.y + targetBbox.height &&
                            transitionBbox.y + transitionBbox.height > targetBbox.y;
                        if (intersects) {
                            // Find the other state this transition connects to
                            const allStates = Array.from(svg.querySelectorAll('g[class*="state"][data-id], g[class*="stateNode"][data-id]'));
                            for (const state of allStates) {
                                if (state === target)
                                    continue;
                                if (connectedStates.includes(state))
                                    continue;
                                try {
                                    const stateBbox = state.getBBox();
                                    const stateIntersects = transitionBbox.x < stateBbox.x + stateBbox.width &&
                                        transitionBbox.x + transitionBbox.width > stateBbox.x &&
                                        transitionBbox.y < stateBbox.y + stateBbox.height &&
                                        transitionBbox.y + transitionBbox.height > stateBbox.y;
                                    if (stateIntersects) {
                                        connectedStates.push(state);
                                    }
                                }
                                catch {
                                    continue;
                                }
                            }
                        }
                    }
                    catch {
                        continue;
                    }
                }
            }
            catch {
                return [];
            }
            return connectedStates;
        }
        // For transitions: find the states they connect
        if (targetClassName && (targetClassName.includes('transition') || targetClassName.includes('edge'))) {
            const allStates = Array.from(svg.querySelectorAll('g[class*="state"][data-id], g[class*="stateNode"][data-id]'));
            const connectedStates = [];
            try {
                const transitionBbox = target.getBBox();
                for (const state of allStates) {
                    try {
                        const stateBbox = state.getBBox();
                        const intersects = transitionBbox.x < stateBbox.x + stateBbox.width &&
                            transitionBbox.x + transitionBbox.width > stateBbox.x &&
                            transitionBbox.y < stateBbox.y + stateBbox.height &&
                            transitionBbox.y + transitionBbox.height > stateBbox.y;
                        if (intersects) {
                            connectedStates.push(state);
                        }
                    }
                    catch {
                        continue;
                    }
                }
            }
            catch {
                return [];
            }
            return connectedStates;
        }
        return [];
    }
}
//# sourceMappingURL=stateDiagramStrategy.js.map