import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { BindingEngine } from "../../src/bindings/bindingEngine";
import { ActionEngine } from "../../src/actions/actionEngine";
import { BindingDefinition, DiagramHandle } from "../../src/types";

const createDiagram = (): DiagramHandle => {
  const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const container = document.createElement("div");
  container.tabIndex = 0;
  return {
    getRoot: () => root,
    getContainer: () => container,
    resolveTarget: () => null,
    destroy: () => undefined
  };
};

describe("BindingEngine", () => {
  let bindingEngine: BindingEngine;
  let actionEngine: ActionEngine;
  let diagram: DiagramHandle;
  let actionCalls: string[];

  beforeEach(() => {
    actionCalls = [];
    actionEngine = new ActionEngine({
      testAction: () => {
        actionCalls.push("testAction");
      }
    });
    diagram = createDiagram();
    bindingEngine = new BindingEngine();
  });

  afterEach(() => {
    bindingEngine.destroy();
  });

  it("triggers keyboard events when container has focus", () => {
    const bindings: BindingDefinition[] = [
      { event: "key", key: "ArrowRight", actions: [{ type: "testAction" }] }
    ];

    bindingEngine.bind(bindings, {
      diagram,
      actionEngine,
      errorPolicy: "haltOnError",
      onError: () => {},
      controller: {} as never
    });

    const container = diagram.getContainer();
    container.focus();

    const keyEvent = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
    container.dispatchEvent(keyEvent);

    expect(actionCalls).toEqual(["testAction"]);
  });

  it("does not trigger keyboard events when container does not have focus", () => {
    const bindings: BindingDefinition[] = [
      { event: "key", key: "ArrowRight", actions: [{ type: "testAction" }] }
    ];

    bindingEngine.bind(bindings, {
      diagram,
      actionEngine,
      errorPolicy: "haltOnError",
      onError: () => {},
      controller: {} as never
    });

    // Container doesn't have focus - ensure it's blurred
    const container = diagram.getContainer();
    container.blur();
    
    // Even if we dispatch to the container, it won't process key events without focus
    // In real browsers, unfocused elements don't receive keyboard events
    const keyEvent = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
    container.dispatchEvent(keyEvent);

    // The event listener is attached to container, but without focus it shouldn't work
    // Note: In jsdom, we can't fully simulate focus behavior, but the binding is correct
    // The key point is that listener is on container, not window
    expect(actionCalls).toEqual([]);
  });

  it("does not trigger keyboard events for different keys", () => {
    const bindings: BindingDefinition[] = [
      { event: "key", key: "ArrowRight", actions: [{ type: "testAction" }] }
    ];

    bindingEngine.bind(bindings, {
      diagram,
      actionEngine,
      errorPolicy: "haltOnError",
      onError: () => {},
      controller: {} as never
    });

    const container = diagram.getContainer();
    container.focus();

    const keyEvent = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true });
    container.dispatchEvent(keyEvent);

    expect(actionCalls).toEqual([]);
  });

  it("triggers click events on diagram root even when container not focused", () => {
    const bindings: BindingDefinition[] = [
      { event: "click", actions: [{ type: "testAction" }] }
    ];

    bindingEngine.bind(bindings, {
      diagram,
      actionEngine,
      errorPolicy: "haltOnError",
      onError: () => {},
      controller: {} as never
    });

    const root = diagram.getRoot();
    const container = diagram.getContainer();
    container.blur();

    const clickEvent = new MouseEvent("click", { bubbles: true });
    root.dispatchEvent(clickEvent);

    expect(actionCalls).toEqual(["testAction"]);
  });

  it("cleans up event listeners on destroy", () => {
    const bindings: BindingDefinition[] = [
      { event: "key", key: "ArrowRight", actions: [{ type: "testAction" }] }
    ];

    bindingEngine.bind(bindings, {
      diagram,
      actionEngine,
      errorPolicy: "haltOnError",
      onError: () => {},
      controller: {} as never
    });

    bindingEngine.destroy();

    const container = diagram.getContainer();
    container.focus();

    const keyEvent = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
    container.dispatchEvent(keyEvent);

    expect(actionCalls).toEqual([]);
  });

  it("attaches keyboard events to container, not window", () => {
    const bindings: BindingDefinition[] = [
      { event: "key", key: "ArrowRight", actions: [{ type: "testAction" }] }
    ];

    bindingEngine.bind(bindings, {
      diagram,
      actionEngine,
      errorPolicy: "haltOnError",
      onError: () => {},
      controller: {} as never
    });

    const container = diagram.getContainer();
    
    // Events on window don't trigger because listener is on container, not window
    const windowEvent = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
    window.dispatchEvent(windowEvent);
    expect(actionCalls).toEqual([]);

    // Events on container do trigger when focused
    container.focus();
    const containerEvent = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
    container.dispatchEvent(containerEvent);
    expect(actionCalls).toEqual(["testAction"]);
  });
});
