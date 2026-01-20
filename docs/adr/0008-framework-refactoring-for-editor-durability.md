# ADR-0008: Framework Refactoring for Editor Durability

## Status
accepted

## Context

The Finsteps framework was originally designed for static presentations where the controller is created once and used throughout the presentation lifecycle. However, when integrating the framework into a live editor (the Finsteps Editor example), several pain points emerged:

1. **Private fields inaccessible**: `controller.deps` (camera, diagram, overlay) and `controller.steps` are private TypeScript fields, forcing workarounds like recreating camera handles from DOM
2. **Silent failures**: When actions fail with `haltOnError`, `goto()` returns early without updating `stepIndex`, leaving inconsistent state that's hard to debug
3. **No lifecycle hooks**: Can't hook into initialization, step transitions, or action execution for editor-specific needs (e.g., updating UI state)
4. **No dynamic updates**: AST is fixed once controller is created; can't add/remove steps or modify actions without recreating the entire controller
5. **Limited observability**: Error events don't provide execution context (which action failed, which step, etc.), making debugging difficult
6. **No access to internal state**: Can't inspect steps, current action, or execution state for debugging or UI updates

These limitations made it difficult to build a responsive, real-time editor that needs to:
- Update UI controls based on controller state
- Handle errors gracefully with user feedback
- Allow dynamic modification of presentations
- Provide debugging information to users

## Decision

We will refactor the framework to support both static presentations and dynamic editor use cases by introducing:

1. **Accessor Pattern**: Add public getter methods (`getDeps()`, `getSteps()`, `getCurrentStep()`, `getActionEngine()`) to expose internal state while maintaining encapsulation
2. **Lifecycle Hooks**: Add optional hooks interface (`onInit`, `onStepChange`, `onActionStart`, `onActionComplete`, `onError`) for editor integration
3. **Enhanced Observability**: Enhance event payloads with execution context and add `getExecutionContext()` method
4. **Dynamic AST Updates**: Add `updateAst()` method to allow updating controller AST without recreating the controller
5. **Error Recovery**: Improve error handling to maintain consistent state, add `retry()` and `clearError()` methods

All changes will be **additive and backward compatible** - existing examples will continue to work without modification.

## Consequences

### Positive
- **Editor integration**: Framework is now suitable for dynamic editor contexts without workarounds
- **Better debugging**: Enhanced observability makes it easier to diagnose issues
- **Flexible state management**: Lifecycle hooks allow editors to react to controller state changes
- **Dynamic presentations**: Can update AST without full controller recreation
- **Consistent error handling**: Error state is tracked and can be recovered from
- **Backward compatible**: All existing examples continue to work without changes

### Negative
- **Increased API surface**: More methods and options to maintain
- **Slight performance overhead**: Hook invocation and enhanced event payloads add minimal overhead
- **Type complexity**: Optional methods in Controller interface increase type complexity

### Neutral
- **Learning curve**: New patterns require documentation and examples
- **Migration path**: Editors can gradually adopt new patterns (all are optional)

## Implementation Notes

### Accessor Pattern
- Getters return copies or read-only views to prevent external mutation
- `getDeps()` returns `{ diagram, camera, overlay }` for direct access
- `getSteps()` returns a copy of the steps array
- `getCurrentStep()` returns current step definition or null

### Lifecycle Hooks
- Hooks are optional and passed via `PresentMermaidOptions.options.hooks`
- Hooks are invoked at appropriate points: `onInit` after initialization, `onStepChange` after step transitions, etc.
- Hook errors are caught and logged to prevent breaking controller execution

### Enhanced Observability
- Event payloads now include context: `stepchange` includes `{ state, previousState, step, previousStep }`
- New events: `actionstart`, `actioncomplete`, `astchange`
- `getExecutionContext()` returns current execution state for debugging

### Dynamic AST Updates
- `updateAst(newAst, { preserveState?: boolean })` allows updating AST without recreation
- If `preserveState: true`, tries to maintain current step (if still valid)
- Rebinds bindings and updates steps array
- Emits `astchange` event

### Error Recovery
- Error state tracked in `ControllerState.errorState`
- `retry()` method retries last failed step/action
- `clearError()` resets error state
- `goto()` now updates `stepIndex` even on error (for error recovery)

## Related
- Implements: Editor requirements for dynamic modification and real-time updates
- Related to: ADR-0001 (Mermaid Presentation DSL), ADR-0003 (Rendering Lifecycle Cleanup)

## Date
2025-01-20
