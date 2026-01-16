import { describe, expect, it } from "vitest";
import { computeFitTransform, clampTransformToBounds } from "../src/transform";

const viewport = { width: 400, height: 300 };

describe("transform computations", () => {
  it("computes a fit transform with padding and alignment", () => {
    const bbox = { x: 10, y: 20, width: 100, height: 50 };
    const transform = computeFitTransform(bbox, viewport, 10, { alignment: { x: "center", y: "center" } });

    expect(transform.scale).toBeCloseTo(3.8);
    expect(transform.x).toBeCloseTo(532);
    expect(transform.y).toBeCloseTo(399);
  });

  it("clamps pan values to bounds", () => {
    const transform = { x: 500, y: -500, scale: 1 };
    const bounds = { x: 0, y: 0, width: 500, height: 400 };
    const clamped = clampTransformToBounds(transform, { width: 200, height: 100 }, bounds);

    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(-300);
  });
});
