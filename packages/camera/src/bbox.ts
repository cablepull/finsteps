import type { Alignment, BoundingBox, Padding, ViewportRect } from "./types";

const defaultAlignment: Alignment = { x: "center", y: "center" };

export const normalizePadding = (padding?: Padding): Required<
  Record<"top" | "right" | "bottom" | "left", number>
> => {
  if (typeof padding === "number") {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }

  return {
    top: padding?.top ?? 0,
    right: padding?.right ?? 0,
    bottom: padding?.bottom ?? 0,
    left: padding?.left ?? 0
  };
};

export const normalizeAlignment = (alignment?: Alignment): Alignment => ({
  x: alignment?.x ?? defaultAlignment.x,
  y: alignment?.y ?? defaultAlignment.y
});

export const bboxFromElements = (elements: Array<Element | SVGGraphicsElement>): BoundingBox => {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const element of elements) {
    const bbox = "getBBox" in element ? element.getBBox() : element.getBoundingClientRect();

    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

export const computeAlignedOffset = (
  available: number,
  content: number,
  alignment: "start" | "center" | "end"
) => {
  if (alignment === "start") return 0;
  if (alignment === "end") return available - content;
  return (available - content) / 2;
};

export const computeFitScale = (bbox: BoundingBox, viewport: ViewportRect, padding: Padding) => {
  const pad = normalizePadding(padding);
  const width = Math.max(0, viewport.width - pad.left - pad.right);
  const height = Math.max(0, viewport.height - pad.top - pad.bottom);
  if (bbox.width === 0 || bbox.height === 0) return 1;
  return Math.min(width / bbox.width, height / bbox.height);
};

export const computeFitTranslate = (
  bbox: BoundingBox,
  viewport: ViewportRect,
  padding: Padding,
  alignment?: Alignment
) => {
  const pad = normalizePadding(padding);
  const align = normalizeAlignment(alignment);
  const contentWidth = bbox.width;
  const contentHeight = bbox.height;
  const availableWidth = Math.max(0, viewport.width - pad.left - pad.right);
  const availableHeight = Math.max(0, viewport.height - pad.top - pad.bottom);
  const offsetX = computeAlignedOffset(availableWidth, contentWidth, align.x);
  const offsetY = computeAlignedOffset(availableHeight, contentHeight, align.y);

  return {
    x: -bbox.x + pad.left + offsetX,
    y: -bbox.y + pad.top + offsetY
  };
};
