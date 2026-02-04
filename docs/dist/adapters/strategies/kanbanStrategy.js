import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for kanban diagrams
 * Mermaid generates <g> elements with id attributes directly
 */
export class KanbanStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return "kanban";
    }
    getTargetableClasses() {
        return ["cluster", "node", "section"];
    }
    getTargetableTags() {
        return ["g", "rect"];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Kanban diagrams have <g> elements with id attributes:
        // - <g id="Todo" class="cluster undefined section-1"> (columns)
        // - <g id="Task_A" class="node undefined"> (tasks)
        // Find all <g> elements with id attributes
        const gElements = Array.from(svg.querySelectorAll("g[id]"));
        for (const el of gElements) {
            const id = el.getAttribute("id");
            const className = el.getAttribute("class");
            // Only include cluster (columns) and node (tasks) elements
            if (id && className && (className.includes("cluster") || className.includes("node"))) {
                nodeIdMap.set(id, el);
            }
        }
        return nodeIdMap;
    }
    getTargetSelectors(dataId) {
        const escaped = dataId.replace(/"/g, '\\"');
        return [
            `g[data-id="${escaped}"]`,
            `g[id="${escaped}"]`,
            `[data-id="${escaped}"]`,
        ];
    }
    findAdjacentElements(_target, _svg) {
        // Kanban elements are typically independent
        return [];
    }
}
//# sourceMappingURL=kanbanStrategy.js.map