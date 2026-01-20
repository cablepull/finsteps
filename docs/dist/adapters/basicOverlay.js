export const createBasicOverlayHandle = () => {
    const container = document.createElement("div");
    container.className = "finsteps-overlay";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "0";
    container.style.height = "0";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
    const bubbles = new Map();
    const updatePositions = () => {
        for (const bubble of bubbles.values()) {
            const rect = bubble.target.getBoundingClientRect();
            const bubbleRect = bubble.element.getBoundingClientRect();
            const top = Math.max(8, rect.top - bubbleRect.height - 8);
            const left = Math.max(8, rect.left + rect.width / 2 - bubbleRect.width / 2);
            bubble.element.style.top = `${top}px`;
            bubble.element.style.left = `${left}px`;
        }
    };
    const onScroll = () => updatePositions();
    const onResize = () => updatePositions();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return {
        showBubble({ id = "default", target, text }) {
            let bubble = bubbles.get(id);
            if (!bubble) {
                const element = document.createElement("div");
                element.className = "finsteps-bubble";
                element.style.position = "fixed";
                element.style.padding = "8px 12px";
                element.style.borderRadius = "8px";
                element.style.background = "rgba(15, 23, 42, 0.95)";
                element.style.color = "#fff";
                element.style.font = "14px/1.4 sans-serif";
                element.style.maxWidth = "240px";
                element.style.pointerEvents = "none";
                container.appendChild(element);
                bubble = { id, element, target };
                bubbles.set(id, bubble);
            }
            bubble.target = target;
            bubble.element.textContent = text;
            requestAnimationFrame(updatePositions);
        },
        hideBubble(id = "default") {
            const bubble = bubbles.get(id);
            if (!bubble) {
                return;
            }
            bubble.element.remove();
            bubbles.delete(id);
        },
        destroy() {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
            for (const bubble of bubbles.values()) {
                bubble.element.remove();
            }
            bubbles.clear();
            container.remove();
        }
    };
};
//# sourceMappingURL=basicOverlay.js.map