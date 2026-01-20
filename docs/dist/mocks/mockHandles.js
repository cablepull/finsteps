import { resolveTarget } from "../targetResolver.js";
export const createMockDiagramHandle = (svg) => {
    const container = svg.parentElement ?? document.body;
    return {
        getRoot: () => svg,
        getContainer: () => container,
        resolveTarget: (target) => resolveTarget({ getRoot: () => svg }, target),
        destroy: () => {
            svg.remove();
        }
    };
};
export const createMockCameraHandle = () => {
    return {
        fit: () => undefined,
        reset: () => undefined,
        destroy: () => undefined
    };
};
export const createMockOverlayHandle = () => {
    return {
        showBubble: () => undefined,
        hideBubble: () => undefined,
        destroy: () => undefined
    };
};
//# sourceMappingURL=mockHandles.js.map