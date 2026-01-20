import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for ER (Entity-Relationship) diagrams
 * Handles entities, relationships, and attributes
 */
export class ERDiagramStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return 'erDiagram';
    }
    getTargetableClasses() {
        return ['entity', 'relationship', 'attribute', 'edge'];
    }
    getTargetableTags() {
        return ['g', 'rect', 'path'];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Patterns for ER diagram IDs
        const patterns = [
            /^entity-([A-Za-z0-9_]+)-\d+$/, // entity-name-digit
            /^relationship-([A-Za-z0-9_]+)-\d+$/, // relationship-name-digit
            /^attribute-([A-Za-z0-9_]+)-\d+$/, // attribute-name-digit
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
                // Walk up the tree to find the entity/relationship/attribute group
                while (current && current !== svg) {
                    if (current instanceof SVGElement && current.tagName === "g") {
                        const className = this.getElementClassName(current);
                        if (className && (className.includes('entity') || className.includes('relationship') ||
                            className.includes('attribute') || className.includes('edge'))) {
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
            `g.entity[data-id="${escapedId}"]`,
            `g.relationship[data-id="${escapedId}"]`,
            `g.attribute[data-id="${escapedId}"]`,
            `g.edge[data-id="${escapedId}"]`,
            `g[class*="entity"][data-id="${escapedId}"]`,
            `g[class*="relationship"][data-id="${escapedId}"]`,
            `g[class*="attribute"][data-id="${escapedId}"]`,
            `g[class*="edge"][data-id="${escapedId}"]`,
            `[data-id="${escapedId}"]`, // Fallback
        ];
    }
    findAdjacentElements(target, svg) {
        const targetDataId = target.getAttribute('data-id');
        if (!targetDataId)
            return [];
        const targetClassName = this.getElementClassName(target);
        // For entities: find entities connected by relationships
        if (targetClassName && targetClassName.includes('entity')) {
            // Find all relationship edges
            const allRelations = Array.from(svg.querySelectorAll('g[class*="relationship"][data-id], g[class*="edge"][data-id], path[class*="edge"]'));
            const connectedEntities = [];
            try {
                const targetBbox = target.getBBox();
                for (const relation of allRelations) {
                    try {
                        const relationBbox = relation.getBBox();
                        // Check if relation intersects or is near this entity
                        const intersects = relationBbox.x < targetBbox.x + targetBbox.width &&
                            relationBbox.x + relationBbox.width > targetBbox.x &&
                            relationBbox.y < targetBbox.y + targetBbox.height &&
                            relationBbox.y + relationBbox.height > targetBbox.y;
                        if (intersects) {
                            // Find the other entity this relation connects to
                            const allEntities = Array.from(svg.querySelectorAll('g[class*="entity"][data-id]'));
                            for (const entity of allEntities) {
                                if (entity === target)
                                    continue;
                                if (connectedEntities.includes(entity))
                                    continue;
                                try {
                                    const entityBbox = entity.getBBox();
                                    const entityIntersects = relationBbox.x < entityBbox.x + entityBbox.width &&
                                        relationBbox.x + relationBbox.width > entityBbox.x &&
                                        relationBbox.y < entityBbox.y + entityBbox.height &&
                                        relationBbox.y + relationBbox.height > entityBbox.y;
                                    if (entityIntersects) {
                                        connectedEntities.push(entity);
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
            return connectedEntities;
        }
        // For relationships: find the entities they connect
        if (targetClassName && (targetClassName.includes('relationship') || targetClassName.includes('edge'))) {
            const allEntities = Array.from(svg.querySelectorAll('g[class*="entity"][data-id]'));
            const connectedEntities = [];
            try {
                const relationBbox = target.getBBox();
                for (const entity of allEntities) {
                    try {
                        const entityBbox = entity.getBBox();
                        const intersects = relationBbox.x < entityBbox.x + entityBbox.width &&
                            relationBbox.x + relationBbox.width > entityBbox.x &&
                            relationBbox.y < entityBbox.y + entityBbox.height &&
                            relationBbox.y + relationBbox.height > entityBbox.y;
                        if (intersects) {
                            connectedEntities.push(entity);
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
            return connectedEntities;
        }
        return [];
    }
}
//# sourceMappingURL=erDiagramStrategy.js.map