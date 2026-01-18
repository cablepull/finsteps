# ADR 0003: Rendering Lifecycle and Cleanup Phase

- **Status:** Accepted
- **Date:** 2025-02-14

## Context

When transitioning between steps in a presentation, multiple visual elements may change simultaneously:
- Camera viewBox (zoom/pan)
- Style highlights (CSS classes)
- Overlay bubbles (DOM elements)

When embedded in presentation frameworks like Reveal.js, these frameworks may also be animating slide transitions, causing DOM instability. Without proper coordination, visual artifacts occur:
- Overlays from previous steps remain visible
- Highlights accumulate across steps
- Camera state conflicts with new step actions
- DOM reads/writes happen during framework animations

## Decision

Implement a cleanup phase at the start of each `goto()` operation that:
1. Clears all overlay bubbles
2. Conditionally resets the camera (unless the step's first action is a camera action)
3. Clears all style highlights
4. Waits for DOM stability using `requestAnimationFrame` before applying new step actions

### Implementation Details

1. **Cleanup Order**:
   ```typescript
   // 1. Clear overlays first (removes DOM elements)
   overlay.clear()
   
   // 2. Reset camera (unless step starts with camera action)
   if (!firstActionIsCamera) {
     camera.reset()
   }
   
   // 3. Clear highlights (removes CSS classes)
   style.clear()
   
   // 4. Wait for DOM stability
   await requestAnimationFrame(() => requestAnimationFrame(resolve))
   ```

2. **Camera Reset Optimization**: Skip camera reset if the step's first action is a camera action (`camera.fit`, `camera.reset`, `camera.fitAll`). This prevents unnecessary viewBox changes when the step immediately sets a new camera state.

3. **DOM Stability Wait**: Two consecutive `requestAnimationFrame` calls ensure:
   - First frame: Browser applies cleanup DOM changes
   - Second frame: Browser has finished layout/paint, ready for new changes

## Consequences

### Positive

- **Clean Transitions**: No visual artifacts from previous steps (ghost overlays, stale highlights)
- **Framework Coordination**: Works correctly with presentation frameworks that animate slide changes
- **Predictable Rendering**: DOM is in a known state before applying new actions
- **Performance**: Avoids unnecessary camera resets when step already manages camera

### Trade-offs

- **Slight Delay**: Two animation frames add ~32ms delay (at 60fps) before new step actions run. This is negligible for presentation use cases.
- **Complexity**: Adds cleanup logic that must be maintained. However, it's centralized in the controller.

## Alternatives Considered

1. **No cleanup**: Let actions handle their own cleanup. Rejected because it leads to state accumulation and visual artifacts.

2. **Single requestAnimationFrame**: Wait only one frame. Rejected because one frame isn't sufficient for some frameworks' animations.

3. **Fixed delay (setTimeout)**: Use a fixed timeout. Rejected because it's less performant and doesn't coordinate with browser rendering.

## References

- `src/controller/controller.ts`: Cleanup phase in `goto()` method
- `src/adapters/basicOverlay.ts`: `clear()` method implementation
- `tests/unit/controller.test.ts`: Tests for cleanup behavior
