# ADR 0004: Animated ViewBox Transitions with requestAnimationFrame

- **Status:** Accepted
- **Date:** 2025-02-14

## Context

When navigating between steps in a presentation, the camera may jump between different parts of a diagram. Instant transitions can be jarring and disorienting, especially for large diagrams. Users requested smooth animated pan/zoom transitions to improve the presentation experience.

The DSL already specified animation support in the ADR (e.g., `durationMs: 500, easing: "cubicOut"`), but the runtime implementation needed to be added.

## Decision

Implement animated viewBox transitions using `requestAnimationFrame` with manual interpolation and a comprehensive easing function library. The `camera.fit()` method accepts optional `duration` and `easing` parameters.

### Implementation Details

1. **Animation Method**: Use `requestAnimationFrame` loop with `performance.now()` timing for precise frame-by-frame interpolation. Directly manipulate SVG `viewBox` attribute rather than CSS transitions.

2. **Easing Functions**: Provide a comprehensive library of easing functions:
   - CSS standard: `linear`, `ease`, `easeIn`, `easeOut`, `easeInOut`
   - Cubic bezier variants: `cubicIn`, `cubicOut`, `cubicInOut` (as specified in ADR 0001)
   - Extended library: `quad`, `quart`, `quint`, `sine`, `expo`, `circ`, `back` variants
   - Default fallback: `easeOut` if invalid easing name provided

3. **Backward Compatibility**: When `duration` is 0, undefined, or negative, use instant transition (existing behavior). This ensures no breaking changes.

4. **ViewBox Interpolation**: Interpolate all four viewBox values (x, y, width, height) independently using the same easing function, ensuring smooth pan and zoom.

5. **Promise-based**: `animateViewBox()` returns a Promise that resolves when animation completes, allowing action handlers to await completion if needed.

### Example Usage

```typescript
// Instant (backward compatible)
camera.fit(target, { padding: 40 })

// Animated with duration and easing
camera.fit(target, { 
  padding: 40, 
  duration: 500, 
  easing: "cubicOut" 
})
```

## Consequences

### Positive

- **Smooth User Experience**: Animated transitions provide visual continuity and reduce disorientation
- **Configurable**: Duration and easing can be customized per action
- **Performant**: `requestAnimationFrame` ensures smooth 60fps animations
- **Backward Compatible**: Existing code without duration continues to work
- **Comprehensive Easing**: Large library of easing functions provides flexibility

### Trade-offs

- **Animation Duration**: Adds delay before step actions complete. Typically 300-700ms, which is acceptable for presentation use cases.
- **Complexity**: Adds animation logic and easing function implementations that must be maintained.
- **No CSS Transitions**: Cannot leverage browser-optimized CSS transitions. However, SVG viewBox isn't directly animatable via CSS, so manual interpolation was necessary.

## Alternatives Considered

1. **CSS Transitions**: Use CSS `transition` on a wrapper element with transform. Rejected because SVG `viewBox` changes don't animate via CSS, and transforms don't provide the same zoom behavior.

2. **Web Animations API**: Use the Web Animations API. Rejected because it requires polyfills for viewBox animation, and `requestAnimationFrame` provides sufficient control with better browser support.

3. **Third-party Animation Library**: Use a library like GSAP or Framer Motion. Rejected because it adds a dependency and `requestAnimationFrame` is sufficient for this use case.

## References

- `src/adapters/basicCamera.ts`: Animation implementation and easing functions
- `src/types.ts`: CameraHandle interface with duration/easing options
- `src/actions/defaultActionHandlers.ts`: Action handler extracting duration/easing
- `examples/walkthrough/index.html`: Examples of animated transitions
- ADR 0001: DSL specification mentioning `durationMs` and `easing` parameters
