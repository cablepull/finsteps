export type Alignment = {
  x: "start" | "center" | "end";
  y: "start" | "center" | "end";
};

export type Padding = number | Partial<Record<"top" | "right" | "bottom" | "left", number>>;

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Transform = {
  x: number;
  y: number;
  scale: number;
};

export type ViewportRect = {
  width: number;
  height: number;
};

export type Bounds = BoundingBox;

export type EasingName = "linear" | "cubicOut" | "cubicInOut";

export type TransitionOptions = {
  durationMs?: number;
  easing?: EasingName;
};

export type FitOptions = TransitionOptions & {
  padding?: Padding;
  alignment?: Alignment;
  bounds?: Bounds;
};

export type ZoomOptions = TransitionOptions & {
  center?: { x: number; y: number };
  bounds?: Bounds;
};

export type PanOptions = TransitionOptions & {
  bounds?: Bounds;
};

export type CameraOptions = {
  minZoom?: number;
  maxZoom?: number;
  bounds?: Bounds;
  padding?: Padding;
  alignment?: Alignment;
  requestAnimationFrame?: typeof requestAnimationFrame;
};

export type CameraHandle = {
  fit: (bbox: BoundingBox, opts?: FitOptions) => Promise<void>;
  zoom: (level: number, opts?: ZoomOptions) => Promise<void>;
  pan: (x: number, y: number, opts?: PanOptions) => Promise<void>;
  reset: (opts?: TransitionOptions) => Promise<void>;
  getTransform: () => Transform;
  setTransform: (transform: Transform, opts?: TransitionOptions) => Promise<void>;
};

export type CameraAdapter = {
  init: () => void;
  destroy: () => void;
  getTransform: () => Transform;
  setTransform: (transform: Transform) => void;
  getViewportRect: () => ViewportRect;
};
