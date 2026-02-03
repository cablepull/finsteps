import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { discoverDiagrams } from "../../src/integrations/revealjs/discovery";
import { setupFragmentSync } from "../../src/integrations/revealjs/fragmentSync";
import { FinstepsRevealPlugin } from "../../src/integrations/revealjs/plugin";
import type { RevealApi, RevealEvent } from "../../src/integrations/revealjs/types";
import type { Controller } from "../../src/types";

// Mock controller
const createMockController = (): Controller => {
  let stepIndex = 0;
  const stepCount = 3;
  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  const getState = () => ({
    stepIndex,
    stepCount,
    stepId: `step-${stepIndex + 1}`
  });

  return {
    async next() {
      if (stepIndex < stepCount - 1) {
        stepIndex++;
        listeners.get("stepchange")?.forEach((fn) => fn({ state: getState() }));
      }
    },
    async prev() {
      if (stepIndex > 0) {
        stepIndex--;
        listeners.get("stepchange")?.forEach((fn) => fn({ state: getState() }));
      }
    },
    async goto(step: number | string) {
      const idx = typeof step === "number" ? step : parseInt(step, 10);
      if (idx >= 0 && idx < stepCount) {
        stepIndex = idx;
        listeners.get("stepchange")?.forEach((fn) => fn({ state: getState() }));
      }
    },
    async reset() {
      stepIndex = 0;
      listeners.get("stepchange")?.forEach((fn) => fn({ state: getState() }));
    },
    destroy() {},
    getState,
    async setState() {},
    getSteps() {
      return [
        { id: "step-1", actions: [] },
        { id: "step-2", actions: [] },
        { id: "step-3", actions: [] }
      ];
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

// Mock Reveal.js API
const createMockReveal = (): RevealApi & {
  _trigger: (event: string, data: Partial<RevealEvent>) => void;
  _currentSlide: HTMLElement | null;
} => {
  const listeners = new Map<string, Set<(event: RevealEvent) => void>>();
  let currentSlide: HTMLElement | null = null;

  return {
    _currentSlide: currentSlide,
    _trigger(event: string, data: Partial<RevealEvent>) {
      const fullEvent: RevealEvent = {
        currentSlide: data.currentSlide || document.createElement("section"),
        indexh: data.indexh ?? 0,
        indexv: data.indexv ?? 0,
        ...data
      };
      listeners.get(event)?.forEach((fn) => fn(fullEvent));
    },
    on(event: string, callback: (event: RevealEvent) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(callback);
    },
    off(event: string, callback: (event: RevealEvent) => void) {
      listeners.get(event)?.delete(callback);
    },
    getSlides() {
      return [];
    },
    getCurrentSlide() {
      return currentSlide || document.createElement("section");
    },
    getIndices() {
      return { h: 0, v: 0 };
    },
    getSlidePastCount() {
      return 0;
    },
    isReady() {
      return true;
    }
  };
};

describe("discoverDiagrams", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("discovers diagrams with data-finsteps attribute", () => {
    container.innerHTML = `
      <div data-finsteps>
        <pre class="finsteps-mermaid">flowchart LR; A-->B</pre>
        <script type="application/finsteps+json">{"steps": [{"id": "s1", "actions": []}]}</script>
      </div>
    `;

    const diagrams = discoverDiagrams(container);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0].mermaidText).toBe("flowchart LR; A-->B");
    expect(diagrams[0].ast.steps).toHaveLength(1);
  });

  it("parses controls options from data attributes", () => {
    container.innerHTML = `
      <div data-finsteps
           data-finsteps-controls="bottom-left"
           data-finsteps-controls-size="compact"
           data-finsteps-controls-theme="light">
        <pre class="finsteps-mermaid">flowchart LR; A-->B</pre>
        <script type="application/finsteps+json">{"steps": [{"id": "s1", "actions": []}]}</script>
      </div>
    `;

    const diagrams = discoverDiagrams(container);
    expect(diagrams[0].controlsPosition).toBe("bottom-left");
    expect(diagrams[0].controlsSize).toBe("compact");
    expect(diagrams[0].controlsTheme).toBe("light");
  });

  it("handles multiple diagrams", () => {
    container.innerHTML = `
      <div data-finsteps>
        <pre class="finsteps-mermaid">flowchart LR; A-->B</pre>
        <script type="application/finsteps+json">{"steps": [{"id": "s1", "actions": []}]}</script>
      </div>
      <div data-finsteps>
        <pre class="finsteps-mermaid">flowchart TD; X-->Y</pre>
        <script type="application/finsteps+json">{"steps": [{"id": "s2", "actions": []}]}</script>
      </div>
    `;

    const diagrams = discoverDiagrams(container);
    expect(diagrams).toHaveLength(2);
  });

  it("skips elements without mermaid content", () => {
    container.innerHTML = `
      <div data-finsteps>
        <script type="application/finsteps+json">{"steps": []}</script>
      </div>
    `;

    const diagrams = discoverDiagrams(container);
    expect(diagrams).toHaveLength(0);
  });

  it("skips elements without AST configuration", () => {
    container.innerHTML = `
      <div data-finsteps>
        <pre class="finsteps-mermaid">flowchart LR; A-->B</pre>
      </div>
    `;

    const diagrams = discoverDiagrams(container);
    expect(diagrams).toHaveLength(0);
  });

  it("supports application/json script type", () => {
    container.innerHTML = `
      <div data-finsteps>
        <pre class="finsteps-mermaid">flowchart LR; A-->B</pre>
        <script type="application/json">{"steps": [{"id": "s1", "actions": []}]}</script>
      </div>
    `;

    const diagrams = discoverDiagrams(container);
    expect(diagrams).toHaveLength(1);
  });
});

