import { defineCameraAdapterConformanceTests } from "../src/conformance";
import { createSvgPanZoomAdapter, type SvgPanZoomApi } from "../src/adapters/svgPanZoomAdapter";

const createMockPanZoom = (): SvgPanZoomApi => {
  let transform = { x: 0, y: 0, scale: 1 };
  return {
    getZoom: () => transform.scale,
    getPan: () => ({ x: transform.x, y: transform.y }),
    zoom: (level) => {
      transform = { ...transform, scale: level };
    },
    pan: (point) => {
      transform = { ...transform, x: point.x, y: point.y };
    }
  };
};

defineCameraAdapterConformanceTests("svg-pan-zoom", ({ viewportEl }) => {
  const svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
  return createSvgPanZoomAdapter({
    svgRoot,
    viewportEl,
    createPanZoom: () => createMockPanZoom()
  });
});
