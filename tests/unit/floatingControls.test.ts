import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createFloatingControls, ControlsHandle } from "../../src/adapters/floatingControls";
import { Controller, ControllerState, CameraHandle } from "../../src/types";

// Mock controller
const createMockController = (): Controller => {
  let stepIndex = 0;
  const stepCount = 3;
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  const steps = [
    { id: "step-1", name: "Step 1", actions: [] },
    { id: "step-2", name: "Step 2", actions: [] },
    { id: "step-3", name: "Step 3", actions: [] }
  ];

  const getState = (): ControllerState => {
    return {
      stepIndex,
      stepCount,
      stepId: `step-${stepIndex + 1}`
    };
  };

  return {
    async next() {
      if (stepIndex < stepCount - 1) {
        stepIndex++;
        const state = getState();
        listeners.get("stepchange")?.forEach(fn => fn({ state }));
      }
    },
    async prev() {
      if (stepIndex > 0) {
        stepIndex--;
        const state = getState();
        listeners.get("stepchange")?.forEach(fn => fn({ state }));
      }
    },
    async goto() {},
    async reset() {
      stepIndex = 0;
    },
    destroy() {},
    getState,
    async setState() {},
    getSteps() {
      return steps;
    },
    on(event: string, handler: (payload: unknown) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
      return () => {
        listeners.get(event)?.delete(handler);
      };
    }
  };
};

const createMockCamera = (): CameraHandle => {
  return {
    fit: vi.fn(),
    reset: vi.fn(),
    zoom: vi.fn(),
    pan: vi.fn(),
    fitAll: vi.fn(),
    destroy: vi.fn()
  };
};

describe("createFloatingControls", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates controls handle with required methods", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller
    });

    expect(controls).toBeDefined();
    expect(typeof controls.show).toBe("function");
    expect(typeof controls.hide).toBe("function");
    expect(typeof controls.updateState).toBe("function");
    expect(typeof controls.destroy).toBe("function");

    controls.destroy();
  });

  it("creates controls UI in DOM", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller
    });

    const controlsElement = document.querySelector(".finsteps-floating-controls");
    expect(controlsElement).toBeTruthy();

    controls.destroy();
  });

  it("positions controls correctly", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller,
      position: "bottom-left"
    });

    const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
    expect(controlsElement).toBeTruthy();
    expect(controlsElement.style.left).toBeTruthy();
    expect(controlsElement.style.bottom).toBeTruthy();

    controls.destroy();
  });

  it("shows/hides controls", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller
    });

    const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
    expect(controlsElement.style.display).not.toBe("none");

    controls.hide();
    expect(controlsElement.style.display).toBe("none");

    controls.show();
    expect(controlsElement.style.display).toBe("flex");

    controls.destroy();
  });

  it("updates state correctly", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller,
      showStepIndicator: true
    });

    const state: ControllerState = {
      stepIndex: 1,
      stepCount: 5,
      stepId: "step-2"
    };

    controls.updateState(state);

    const indicator = document.querySelector(".finsteps-step-indicator");
    expect(indicator).toBeTruthy();
    expect(indicator?.textContent).toContain("Step 2 / 5");

    controls.destroy();
  });

  it("creates navigation buttons when enabled", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller,
      showPrevNext: true,
      showPlayPause: true
    });

    const buttons = document.querySelectorAll(".finsteps-control-btn");
    expect(buttons.length).toBeGreaterThan(0);

    controls.destroy();
  });

  it("creates zoom controls when camera provided", () => {
    const controller = createMockController();
    const camera = createMockCamera();
    const controls = createFloatingControls({
      controller,
      camera,
      showZoomControls: true
    });

    const buttons = document.querySelectorAll(".finsteps-control-btn");
    // Should have nav buttons + zoom buttons
    expect(buttons.length).toBeGreaterThan(3);

    controls.destroy();
  });

  it("handles play/pause functionality", async () => {
    const controller = createMockController();
    const nextSpy = vi.spyOn(controller, "next");
    const controls = createFloatingControls({
      controller,
      showPlayPause: true
    });

    const playPauseBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
      .find(btn => btn.getAttribute("aria-label")?.includes("Play") || btn.getAttribute("aria-label")?.includes("Pause"));

    expect(playPauseBtn).toBeTruthy();

    // Verify initial state is play
    const iconSpan = playPauseBtn?.querySelector(".finsteps-control-icon");
    expect(iconSpan?.textContent).toBe("▶");

    // Click play - should start playback
    if (playPauseBtn) {
      (playPauseBtn as HTMLButtonElement).click();
    }

    // Verify icon changed to pause
    expect(iconSpan?.textContent).toBe("⏸");

    // Wait for interval to trigger (playback interval is 3000ms)
    await new Promise(resolve => setTimeout(resolve, 3200));

    // Should have called next after interval
    expect(nextSpy).toHaveBeenCalled();

    // Click pause - should stop playback
    if (playPauseBtn) {
      (playPauseBtn as HTMLButtonElement).click();
    }

    // Verify icon changed back to play
    expect(iconSpan?.textContent).toBe("▶");

    const callCountBefore = nextSpy.mock.calls.length;
    
    // Wait a bit more - should not call next again since paused
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(nextSpy.mock.calls.length).toBe(callCountBefore);

    controls.destroy();
  }, 10000); // Increase timeout for this test

  it("respects showPrevNext option", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller,
      showPrevNext: false
    });

    const prevBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
      .find(btn => btn.getAttribute("aria-label")?.includes("Previous"));
    const nextBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
      .find(btn => btn.getAttribute("aria-label")?.includes("Next"));

    expect(prevBtn).toBeFalsy();
    expect(nextBtn).toBeFalsy();

    controls.destroy();
  });

  it("cleans up on destroy", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller
    });

    const controlsElement = document.querySelector(".finsteps-floating-controls");
    expect(controlsElement).toBeTruthy();

    controls.destroy();

    const controlsElementAfter = document.querySelector(".finsteps-floating-controls");
    expect(controlsElementAfter).toBeFalsy();
  });

  it("updates button states based on step index", () => {
    const controller = createMockController();
    const controls = createFloatingControls({
      controller,
      showPrevNext: true
    });

    // At first step, prev should be disabled
    controls.updateState({
      stepIndex: 0,
      stepCount: 3
    });

    const prevBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
      .find(btn => btn.getAttribute("aria-label")?.includes("Previous")) as HTMLButtonElement;
    
    if (prevBtn) {
      expect(prevBtn.disabled).toBe(true);
      expect(prevBtn.style.opacity).toBe("0.5");
    }

    // At last step, next should be disabled
    controls.updateState({
      stepIndex: 2,
      stepCount: 3
    });

    const nextBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
      .find(btn => btn.getAttribute("aria-label")?.includes("Next")) as HTMLButtonElement;
    
    if (nextBtn) {
      expect(nextBtn.disabled).toBe(true);
      expect(nextBtn.style.opacity).toBe("0.5");
    }

    controls.destroy();
  });
});
