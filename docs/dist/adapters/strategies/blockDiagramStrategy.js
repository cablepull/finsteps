import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for block diagrams
 * Handles blocks and connections
 */
export class BlockDiagramStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return 'block';
    }
    getTargetableClasses() {
        return ['block', 'node', 'edge'];
    }
    getTargetableTags() {
        return ['g', 'rect', 'path'];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Patterns for block diagram IDs
        const patterns = [
            /^block-([A-Za-z0-9_]+)-\d+$/, // block-name-digit
            /^node-([A-Za-z0-9_]+)-\d+$/, // node-name-digit
            /^edge-([A-Za-z0-9_]+)-\d+$/, // edge-name-digit
            /^([A-Za-z0-9_]+)-\d+$/, // name-digit (fallback)
        ];
        // First pass: find all elements with ids and extract node ids
        for (const el of Array.from(svg.querySelectorAll("[id]"))) {
            const id = el.getAttribute("id");
            if (!id)
                continue;
            let nodeId = this.extractIdFromPatterns(id, patterns);
            if (nodeId && !nodeIdMap.has(nodeId)) {
                // Find the group that contains this element
                let current = el;
                let nodeGroup = null;
                // Walk up the tree to find the block/node group
                while (current && current !== svg) {
                    if (current instanceof SVGElement && current.tagName === "g") {
                        const className = this.getElementClassName(current);
                        if (className && (className.includes('block') || className.includes('node') || className.includes('edge'))) {
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
            `g.block[data-id="${escapedId}"]`,
            `g.node[data-id="${escapedId}"]`,
            `g.edge[data-id="${escapedId}"]`,
            `g[class*="block"][data-id="${escapedId}"]`,
            `g[class*="node"][data-id="${escapedId}"]`,
            `g[class*="edge"][data-id="${escapedId}"]`,
            `[data-id="${escapedId}"]`, // Fallback
        ];
    }
    findAdjacentElements(target, svg) {
        const targetDataId = target.getAttribute('data-id');
        if (!targetDataId)
            return [];
        const targetClassName = this.getElementClassName(target);
        // For blocks/nodes: find blocks connected by edges (similar to flowchart)
        if (targetClassName && (targetClassName.includes('block') || targetClassName.includes('node'))) {
            // Find all edge paths
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
                        const distanceToCenter = Math.sqrt(Math.pow(edgeCenterX - targetCenterX, 2) + Math.pow(edgeCenterY - targetCenterY, 2));
                        const edgeIntersectsTarget = edgeBbox.x < targetBbox.x + targetBbox.width &&
                            edgeBbox.x + edgeBbox.width > targetBbox.x &&
                            edgeBbox.y < targetBbox.y + targetBbox.height &&
                            edgeBbox.y + edgeBbox.height > targetBbox.y;
                        if (edgeIntersectsTarget || distanceToCenter < threshold) {
                            // This edge connects to our target block, find the other block
                            const allBlocks = Array.from(svg.querySelectorAll('g.block[data-id], g.node[data-id]'));
                            for (const block of allBlocks) {
                                if (block === target)
                                    continue;
                                if (connectedBlocks.includes(block))
                                    continue;
                                try {
                                    const blockBbox = block.getBBox();
                                    const blockCenterX = blockBbox.x + blockBbox.width / 2;
                                    const blockCenterY = blockBbox.y + blockBbox.height / 2;
                                    const blockDistanceToEdge = Math.sqrt(Math.pow(blockCenterX - edgeCenterX, 2) + Math.pow(blockCenterY - edgeCenterY, 2));
                                    const blockIntersectsEdge = edgeBbox.x < blockBbox.x + blockBbox.width &&
                                        edgeBbox.x + edgeBbox.width > blockBbox.x &&
                                        edgeBbox.y < blockBbox.y + blockBbox.height &&
                                        edgeBbox.y + edgeBbox.height > blockBbox.y;
                                    if (blockIntersectsEdge || blockDistanceToEdge < threshold) {
                                        connectedBlocks.push(block);
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
            return connectedBlocks;
        }
        return [];
    }
}
//# sourceMappingURL=blockDiagramStrategy.js.map