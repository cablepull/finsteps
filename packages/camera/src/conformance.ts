import { describe, expect, it } from "vitest";
import type { CameraAdapter, Transform } from "./types";

export type AdapterFactory = (args: { viewportEl: HTMLElement }) => CameraAdapter;

export const defineCameraAdapterConformanceTests = (
  name: string,
  factory: AdapterFactory
) => {
  describe(`camera adapter conformance: ${name}`, () => {
    it("round-trips transform values", () => {
      const viewportEl = document.createElement("div");
      viewportEl.getBoundingClientRect = () => ({
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        toJSON: () => ({})
      });
      const adapter = factory({ viewportEl });
      adapter.init();

      const target: Transform = { x: 120, y: -80, scale: 1.5 };
      adapter.setTransform(target);

      const result = adapter.getTransform();
      expect(result).toEqual(target);

      adapter.destroy();
    });

    it("returns viewport dimensions", () => {
      const viewportEl = document.createElement("div");
      viewportEl.getBoundingClientRect = () => ({
        width: 1024,
        height: 768,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 1024,
        bottom: 768,
        toJSON: () => ({})
      });
      const adapter = factory({ viewportEl });
      adapter.init();

      expect(adapter.getViewportRect()).toEqual({ width: 1024, height: 768 });

      adapter.destroy();
    });
  });
};
