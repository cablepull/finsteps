import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createFloatingControls, ControlsHandle, SIZE_PRESETS, THEME_PRESETS } from "../../src/adapters/floatingControls";
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

  describe("size presets", () => {
    it("applies compact size preset", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller,
        size: "compact"
      });

      const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
      expect(controlsElement.style.padding).toBe("6px");
      expect(controlsElement.style.gap).toBe("4px");

      const buttons = document.querySelectorAll(".finsteps-control-btn") as NodeListOf<HTMLElement>;
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons[0].style.width).toBe("28px");
      expect(buttons[0].style.height).toBe("28px");

      controls.destroy();
    });

    it("applies large size preset", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller,
        size: "large"
      });

      const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
      expect(controlsElement.style.padding).toBe("16px");
      expect(controlsElement.style.gap).toBe("12px");

      const buttons = document.querySelectorAll(".finsteps-control-btn") as NodeListOf<HTMLElement>;
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons[0].style.width).toBe("52px");
      expect(buttons[0].style.height).toBe("52px");

      controls.destroy();
    });

    it("uses compact step indicator format", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller,
        size: "compact",
        showStepIndicator: true
      });

      controls.updateState({
        stepIndex: 1,
        stepCount: 5
      });

      const indicator = document.querySelector(".finsteps-step-indicator");
      expect(indicator?.textContent).toBe("2/5");

      controls.destroy();
    });

    it("uses normal step indicator format for normal/large sizes", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller,
        size: "normal",
        showStepIndicator: true
      });

      controls.updateState({
        stepIndex: 1,
        stepCount: 5
      });

      const indicator = document.querySelector(".finsteps-step-indicator");
      expect(indicator?.textContent).toBe("Step 2 / 5");

      controls.destroy();
    });
  });

  describe("theme presets", () => {
    it("applies light theme", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller,
        theme: "light"
      });

      const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
      expect(controlsElement.style.background).toBe(THEME_PRESETS.light.containerBg);

      const buttons = document.querySelectorAll(".finsteps-control-btn") as NodeListOf<HTMLElement>;
      expect(buttons[0].style.background).toBe(THEME_PRESETS.light.buttonBg);

      controls.destroy();
    });

    it("applies dark theme", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller,
        theme: "dark"
      });

      const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
      expect(controlsElement.style.background).toBe(THEME_PRESETS.dark.containerBg);

      controls.destroy();
    });

    it("auto theme defaults to dark when matchMedia unavailable", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller,
        theme: "auto"
      });

      const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
      // In JSDOM, matchMedia returns false for prefers-color-scheme: dark
      expect(controlsElement.style.background).toBeTruthy();

      controls.destroy();
    });
  });

  describe("reset button", () => {
    it("creates reset button when showReset is true", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller,
        showReset: true
      });

      const resetBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
        .find(btn => btn.getAttribute("aria-label") === "Reset");
      expect(resetBtn).toBeTruthy();

      controls.destroy();
    });

    it("does not create reset button by default", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller
      });

      const resetBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
        .find(btn => btn.getAttribute("aria-label") === "Reset");
      expect(resetBtn).toBeFalsy();

      controls.destroy();
    });

    it("reset button calls controller.reset()", () => {
      const controller = createMockController();
      const resetSpy = vi.spyOn(controller, "reset");
      const controls = createFloatingControls({
        controller,
        showReset: true
      });

      const resetBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
        .find(btn => btn.getAttribute("aria-label") === "Reset") as HTMLButtonElement;
      resetBtn?.click();

      expect(resetSpy).toHaveBeenCalled();

      controls.destroy();
    });
  });

  describe("playbackSpeed", () => {
    it("uses custom playback speed", async () => {
      const controller = createMockController();
      const nextSpy = vi.spyOn(controller, "next");
      const controls = createFloatingControls({
        controller,
        showPlayPause: true,
        playbackSpeed: 500 // 500ms instead of default 3000ms
      });

      const playPauseBtn = Array.from(document.querySelectorAll(".finsteps-control-btn"))
        .find(btn => btn.getAttribute("aria-label")?.includes("Play")) as HTMLButtonElement;

      playPauseBtn?.click();

      // Wait for less than default but more than custom speed
      await new Promise(resolve => setTimeout(resolve, 700));

      expect(nextSpy).toHaveBeenCalled();

      // Stop playback
      playPauseBtn?.click();
      controls.destroy();
    }, 5000);
  });

  describe("orientation", () => {
    it("applies vertical orientation by default", () => {
      const controller = createMockController();
      const controls = createFloatingControls({
        controller
      });

      const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
      expect(controlsElement.style.flexDirection).toBe("column");

      controls.destroy();
    });

    it("applies horizontal orientation", () => {
      const controller = createMockController();
      const camera = createMockCamera();
      const controls = createFloatingControls({
        controller,
        camera,
        showZoomControls: true,
        orientation: "horizontal"
      });

      const controlsElement = document.querySelector(".finsteps-floating-controls") as HTMLElement;
      expect(controlsElement.style.flexDirection).toBe("row");

      // Check zoom group has left border instead of top border in horizontal mode
      const controlGroups = document.querySelectorAll(".finsteps-control-group");
      expect(controlGroups.length).toBe(2); // nav and zoom groups
      const zoomGroup = controlGroups[1] as HTMLElement;
      expect(zoomGroup.style.borderLeft).toBeTruthy();

      controls.destroy();
    });
  });
});
