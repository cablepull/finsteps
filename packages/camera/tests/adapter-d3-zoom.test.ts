import { defineCameraAdapterConformanceTests } from "../src/conformance";
import { createD3ZoomAdapter, type D3ZoomTransform } from "../src/adapters/d3ZoomAdapter";

const createMockController = () => {
  let transform: D3ZoomTransform = { x: 0, y: 0, k: 1 };
  return {
    getTransform: () => transform,
    setTransform: (next: D3ZoomTransform) => {
      transform = { ...next };
    }
  };
};

defineCameraAdapterConformanceTests("d3-zoom", ({ viewportEl }) => {
  const controller = createMockController();
  return createD3ZoomAdapter({ viewportEl, controller });
});
