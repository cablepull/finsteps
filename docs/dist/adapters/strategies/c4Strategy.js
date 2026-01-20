import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for C4 diagrams (Context, Container, Component)
 * Handles C4 elements and relationships
 */
export class C4Strategy extends BaseDiagramStrategy {
    constructor(diagramType) {
        super();
        this.diagramType = diagramType;
    }
    getDiagramType() {
        return this.diagramType;
    }
    getTargetableClasses() {
        return ['c4', 'element', 'relationship', 'boundary'];
    }
    getTargetableTags() {
        return ['g', 'rect', 'path', 'text'];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Patterns for C4 diagram IDs - Mermaid C4 uses various ID formats
        const patterns = [
            /^c4-([A-Za-z0-9_]+)-\d+$/, // c4-name-digit
            /^element-([A-Za-z0-9_]+)-\d+$/, // element-name-digit
            /^relationship-([A-Za-z0-9_]+)-\d+$/, // relationship-name-digit
            /^boundary-([A-Za-z0-9_]+)-\d+$/, // boundary-name-digit
            /^([A-Za-z0-9_]+)-\d+$/, // name-digit (fallback)
            /^([A-Za-z0-9_]+)$/, // name only (direct match)
        ];
        // First pass: find all elements with ids and extract node ids
        const allIds = [];
        const allIdElements = Array.from(svg.querySelectorAll("[id]"));
        for (const el of allIdElements) {
            const id = el.getAttribute("id");
            if (!id)
                continue;
            allIds.push(id);
            let nodeId = this.extractIdFromPatterns(id, patterns);
            if (nodeId && !nodeIdMap.has(nodeId)) {
                // Find the group that contains this element
                let current = el;
                let nodeGroup = null;
                // Walk up the tree to find the c4/element/relationship/boundary group
                while (current && current !== svg) {
                    if (current instanceof SVGElement && current.tagName === "g") {
                        const className = this.getElementClassName(current);
                        if (className && (className.includes('c4') || className.includes('element') ||
                            className.includes('relationship') || className.includes('boundary'))) {
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
            `g.c4[data-id="${escapedId}"]`,
            `g.element[data-id="${escapedId}"]`,
            `g.relationship[data-id="${escapedId}"]`,
            `g.boundary[data-id="${escapedId}"]`,
            `g[class*="c4"][data-id="${escapedId}"]`,
            `g[class*="element"][data-id="${escapedId}"]`,
            `g[class*="relationship"][data-id="${escapedId}"]`,
            `g[class*="boundary"][data-id="${escapedId}"]`,
            `[data-id="${escapedId}"]`, // Fallback
        ];
    }
    findAdjacentElements(target, svg) {
        const targetDataId = target.getAttribute('data-id');
        if (!targetDataId)
            return [];
        const targetClassName = this.getElementClassName(target);
        // For C4 elements: find elements connected by relationships
        if (targetClassName && (targetClassName.includes('c4') || targetClassName.includes('element'))) {
            const allRelations = Array.from(svg.querySelectorAll('g[class*="relationship"][data-id], path[class*="relationship"]'));
            const connectedElements = [];
            try {
                const targetBbox = target.getBBox();
                for (const relation of allRelations) {
                    try {
                        const relationBbox = relation.getBBox();
                        // Check if relation intersects or is near this element
                        const intersects = relationBbox.x < targetBbox.x + targetBbox.width &&
                            relationBbox.x + relationBbox.width > targetBbox.x &&
                            relationBbox.y < targetBbox.y + targetBbox.height &&
                            relationBbox.y + relationBbox.height > targetBbox.y;
                        if (intersects) {
                            // Find the other element this relation connects to
                            const allElements = Array.from(svg.querySelectorAll('g[class*="c4"][data-id], g[class*="element"][data-id]'));
                            for (const elem of allElements) {
                                if (elem === target)
                                    continue;
                                if (connectedElements.includes(elem))
                                    continue;
                                try {
                                    const elemBbox = elem.getBBox();
                                    const elemIntersects = relationBbox.x < elemBbox.x + elemBbox.width &&
                                        relationBbox.x + relationBbox.width > elemBbox.x &&
                                        relationBbox.y < elemBbox.y + elemBbox.height &&
                                        relationBbox.y + relationBbox.height > elemBbox.y;
                                    if (elemIntersects) {
                                        connectedElements.push(elem);
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
            return connectedElements;
        }
        // For relationships: find the elements they connect
        if (targetClassName && targetClassName.includes('relationship')) {
            const allElements = Array.from(svg.querySelectorAll('g[class*="c4"][data-id], g[class*="element"][data-id]'));
            const connectedElements = [];
            try {
                const relationBbox = target.getBBox();
                for (const elem of allElements) {
                    try {
                        const elemBbox = elem.getBBox();
                        const intersects = relationBbox.x < elemBbox.x + elemBbox.width &&
                            relationBbox.x + relationBbox.width > elemBbox.x &&
                            relationBbox.y < elemBbox.y + elemBbox.height &&
                            relationBbox.y + relationBbox.height > elemBbox.y;
                        if (intersects) {
                            connectedElements.push(elem);
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
            return connectedElements;
        }
        return [];
    }
}
//# sourceMappingURL=c4Strategy.js.map