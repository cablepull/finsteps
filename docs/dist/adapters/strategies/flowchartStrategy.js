import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for flowchart diagrams
 * Handles node-based diagrams with edges connecting nodes
 */
export class FlowchartStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return 'flowchart';
    }
    getTargetableClasses() {
        return ['node'];
    }
    getTargetableTags() {
        return ['g'];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Patterns for flowchart node IDs
        const patterns = [
            /^[a-zA-Z0-9-]+-([A-Za-z0-9_]+)-\d+$/, // prefix-nodeId-digit
            /^[a-zA-Z0-9-]+-\d+-([A-Za-z0-9_]+)$/, // prefix-digit-nodeId
            /^node-([A-Za-z0-9_]+)$/, // node-nodeId
            /^flowchart-([A-Za-z0-9_]+)-/, // flowchart-nodeId- (partial match)
        ];
        // First pass: find all elements with ids and extract node ids
        for (const el of Array.from(svg.querySelectorAll("[id]"))) {
            const id = el.getAttribute("id");
            if (!id)
                continue;
            let nodeId = this.extractIdFromPatterns(id, patterns);
            if (nodeId && !nodeIdMap.has(nodeId)) {
                // Find the node group that contains this element
                let current = el;
                let nodeGroup = null;
                // Walk up the tree to find the node group
                while (current && current !== svg) {
                    if (current instanceof SVGElement && current.tagName === "g") {
                        const className = this.getElementClassName(current);
                        if (className && className.includes('node')) {
                            nodeGroup = current;
                            break;
                        }
                    }
                    current = current.parentElement;
                }
                // If we found a node group, use it
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
            `g.node[data-id="${escapedId}"]`,
            `g[class*="node"][data-id="${escapedId}"]`,
            `[data-id="${escapedId}"]`, // Fallback
        ];
    }
    findAdjacentElements(target, svg) {
        const targetDataId = target.getAttribute('data-id');
        if (!targetDataId)
            return [];
        // Get target node's bounding box (accounting for transform)
        let targetBbox;
        try {
            const bboxLocal = target.getBBox();
            const transform = target.getAttribute('transform');
            if (transform && transform.includes('translate')) {
                const translateMatch = transform.match(/translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/);
                if (translateMatch) {
                    const tx = parseFloat(translateMatch[1]);
                    const ty = parseFloat(translateMatch[2]);
                    targetBbox = new DOMRect(bboxLocal.x + tx, bboxLocal.y + ty, bboxLocal.width, bboxLocal.height);
                }
                else {
                    targetBbox = bboxLocal;
                }
            }
            else {
                targetBbox = bboxLocal;
            }
        }
        catch {
            return [];
        }
        const targetCenterX = targetBbox.x + targetBbox.width / 2;
        const targetCenterY = targetBbox.y + targetBbox.height / 2;
        // Find all edge paths
        const edgePaths = Array.from(svg.querySelectorAll('path.edge, path[class*="edge"], g.edge path, path[id*="edge"]'));
        const adjacentNodes = new Set();
        // For each edge, check if it connects to the target node
        for (const edgePath of edgePaths) {
            try {
                const edgeBbox = edgePath.getBBox();
                const edgeCenterX = edgeBbox.x + edgeBbox.width / 2;
                const edgeCenterY = edgeBbox.y + edgeBbox.height / 2;
                const threshold = Math.max(targetBbox.width, targetBbox.height) * 1.5;
                const distanceToCenter = Math.sqrt(Math.pow(edgeCenterX - targetCenterX, 2) + Math.pow(edgeCenterY - targetCenterY, 2));
                const edgeIntersectsTarget = edgeBbox.x < targetBbox.x + targetBbox.width &&
                    edgeBbox.x + edgeBbox.width > targetBbox.x &&
                    edgeBbox.y < targetBbox.y + targetBbox.height &&
                    edgeBbox.y + edgeBbox.height > targetBbox.y;
                const pathData = edgePath.getAttribute('d');
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
                    // This edge connects to our target node, find the other node
                    const allNodes = Array.from(svg.querySelectorAll('g.node[data-id]'));
                    for (const node of allNodes) {
                        if (node === target)
                            continue;
                        if (adjacentNodes.has(node))
                            continue;
                        try {
                            const nodeBboxLocal = node.getBBox();
                            const nodeTransform = node.getAttribute('transform');
                            let nodeBbox = nodeBboxLocal;
                            if (nodeTransform && nodeTransform.includes('translate')) {
                                const translateMatch = nodeTransform.match(/translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/);
                                if (translateMatch) {
                                    const tx = parseFloat(translateMatch[1]);
                                    const ty = parseFloat(translateMatch[2]);
                                    nodeBbox = new DOMRect(nodeBboxLocal.x + tx, nodeBboxLocal.y + ty, nodeBboxLocal.width, nodeBboxLocal.height);
                                }
                            }
                            const nodeCenterX = nodeBbox.x + nodeBbox.width / 2;
                            const nodeCenterY = nodeBbox.y + nodeBbox.height / 2;
                            // Check if this node is near the other end of the edge
                            const nodeDistanceToEdge = Math.sqrt(Math.pow(nodeCenterX - edgeCenterX, 2) + Math.pow(nodeCenterY - edgeCenterY, 2));
                            const nodeIntersectsEdge = nodeBbox.x < edgeBbox.x + edgeBbox.width &&
                                nodeBbox.x + nodeBbox.width > edgeBbox.x &&
                                nodeBbox.y < edgeBbox.y + edgeBbox.height &&
                                nodeBbox.y + nodeBbox.height > edgeBbox.y;
                            if (nodeIntersectsEdge || nodeDistanceToEdge < threshold) {
                                adjacentNodes.add(node);
                            }
                        }
                        catch {
                            // Skip nodes that can't be processed
                            continue;
                        }
                    }
                }
            }
            catch {
                // Skip edges that can't be processed
                continue;
            }
        }
        return Array.from(adjacentNodes);
    }
}
//# sourceMappingURL=flowchartStrategy.js.map