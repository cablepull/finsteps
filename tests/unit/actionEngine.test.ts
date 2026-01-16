import { describe, expect, it } from "vitest";
import { ActionEngine } from "../../src/actions/actionEngine";
import { ActionDefinition } from "../../src/types";

describe("ActionEngine", () => {
  it("runs actions sequentially including async", async () => {
    const calls: string[] = [];
    const engine = new ActionEngine({
      sync: () => calls.push("sync"),
      async: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        calls.push("async");
      }
    });
    const actions: ActionDefinition[] = [{ type: "sync" }, { type: "async" }];
    const diagram = {
      getRoot: () => document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      getContainer: () => document.body,
      resolveTarget: () => null,
      destroy: () => undefined
    };
    await engine.run(actions, { controller: {} as never, diagram }, "haltOnError");
    expect(calls).toEqual(["sync", "async"]);
  });

  it("returns errors when continueOnError", async () => {
    const engine = new ActionEngine({
      fail: () => {
        throw new Error("boom");
      }
    });
    const diagram = {
      getRoot: () => document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      getContainer: () => document.body,
      resolveTarget: () => null,
      destroy: () => undefined
    };
    const errors = await engine.run(
      [{ type: "fail" }],
      { controller: {} as never, diagram },
      "continueOnError"
    );
    expect(errors).toHaveLength(1);
  });
});
