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
});
