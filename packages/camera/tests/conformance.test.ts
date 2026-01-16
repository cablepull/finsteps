import { defineCameraAdapterConformanceTests } from "../src/conformance";
import type { CameraAdapter, Transform } from "../src/types";

const createMockAdapter = ({ viewportEl }: { viewportEl: HTMLElement }): CameraAdapter => {
  let transform: Transform = { x: 0, y: 0, scale: 1 };
  return {
    init: () => undefined,
    destroy: () => undefined,
    getTransform: () => transform,
    setTransform: (next) => {
      transform = { ...next };
    },
    getViewportRect: () => {
      const rect = viewportEl.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
  };
};

defineCameraAdapterConformanceTests("mock", createMockAdapter);
