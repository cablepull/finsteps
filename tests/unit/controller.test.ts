import { describe, expect, it, vi } from "vitest";
import { MermaidController } from "../../src/controller/controller";
import { ActionHandlerMap, DiagramHandle, PresentationAst } from "../../src/types";

const createDiagram = (): DiagramHandle => {
  const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const container = document.createElement("div");
  return {
    getRoot: () => root,
    getContainer: () => container,
    resolveTarget: () => null,
    destroy: () => undefined
  };
};

describe("MermaidController", () => {
  it("initializes on the first step and navigates by id", async () => {
    const calls: string[] = [];
    const actionHandlers: ActionHandlerMap = {
      log: () => calls.push("log")
    };
    const ast: PresentationAst = {
      steps: [
        { id: "step-1", actions: [{ type: "log" }] },
        { id: "step-2", actions: [{ type: "log" }] }
      ]
    };

    const controller = new MermaidController({
      diagram: createDiagram(),
      ast,
      errorPolicy: "haltOnError",
      actionHandlers
    });

    const states: number[] = [];
    controller.on("stepchange", (state) => {
      states.push((state as { stepIndex: number }).stepIndex);
    });

    await controller.init();
    expect(controller.getState().stepIndex).toBe(0);
    expect(calls).toEqual(["log"]);

    await controller.goto("step-2");
    expect(controller.getState().stepIndex).toBe(1);
    expect(calls).toEqual(["log", "log"]);
    expect(states).toEqual([0, 1]);
  });

  it("emits action errors and halts step progression when configured", async () => {
    const actionHandlers: ActionHandlerMap = {
      fail: () => {
        throw new Error("boom");
      }
    };
    const ast: PresentationAst = {
      steps: [{ id: "step-1", actions: [{ type: "fail" }] }]
    };

    const controller = new MermaidController({
      diagram: createDiagram(),
      ast,
      errorPolicy: "haltOnError",
      actionHandlers
    });

    const errorSpy = vi.fn();
    controller.on("actionerror", errorSpy);

    await controller.init();

    expect(controller.getState().stepIndex).toBe(-1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("clears overlays before applying new step actions", async () => {
    const clearSpy = vi.fn();
    const overlay = {
      showBubble: vi.fn(),
      hideBubble: vi.fn(),
      clear: clearSpy,
      destroy: vi.fn()
    };

    const ast: PresentationAst = {
      steps: [
        {
          id: "step-1",
          actions: [
            {
              type: "overlay.bubble",
              payload: { target: { dataId: "A" }, text: "First bubble" }
            }
          ]
        },
        {
          id: "step-2",
          actions: [
            {
              type: "overlay.bubble",
              payload: { target: { dataId: "B" }, text: "Second bubble" }
            }
          ]
        }
      ]
    };

    const diagram = createDiagram();
    // Mock resolveTarget to return an element
    diagram.resolveTarget = () => document.createElement("div");

    const controller = new MermaidController({
      diagram,
      ast,
      overlay,
      errorPolicy: "haltOnError"
    });

    await controller.init();
    expect(clearSpy).not.toHaveBeenCalled(); // First step doesn't clear

    await controller.goto("step-2");
    expect(clearSpy).toHaveBeenCalledTimes(1); // Should clear before step 2
  });

  it("resets camera before applying new step actions", async () => {
    const resetSpy = vi.fn();
    const camera = {
      fit: vi.fn(),
      reset: resetSpy,
      destroy: vi.fn()
    };

    const ast: PresentationAst = {
      steps: [
        {
          id: "step-1",
          actions: [{ type: "camera.fit", payload: { target: { dataId: "A" } } }]
        },
        {
          id: "step-2",
          actions: [{ type: "camera.fit", payload: { target: { dataId: "B" } } }]
        }
      ]
    };

    const diagram = createDiagram();
    diagram.resolveTarget = () => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      return el;
    };

    const controller = new MermaidController({
      diagram,
      ast,
      camera,
      errorPolicy: "haltOnError"
    });

    await controller.init();
    expect(resetSpy).not.toHaveBeenCalled(); // First step doesn't reset

    await controller.goto("step-2");
    expect(resetSpy).toHaveBeenCalledTimes(1); // Should reset before step 2
  });

  it("clears highlights before applying new step actions", async () => {
    const ast: PresentationAst = {
      steps: [
        {
          id: "step-1",
          actions: [
            {
              type: "style.highlight",
              payload: { target: { dataId: "A" } }
            }
          ]
        },
        {
          id: "step-2",
          actions: [
            {
              type: "style.highlight",
              payload: { target: { dataId: "B" } }
            }
          ]
        }
      ]
    };

    const diagram = createDiagram();
    const elementA = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const elementB = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    elementA.setAttribute("data-id", "A");
    elementB.setAttribute("data-id", "B");
    diagram.getRoot().appendChild(elementA);
    diagram.getRoot().appendChild(elementB);

    diagram.resolveTarget = (target) => {
      if (target?.dataId === "A") return elementA;
      if (target?.dataId === "B") return elementB;
      return null;
    };

    const controller = new MermaidController({
      diagram,
      ast,
      errorPolicy: "haltOnError"
    });

    await controller.init();
    expect(elementA.classList.contains("finsteps-highlight")).toBe(true);

    await controller.goto("step-2");
    // Element A should no longer be highlighted after goto clears highlights
    expect(elementA.classList.contains("finsteps-highlight")).toBe(false);
    expect(elementB.classList.contains("finsteps-highlight")).toBe(true);
  });
});
