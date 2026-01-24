import { describe, expect, it } from "vitest";
import { LabelBasedStrategy } from "../../src/adapters/strategies/labelBasedStrategy";

const makeSvg = (inner: string): SVGSVGElement => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  return wrapper.querySelector("svg") as SVGSVGElement;
};

describe("LabelBasedStrategy", () => {
  it("extracts data-id from labeled groups", () => {
    const svg = makeSvg(`
      <g class="node"><rect x="0" y="0" width="10" height="10"></rect><text>Root</text></g>
      <g class="node"><rect x="0" y="20" width="10" height="10"></rect><text>Topic_A</text></g>
    `);

    const strat = new LabelBasedStrategy("mindmap", { skipNumericLabels: true });
    const map = strat.extractNodeIds(svg);

    expect(map.has("Root")).toBe(true);
    expect(map.has("Topic_A")).toBe(true);
  });

  it("deduplicates identical labels with suffixes", () => {
    const svg = makeSvg(`
      <g class="node"><rect x="0" y="0" width="10" height="10"></rect><text>Dup</text></g>
      <g class="node"><rect x="0" y="20" width="10" height="10"></rect><text>Dup</text></g>
    `);

    const strat = new LabelBasedStrategy("mindmap");
    const map = strat.extractNodeIds(svg);

    expect(map.has("Dup")).toBe(true);
    expect(map.has("Dup_2")).toBe(true);
  });

  it("skips numeric labels when configured", () => {
    const svg = makeSvg(`
      <g class="node"><rect x="0" y="0" width="10" height="10"></rect><text>1</text></g>
      <g class="node"><rect x="0" y="20" width="10" height="10"></rect><text>Series_A</text></g>
    `);

    const strat = new LabelBasedStrategy("xychart", { skipNumericLabels: true });
    const map = strat.extractNodeIds(svg);

    expect(map.has("1")).toBe(false);
    expect(map.has("Series_A")).toBe(true);
  });
});

