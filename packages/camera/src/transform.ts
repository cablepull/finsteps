import type { Bounds, BoundingBox, FitOptions, Padding, Transform, ViewportRect } from "./types";
import { computeFitScale, computeFitTranslate, normalizePadding } from "./bbox";

export const clamp = (value: number, min?: number, max?: number) => {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
};

export const clampTransformToBounds = (
  transform: Transform,
  viewport: ViewportRect,
  bounds?: Bounds
): Transform => {
  if (!bounds) return transform;
  const minPanX = viewport.width - (bounds.x + bounds.width) * transform.scale;
  const maxPanX = -bounds.x * transform.scale;
  const minPanY = viewport.height - (bounds.y + bounds.height) * transform.scale;
  const maxPanY = -bounds.y * transform.scale;

  return {
    ...transform,
    x: clamp(transform.x, Math.min(minPanX, maxPanX), Math.max(minPanX, maxPanX)),
    y: clamp(transform.y, Math.min(minPanY, maxPanY), Math.max(minPanY, maxPanY))
  };
};

export const computeFitTransform = (
  bbox: BoundingBox,
  viewport: ViewportRect,
  padding: Padding,
  options: Omit<FitOptions, "padding"> = {}
): Transform => {
  const pad = normalizePadding(padding);
  const scale = computeFitScale(bbox, viewport, pad);
  const translate = computeFitTranslate(bbox, viewport, pad, options.alignment);

  return {
    x: translate.x * scale,
    y: translate.y * scale,
    scale
  };
};

export const computeZoomTransform = (
  current: Transform,
  targetScale: number,
  center?: { x: number; y: number }
): Transform => {
  if (!center) {
    return { ...current, scale: targetScale };
  }
  const dx = center.x - current.x;
  const dy = center.y - current.y;
  const ratio = targetScale / current.scale;

  return {
    x: center.x - dx * ratio,
    y: center.y - dy * ratio,
    scale: targetScale
  };
};

export const computePanTransform = (
  current: Transform,
  x: number,
  y: number
): Transform => ({
  ...current,
  x,
  y
});
