import type { EasingName, Transform, TransitionOptions } from "./types";

const easingMap: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
};

export const interpolateTransform = (from: Transform, to: Transform, t: number): Transform => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
  scale: from.scale + (to.scale - from.scale) * t
});

export const animateTransform = (
  from: Transform,
  to: Transform,
  opts: TransitionOptions | undefined,
  onUpdate: (transform: Transform) => void,
  requestFrame: typeof requestAnimationFrame
): Promise<void> => {
  const duration = opts?.durationMs ?? 0;
  const easing = easingMap[opts?.easing ?? "linear"];

  if (duration <= 0) {
    onUpdate(to);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      onUpdate(interpolateTransform(from, to, easing(t)));
      if (t < 1) {
        requestFrame(tick);
      } else {
        resolve();
      }
    };

    requestFrame(tick);
  });
};
