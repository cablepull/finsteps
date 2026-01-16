import { describe, expect, it } from "vitest";
import { bboxFromElements, normalizePadding } from "../src/bbox";

const mockElement = (bbox: { x: number; y: number; width: number; height: number }) =>
  ({
    getBBox: () => bbox
  }) as unknown as SVGGraphicsElement;

describe("bbox helpers", () => {
  it("unions element bounding boxes", () => {
    const elements = [
      mockElement({ x: 0, y: 0, width: 10, height: 10 }),
      mockElement({ x: 5, y: 5, width: 10, height: 5 })
    ];

    expect(bboxFromElements(elements)).toEqual({ x: 0, y: 0, width: 15, height: 10 });
  });

  it("normalizes padding inputs", () => {
    expect(normalizePadding(12)).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(normalizePadding({ top: 4, left: 2 })).toEqual({
      top: 4,
      right: 0,
      bottom: 0,
      left: 2
    });
  });
});
