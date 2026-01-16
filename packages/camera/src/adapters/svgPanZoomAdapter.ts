import type { CameraAdapter, Transform, ViewportRect } from "../types";

export type SvgPanZoomApi = {
  getZoom: () => number;
  getPan: () => { x: number; y: number };
  zoom: (level: number) => void;
  pan: (point: { x: number; y: number }) => void;
  destroy?: () => void;
};

export type SvgPanZoomFactory = (
  svgRoot: SVGSVGElement,
  options?: Record<string, unknown>
) => SvgPanZoomApi;

export type SvgPanZoomAdapterOptions = {
  svgRoot: SVGSVGElement;
  viewportEl: HTMLElement;
  createPanZoom?: SvgPanZoomFactory;
  panZoomOptions?: Record<string, unknown>;
};

export const createSvgPanZoomAdapter = ({
  svgRoot,
  viewportEl,
  createPanZoom,
  panZoomOptions
}: SvgPanZoomAdapterOptions): CameraAdapter => {
  let instance: SvgPanZoomApi | null = null;

  const factory: SvgPanZoomFactory | undefined =
    createPanZoom ?? (globalThis as { svgPanZoom?: SvgPanZoomFactory }).svgPanZoom;

  return {
    init: () => {
      if (!factory) {
        throw new Error("svg-pan-zoom factory not provided.");
      }
      instance = factory(svgRoot, panZoomOptions);
    },
    destroy: () => {
      instance?.destroy?.();
      instance = null;
    },
    getTransform: () => {
      if (!instance) {
        return { x: 0, y: 0, scale: 1 };
      }
      const pan = instance.getPan();
      return {
        x: pan.x,
        y: pan.y,
        scale: instance.getZoom()
      };
    },
    setTransform: (transform: Transform) => {
      if (!instance) return;
      instance.pan({ x: transform.x, y: transform.y });
      instance.zoom(transform.scale);
    },
    getViewportRect: (): ViewportRect => {
      const rect = viewportEl.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
  };
};
