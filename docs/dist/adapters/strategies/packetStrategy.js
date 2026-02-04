import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for packet diagrams
 * Packet diagrams render fields as rectangles with text labels
 */
export class PacketStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return "packet";
    }
    getTargetableClasses() {
        return ["packetBlock", "packet"];
    }
    getTargetableTags() {
        return ["g", "rect", "text"];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        const seenLabels = new Map();
        // Packet diagrams structure (multiple fields per <g>):
        // <g>
        //   <rect class="packetBlock"/>
        //   <text class="packetLabel">Field Name 1</text>
        //   <text class="packetByte start">0</text>
        //   <text class="packetByte end">7</text>
        //   <rect class="packetBlock"/>
        //   <text class="packetLabel">Field Name 2</text>
        //   ...
        // </g>
        // Find all text elements with class="packetLabel"
        const labelElements = Array.from(svg.querySelectorAll("text.packetLabel"));
        for (const textEl of labelElements) {
            const label = textEl.textContent?.trim();
            if (!label)
                continue;
            // Normalize the label to create a data-id
            let dataId = label
                .replace(/\s+/g, "_")
                .replace(/[^A-Za-z0-9_-]/g, "");
            if (!dataId)
                continue;
            // Handle duplicate labels by adding suffix
            const baseId = dataId;
            const count = (seenLabels.get(baseId) ?? 0) + 1;
            seenLabels.set(baseId, count);
            if (count > 1) {
                dataId = `${baseId}_${count}`;
            }
            // Find the associated rect (previous sibling)
            // Structure: <rect/><text class="packetLabel"/><text class="packetByte"/>...
            let rectEl = null;
            let sibling = textEl.previousElementSibling;
            while (sibling) {
                if (sibling.tagName.toLowerCase() === "rect" &&
                    sibling.classList.contains("packetBlock")) {
                    rectEl = sibling;
                    break;
                }
                sibling = sibling.previousElementSibling;
            }
            if (rectEl) {
                // Create a synthetic wrapper group for this field
                const parent = textEl.parentElement;
                if (parent) {
                    const wrapperGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    wrapperGroup.setAttribute("data-id", dataId);
                    // Move rect and text into the wrapper
                    parent.insertBefore(wrapperGroup, rectEl);
                    wrapperGroup.appendChild(rectEl);
                    wrapperGroup.appendChild(textEl);
                    // Also move the byte markers (start/end) if they immediately follow
                    let nextSibling = wrapperGroup.nextElementSibling;
                    while (nextSibling &&
                        nextSibling.tagName.toLowerCase() === "text" &&
                        nextSibling.classList.contains("packetByte")) {
                        const toMove = nextSibling;
                        nextSibling = nextSibling.nextElementSibling;
                        wrapperGroup.appendChild(toMove);
                    }
                    nodeIdMap.set(dataId, wrapperGroup);
                }
            }
        }
        return nodeIdMap;
    }
    getTargetSelectors(dataId) {
        const escaped = dataId.replace(/"/g, '\\"');
        return [
            `g[data-id="${escaped}"]`,
            `[data-id="${escaped}"]`,
        ];
    }
    findAdjacentElements(_target, _svg) {
        // Packet fields are typically arranged sequentially
        // but we don't have a good way to determine adjacency
        return [];
    }
}
//# sourceMappingURL=packetStrategy.js.map