describe("setupFragmentSync", () => {
  let reveal: ReturnType<typeof createMockReveal>;
  let slideElement: HTMLElement;
  let controller: Controller;

  beforeEach(() => {
    reveal = createMockReveal();
    slideElement = document.createElement("section");
    controller = createMockController();
    document.body.appendChild(slideElement);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("advances to step when fragment is shown", () => {
    slideElement.innerHTML = `
      <span class="fragment" data-finsteps-step="1"></span>
      <span class="fragment" data-finsteps-step="2"></span>
    `;

    const gotoSpy = vi.spyOn(controller, "goto");
    const handle = setupFragmentSync({ reveal, slideElement, controller });

    const fragment = slideElement.querySelector('[data-finsteps-step="1"]') as HTMLElement;
    reveal._trigger("fragmentshown", {
      currentSlide: slideElement,
      fragment,
      indexh: 0,
      indexv: 0
    });

    expect(gotoSpy).toHaveBeenCalledWith(1);

    handle.destroy();
  });

  it("goes to previous step when fragment is hidden", () => {
    slideElement.innerHTML = `
      <span class="fragment" data-finsteps-step="1"></span>
      <span class="fragment" data-finsteps-step="2"></span>
    `;

    const gotoSpy = vi.spyOn(controller, "goto");
    const handle = setupFragmentSync({ reveal, slideElement, controller });

    const fragment = slideElement.querySelector('[data-finsteps-step="2"]') as HTMLElement;
    reveal._trigger("fragmenthidden", {
      currentSlide: slideElement,
      fragment,
      indexh: 0,
      indexv: 0
    });

    expect(gotoSpy).toHaveBeenCalledWith(1); // step 2 - 1 = step 1

    handle.destroy();
  });

  it("ignores fragments from other slides", () => {
    slideElement.innerHTML = `
      <span class="fragment" data-finsteps-step="1"></span>
    `;

    const otherSlide = document.createElement("section");
    otherSlide.innerHTML = `
      <span class="fragment" data-finsteps-step="5"></span>
    `;
    document.body.appendChild(otherSlide);

    const gotoSpy = vi.spyOn(controller, "goto");
    const handle = setupFragmentSync({ reveal, slideElement, controller });

    // Trigger fragment from other slide
    const otherFragment = otherSlide.querySelector('[data-finsteps-step="5"]') as HTMLElement;
    reveal._trigger("fragmentshown", {
      currentSlide: otherSlide,
      fragment: otherFragment,
      indexh: 1,
      indexv: 0
    });

    expect(gotoSpy).not.toHaveBeenCalled();

    handle.destroy();
  });

  it("cleans up event listeners on destroy", () => {
    // Add fragments so listeners are actually set up
    slideElement.innerHTML = `
      <span class="fragment" data-finsteps-step="1"></span>
    `;

    const offSpy = vi.spyOn(reveal, "off");
    const handle = setupFragmentSync({ reveal, slideElement, controller });

    handle.destroy();

    expect(offSpy).toHaveBeenCalledWith("fragmentshown", expect.any(Function));
    expect(offSpy).toHaveBeenCalledWith("fragmenthidden", expect.any(Function));
  });
});

describe("FinstepsRevealPlugin", () => {
  it("creates a plugin with correct id", () => {
    const plugin = FinstepsRevealPlugin();
    expect(plugin.id).toBe("finsteps");
    expect(typeof plugin.init).toBe("function");
  });

  it("accepts configuration options", () => {
    const plugin = FinstepsRevealPlugin({
      defaultControlsPosition: "bottom-left",
      defaultControlsSize: "compact",
      defaultControlsTheme: "light",
      showControls: true,
      syncWithFragments: true,
      resetOnSlideChange: false
    });

    expect(plugin.id).toBe("finsteps");
  });

  it("has destroy method", () => {
    const plugin = FinstepsRevealPlugin();
    expect(typeof plugin.destroy).toBe("function");
  });
});
