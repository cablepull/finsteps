import type {
  CameraAdapter,
  CameraHandle,
  CameraOptions,
  BoundingBox,
  FitOptions,
  PanOptions,
  Transform,
  TransitionOptions,
  ZoomOptions
} from "./types";
import { animateTransform } from "./animation";
import { clampTransformToBounds, computeFitTransform, computePanTransform, computeZoomTransform } from "./transform";

export type CreateCameraArgs = {
  svgRoot: SVGSVGElement;
  viewportEl: HTMLElement;
  adapter: CameraAdapter;
  options?: CameraOptions;
};

export const createCamera = ({ adapter, options }: CreateCameraArgs): CameraHandle => {
  const raf = options?.requestAnimationFrame ?? requestAnimationFrame;
  adapter.init();

  const initialTransform = adapter.getTransform();

  const getClampedTransform = (transform: Transform, boundsOverride?: FitOptions["bounds"]) => {
    const viewport = adapter.getViewportRect();
    const scale = Math.min(
      options?.maxZoom ?? Number.POSITIVE_INFINITY,
      Math.max(options?.minZoom ?? 0, transform.scale)
    );
    const scaled = { ...transform, scale };
    return clampTransformToBounds(scaled, viewport, boundsOverride ?? options?.bounds);
  };

  const setTransform = async (transform: Transform, opts?: TransitionOptions) => {
    const from = adapter.getTransform();
    const to = getClampedTransform(transform);
    await animateTransform(from, to, opts, adapter.setTransform, raf);
  };

  const fit = async (bbox: BoundingBox, opts?: FitOptions) => {
    const viewport = adapter.getViewportRect();
    const padding = opts?.padding ?? options?.padding ?? 0;
    const rawTransform = computeFitTransform(bbox, viewport, padding, opts);
    const clamped = getClampedTransform(rawTransform, opts?.bounds);
    await setTransform(clamped, opts);
  };

  const zoom = async (level: number, opts?: ZoomOptions) => {
    const current = adapter.getTransform();
    const next = computeZoomTransform(current, level, opts?.center);
    await setTransform(getClampedTransform(next, opts?.bounds), opts);
  };

  const pan = async (x: number, y: number, opts?: PanOptions) => {
    const current = adapter.getTransform();
    const next = computePanTransform(current, x, y);
    await setTransform(getClampedTransform(next, opts?.bounds), opts);
  };

  const reset = async (opts?: TransitionOptions) => {
    await setTransform(initialTransform, opts);
  };

  return {
    fit,
    zoom,
    pan,
    reset,
    getTransform: () => adapter.getTransform(),
    setTransform
  };
};
