import type { CameraAdapter, Transform, ViewportRect } from "../types";

export type D3ZoomTransform = { x: number; y: number; k: number };

export type D3ZoomController = {
  getTransform: () => D3ZoomTransform;
  setTransform: (transform: D3ZoomTransform) => void;
};

export type D3ZoomAdapterOptions = {
  viewportEl: HTMLElement;
  controller: D3ZoomController;
};

export const createD3ZoomAdapter = ({
  viewportEl,
  controller
}: D3ZoomAdapterOptions): CameraAdapter => ({
  init: () => undefined,
  destroy: () => undefined,
  getTransform: () => {
    const transform = controller.getTransform();
    return { x: transform.x, y: transform.y, scale: transform.k };
  },
  setTransform: (transform: Transform) => {
    controller.setTransform({ x: transform.x, y: transform.y, k: transform.scale });
  },
  getViewportRect: (): ViewportRect => {
    const rect = viewportEl.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
});
