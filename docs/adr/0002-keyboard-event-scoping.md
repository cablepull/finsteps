# ADR 0002: Keyboard Event Scoping to Diagram Container

- **Status:** Accepted
- **Date:** 2025-02-14

## Context

Finsteps needs keyboard navigation (arrow keys, space, etc.) for step navigation, but must integrate cleanly with presentation frameworks like Reveal.js, which also use keyboard events for slide navigation. Without proper scoping, keyboard events from Finsteps would conflict with the host framework, causing both systems to respond to the same keys.

Additionally, when embedded in pages with input fields, text areas, or other interactive elements, we don't want Finsteps keyboard handlers to interfere with normal text input and form interactions.

## Decision

Scope keyboard event listeners to the diagram container element instead of the global `window` object. The diagram container is made focusable via `tabIndex="0"` and `role="application"` to indicate it's an interactive application widget.

### Implementation Details

1. **Event Target**: Keyboard event listeners are attached to `diagram.getContainer()` rather than `window` for all `event: "key"` bindings.

2. **Focusability**: The diagram container receives `tabIndex="0"` and `role="application"` attributes during initialization, making it keyboard-focusable and semantically indicating it's an interactive application.

3. **Default Target Logic**: In `BindingEngine`, the default target for keyboard events is `context.diagram.getContainer()`, while other events (click, hover) default to `context.diagram.getRoot()` (the SVG element).

4. **Focus Requirement**: Keyboard navigation only works when the diagram container has focus. Users must click or tab into the diagram to activate keyboard controls.

## Consequences

### Positive

- **No Conflicts**: Keyboard events don't interfere with presentation frameworks (Reveal.js, Impress.js, etc.) that listen on `window` or `document`.
- **Explicit Activation**: Users explicitly activate keyboard navigation by focusing the diagram, providing clear affordance.
- **Accessible**: The `role="application"` attribute helps screen readers understand this is an interactive widget.
- **Page Compatibility**: Input fields and other page elements continue to work normally without interference.

### Trade-offs

- **Explicit Focus Required**: Users must click or tab into the diagram before keyboard navigation works. This is intentional but may be surprising if users expect global keyboard control.
- **Additional UX Consideration**: Documentation or UI hints may be needed to indicate that the diagram needs focus for keyboard navigation.

## Alternatives Considered

1. **Global listeners with key modifier**: Use global listeners but require a modifier key (e.g., `Ctrl+Arrow`). Rejected because it adds friction and complexity.

2. **Event delegation with target checking**: Listen on window but check if the event target is within the diagram. Rejected because it's less explicit and harder to reason about.

3. **Framework-specific integration**: Detect presence of presentation frameworks and conditionally scope. Rejected because it adds complexity and maintenance burden.

## References

- `src/bindings/bindingEngine.ts`: Default target logic for keyboard events
- `src/adapters/mermaidDiagram.ts`: Container focusability attributes
- `tests/unit/bindingEngine.test.ts`: Tests for keyboard event scoping
- `tests/e2e/controller.spec.ts`: E2E tests for focus-based keyboard navigation
