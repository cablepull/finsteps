import { CameraHandle, DiagramHandle, OverlayHandle, TargetDescriptor } from "../types.js";
import { resolveTarget } from "../targetResolver.js";

export const createMockDiagramHandle = (svg: SVGSVGElement): DiagramHandle => {
  const container = svg.parentElement ?? document.body;
  return {
    getRoot: () => svg,
    getContainer: () => container as HTMLElement,
    resolveTarget: (target: TargetDescriptor) => resolveTarget({ getRoot: () => svg } as DiagramHandle, target),
    destroy: () => {
      svg.remove();
    }
  };
};

export const createMockCameraHandle = (): CameraHandle => {
  return {
    fit: () => undefined,
    reset: () => undefined,
    destroy: () => undefined
  };
};

export const createMockOverlayHandle = (): OverlayHandle => {
  return {
    showBubble: () => undefined,
    hideBubble: () => undefined,
    destroy: () => undefined
  };
};
