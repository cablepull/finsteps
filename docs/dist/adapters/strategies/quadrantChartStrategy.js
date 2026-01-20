import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for quadrant charts
 * Handles quadrants and data points
 */
export class QuadrantChartStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return 'quadrantChart';
    }
    getTargetableClasses() {
        return ['quadrant', 'point', 'data'];
    }
    getTargetableTags() {
        return ['g', 'circle', 'rect', 'text'];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Patterns for quadrant chart IDs
        const patterns = [
            /^quadrant-([A-Za-z0-9_]+)-\d+$/, // quadrant-name-digit
            /^point-([A-Za-z0-9_]+)-\d+$/, // point-name-digit
            /^data-([A-Za-z0-9_]+)-\d+$/, // data-name-digit
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
                // Walk up the tree to find the quadrant/point group
                while (current && current !== svg) {
                    if (current instanceof SVGElement && current.tagName === "g") {
                        const className = this.getElementClassName(current);
                        if (className && (className.includes('quadrant') || className.includes('point') || className.includes('data'))) {
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
                else if (el.tagName === "circle" && this.hasTargetableClass(el)) {
                    // Data points are often circles
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
            `[data-id="${escapedId}"]`, // Fallback
        ];
    }
    findAdjacentElements(target, svg) {
        const targetDataId = target.getAttribute('data-id');
        if (!targetDataId)
            return [];
        const targetClassName = this.getElementClassName(target);
        // For data points: find points in the same quadrant
        if (targetClassName && (targetClassName.includes('point') || targetClassName.includes('data'))) {
            // Find which quadrant this point belongs to (by position)
            try {
                const targetBbox = target.getBBox();
                const targetCenterX = targetBbox.x + targetBbox.width / 2;
                const targetCenterY = targetBbox.y + targetBbox.height / 2;
                // Find all quadrants
                const allQuadrants = Array.from(svg.querySelectorAll('g[class*="quadrant"]'));
                for (const quadrant of allQuadrants) {
                    try {
                        const quadrantBbox = quadrant.getBBox();
                        if (targetCenterX >= quadrantBbox.x &&
                            targetCenterX <= quadrantBbox.x + quadrantBbox.width &&
                            targetCenterY >= quadrantBbox.y &&
                            targetCenterY <= quadrantBbox.y + quadrantBbox.height) {
                            // This point is in this quadrant, find other points in the same quadrant
                            const quadrantPoints = Array.from(quadrant.querySelectorAll('g[class*="point"][data-id], circle[class*="point"][data-id], g[class*="data"][data-id], circle[class*="data"][data-id]'));
                            return quadrantPoints.filter(p => p !== target);
                        }
                    }
                    catch {
                        continue;
                    }
                }
            }
            catch {
                // Fallback: return all points
                const allPoints = Array.from(svg.querySelectorAll('g[class*="point"][data-id], circle[class*="point"][data-id], g[class*="data"][data-id], circle[class*="data"][data-id]'));
                return allPoints.filter(p => p !== target);
            }
        }
        // For quadrants: find all points in this quadrant
        if (targetClassName && targetClassName.includes('quadrant')) {
            const quadrantPoints = Array.from(target.querySelectorAll('g[class*="point"][data-id], circle[class*="point"][data-id], g[class*="data"][data-id], circle[class*="data"][data-id]'));
            return quadrantPoints;
        }
        return [];
    }
}
//# sourceMappingURL=quadrantChartStrategy.js.map