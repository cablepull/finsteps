import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for user journey diagrams
 * Handles journey steps and tasks
 */
export class JourneyStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return 'journey';
    }
    getTargetableClasses() {
        return ['step', 'task', 'section'];
    }
    getTargetableTags() {
        return ['g', 'rect', 'text'];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Patterns for journey diagram IDs
        const patterns = [
            /^step-([A-Za-z0-9_]+)-\d+$/, // step-name-digit
            /^task-([A-Za-z0-9_]+)-\d+$/, // task-name-digit
            /^section-([A-Za-z0-9_]+)-\d+$/, // section-name-digit
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
                // Walk up the tree to find the step/task/section group
                while (current && current !== svg) {
                    if (current instanceof SVGElement && current.tagName === "g") {
                        const className = this.getElementClassName(current);
                        if (className && (className.includes('step') || className.includes('task') || className.includes('section'))) {
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
            `g.step[data-id="${escapedId}"]`,
            `g.task[data-id="${escapedId}"]`,
            `g.section[data-id="${escapedId}"]`,
            `g[class*="step"][data-id="${escapedId}"]`,
            `g[class*="task"][data-id="${escapedId}"]`,
            `g[class*="section"][data-id="${escapedId}"]`,
            `[data-id="${escapedId}"]`, // Fallback
        ];
    }
    findAdjacentElements(target, svg) {
        const targetDataId = target.getAttribute('data-id');
        if (!targetDataId)
            return [];
        // For journey diagrams, find sequential steps (steps in the same section or adjacent sections)
        const allSteps = Array.from(svg.querySelectorAll('g[class*="step"][data-id], g[class*="task"][data-id]'));
        // Find the target's position in the sequence
        const targetIndex = allSteps.indexOf(target);
        if (targetIndex === -1)
            return [];
        // Return previous and next steps (sequential adjacency)
        const adjacentSteps = [];
        if (targetIndex > 0) {
            adjacentSteps.push(allSteps[targetIndex - 1]);
        }
        if (targetIndex < allSteps.length - 1) {
            adjacentSteps.push(allSteps[targetIndex + 1]);
        }
        return adjacentSteps;
    }
}
//# sourceMappingURL=journeyStrategy.js.map