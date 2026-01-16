import { bench, describe } from "vitest";
import { bboxFromElements } from "../src/bbox";
import { computeFitTransform } from "../src/transform";

const makeElements = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    ({
      getBBox: () => ({
        x: index * 2,
        y: index * 1.5,
        width: 40,
        height: 20
      })
    }) as unknown as SVGGraphicsElement
  );

describe("large diagram benchmarks", () => {
  const elements = makeElements(5000);
  const viewport = { width: 1920, height: 1080 };

  bench("bboxFromElements for 5000 nodes", () => {
    bboxFromElements(elements);
  });

  bench("computeFitTransform for large bbox", () => {
    const bbox = bboxFromElements(elements);
    computeFitTransform(bbox, viewport, 24, { alignment: { x: "center", y: "center" } });
  });
});
