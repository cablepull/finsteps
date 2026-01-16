import { CameraHandle, DiagramHandle } from "../types.js";

const getSvgViewBox = (svg: SVGSVGElement): string | null => {
  const baseVal = svg.viewBox?.baseVal;
  if (baseVal && baseVal.width && baseVal.height) {
    return `${baseVal.x} ${baseVal.y} ${baseVal.width} ${baseVal.height}`;
  }
  return svg.getAttribute("viewBox");
};

export const createBasicCameraHandle = (diagram: DiagramHandle): CameraHandle => {
  const svg = diagram.getRoot();
  const originalViewBox = getSvgViewBox(svg);

  return {
    fit(target, options) {
      if (!(target instanceof SVGGraphicsElement)) {
        return;
      }
      const bbox = target.getBBox();
      const padding = options?.padding ?? 16;
      const viewBox = {
        x: bbox.x - padding,
        y: bbox.y - padding,
        width: bbox.width + padding * 2,
        height: bbox.height + padding * 2
      };
      svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    },
    reset() {
      if (originalViewBox) {
        svg.setAttribute("viewBox", originalViewBox);
      }
    },
    destroy() {
      if (originalViewBox) {
        svg.setAttribute("viewBox", originalViewBox);
      }
    }
  };
};
