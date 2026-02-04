import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for Wardley map diagrams
 * Wardley maps render components, anchors, and links
 * Components and anchors are typically <g> elements with text labels
 */
export class WardleyStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return "wardley";
    }
    getTargetableClasses() {
        return ["component", "anchor", "node", "label"];
    }
    getTargetableTags() {
        return ["g", "text", "circle", "rect"];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Wardley maps render components and anchors as text labels
        // We need to find text elements and extract their content
        // The structure may vary, so we'll look for:
        // 1. <text> elements with component/anchor names
        // 2. <g> elements that contain these text elements
        // Find all text elements that might be component or anchor labels
        const textElements = Array.from(svg.querySelectorAll("text"));
        for (const textEl of textElements) {
            const text = textEl.textContent?.trim();
            if (!text || text.length === 0)
                continue;
            // Skip very long text (likely not a component name)
            if (text.length > 100)
                continue;
            // Normalize the text to create a data-id
            // Replace spaces with underscores and remove special characters
            let dataId = text
                .replace(/\s+/g, "_")
                .replace(/[^A-Za-z0-9_-]/g, "");
            if (!dataId)
                continue;
            // Try to find the parent <g> element, or use the text element itself
            let targetElement = textEl;
            let parent = textEl.parentElement;
            // Walk up to find a meaningful parent <g> element
            while (parent && parent.tagName.toLowerCase() === "g") {
                // Check if this <g> has an id or class that suggests it's a component
                const parentId = parent.getAttribute("id");
                const parentClass = parent.getAttribute("class");
                if (parentId || parentClass) {
                    targetElement = parent;
                    break;
                }
                parent = parent.parentElement;
            }
            // Store the mapping
            if (!nodeIdMap.has(dataId)) {
                nodeIdMap.set(dataId, targetElement);
            }
        }
        return nodeIdMap;
    }
    getTargetSelectors(dataId) {
        const escaped = dataId.replace(/"/g, '\\"');
        return [
            `g[data-id="${escaped}"]`,
            `text[data-id="${escaped}"]`,
            `[data-id="${escaped}"]`,
        ];
    }
    findAdjacentElements(_target, _svg) {
        // Wardley components are connected by links/paths
        // For now, we'll just highlight the component itself
        return [];
    }
}
//# sourceMappingURL=wardleyStrategy.js.map