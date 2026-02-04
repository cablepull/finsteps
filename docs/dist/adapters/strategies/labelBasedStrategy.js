import { BaseDiagramStrategy } from "../diagramStrategies.js";
const isNumericLabel = (label) => /^-?\d+(\.\d+)?$/.test(label);
const normalizeDataId = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed)
        return "";
    // Prefer stable, user-facing IDs: letters/numbers/underscore/dash
    const normalized = trimmed
        .replace(/\s+/g, "_")
        .replace(/[^A-Za-z0-9_-]/g, "");
    return normalized || "";
};
/**
 * A conservative, label-driven strategy for diagram types where Mermaid SVG IDs
 * are not stable or not easily mapped to user IDs.
 *
 * It finds SVG <text> elements and assigns `data-id` to the nearest meaningful
 * ancestor <g> that contains shapes (rect/circle/path/...) or looks like a node group.
 *
 * This is intended to provide editor-grade target discovery (non-empty targets)
 * and a stable `dataId` scheme for actions like highlight/bubble/fit.
 */
export class LabelBasedStrategy extends BaseDiagramStrategy {
    constructor(diagramType, options = {}) {
        super();
        this.diagramType = diagramType;
        this.options = options;
    }
    getDiagramType() {
        return this.diagramType;
    }
    extractNodeIds(svg) {
        const map = new Map();
        const seenCounts = new Map();
        const maxTargets = this.options.maxTargets;
        const texts = Array.from(svg.querySelectorAll("text"));
        for (const textEl of texts) {
            const label = (textEl.textContent ?? "").trim();
            if (!label)
                continue;
            if (this.options.skipNumericLabels && isNumericLabel(label))
                continue;
            let dataId = normalizeDataId(label);
            if (!dataId)
                continue;
            // Find best target group for this label
            const target = this.findTargetGroupForText(textEl, svg);
            if (!target)
                continue;
            // Deduplicate dataIds by suffixing _2, _3, ...
            const base = dataId;
            const currentCount = (seenCounts.get(base) ?? 0) + 1;
            seenCounts.set(base, currentCount);
            if (currentCount > 1) {
                dataId = `${base}_${currentCount}`;
            }
            // Avoid overwriting existing mappings if we somehow collide
            if (!map.has(dataId)) {
                map.set(dataId, target);
            }
            if (typeof maxTargets === "number" && map.size >= maxTargets) {
                break;
            }
        }
        return map;
    }
    getTargetSelectors(dataId) {
        const escaped = this.escapeSelector(dataId);
        // Prefer groups, then fall back to any element with data-id.
        // For ZenUML and other HTML-in-SVG types, we also look for classes.
        return [
            `g[data-id="${escaped}"]`,
            `.node[data-id="${escaped}"]`,
            `.participant[data-id="${escaped}"]`,
            `.message[data-id="${escaped}"]`,
            `[data-id="${escaped}"]`,
        ];
    }
    findAdjacentElements(_target, _svg) {
        // Conservative default: adjacency is highly type-specific; returning empty still
        // allows camera.fit to work on the target itself.
        return [];
    }
    getTargetableClasses() {
        // Keep broad; extraction is primarily text-based.
        return ["node", "label", "item", "task", "bar", "slice"];
    }
    getTargetableTags() {
        return ["g", "rect", "circle", "ellipse", "polygon", "path", "text"];
    }
    findTargetGroupForText(textEl, svg) {
        // Walk up to find a <g> that contains shapes (or is a Mermaid-like node group)
        let current = textEl;
        while (current && current !== svg) {
            let parent = current.parentElement;
            if (!parent || parent === svg)
                break;
            // Avoid relying on SVGGElement (not always defined in jsdom)
            if (parent.tagName.toLowerCase() === "g") {
                const svgEl = parent;
                const className = typeof svgEl.className === "string" ? svgEl.className : svgEl.className.baseVal;
                const hasShapes = !!parent.querySelector("rect,circle,ellipse,polygon,path");
                if (hasShapes || className.includes("node")) {
                    return svgEl;
                }
            }
            current = parent;
        }
        // Fallback: return the text's nearest graphics ancestor if any
        current = textEl;
        while (current && current !== svg) {
            let parent = current.parentElement;
            if (!parent || parent === svg)
                break;
            const tag = parent.tagName.toLowerCase();
            const isGraphicsTag = tag === "g" || tag === "rect" || tag === "circle" || tag === "ellipse" || tag === "polygon" || tag === "path";
            if (isGraphicsTag) {
                return parent;
            }
            current = parent;
        }
        return null;
    }
}
//# sourceMappingURL=labelBasedStrategy.js.map