# ADR-0010: Floating Controls Feature

## Status
accepted

## Context

The Finsteps framework currently provides a Controller API for programmatic navigation (next, prev, goto, reset) and supports camera/overlay adapters for visual presentation. However, there is no built-in UI controls component for end users to interact with presentations.

Users currently must:
- Build their own control UI from scratch
- Manually wire up buttons to controller methods
- Handle state synchronization between controller and UI
- Implement play/pause auto-advance logic themselves
- Create zoom controls separately

This creates friction for:
- Presentation authors who want quick, out-of-the-box controls
- Framework users who want consistent UI patterns
- Developers embedding presentations who need controls but don't want to build them

Additionally, the framework follows a pattern of DSL configuration + runtime adapters (camera, overlay), but controls are not part of this pattern.

## Decision

We will add floating icon controls as an optional core framework feature that follows the existing adapter pattern:

1. **DSL Configuration**: Add `controls` block to `runtime { ... }` in MPD grammar for declarative configuration
2. **Runtime Adapter**: Create `ControlsHandle` interface and `createFloatingControls()` factory function, mirroring `CameraHandle` and `OverlayHandle` patterns
3. **Icon Library**: Use Lucide Icons (tree-shakeable, framework-agnostic SVG icons) for consistent, professional iconography
4. **Control Groups**: Organize controls into logical groups:
   - Navigation: Previous, Play/Pause, Next (separate buttons to differentiate auto-advance from manual step)
   - Zoom: Zoom Out, Step Indicator, Zoom In
   - Tertiary: Fit All (optional, collapsible)
5. **Framework-Agnostic**: Pure DOM manipulation, no React/Vue dependencies
6. **Optional Feature**: Can be omitted for headless mode or custom implementations

The controls will:
- Integrate with Controller API (next, prev, goto, play/pause)
- Integrate with Camera API (zoom, fitAll, reset)
- Update automatically on controller state changes
- Support both DSL configuration and JavaScript override
- Be visually distinct (play/pause vs next/prev buttons)
- Be responsive and mobile-friendly

## Consequences

### Positive
- **Out-of-the-box controls**: Users get working controls without custom code
- **Consistent UX**: Standardized control patterns across presentations
- **DSL-driven**: Controls can be configured declaratively in MPD
- **Flexible**: JavaScript can override DSL settings or provide custom implementations
- **Framework-agnostic**: Works with any JavaScript environment
- **Backward compatible**: All existing code continues to work (controls are optional)
- **Follows existing patterns**: Mirrors camera/overlay adapter architecture

### Negative
- **Bundle size**: Adds Lucide Icons dependency (~2KB per icon, tree-shakeable)
- **API surface**: Adds new `ControlsHandle` interface and configuration options
- **Maintenance**: Another adapter to maintain and test
- **DSL complexity**: Adds new grammar rules to MPD

### Neutral
- **Learning curve**: Users need to learn controls configuration syntax
- **Customization**: Users may still need custom controls for advanced use cases
- **Positioning**: Floating controls may overlap content (mitigated by configurable positioning)

## Implementation Notes

### DSL Grammar
Controls configuration in MPD:
```mpd
runtime {
  controls {
    mode: "floating";
    position: "bottom-right";
    showPlayPause: true;
    showPrevNext: true;
    showZoomControls: true;
    showStepIndicator: true;
    autoHide: false;
    offset: { x: 20, y: 20 };
  }
}
```

### Runtime Adapter
```typescript
export interface ControlsHandle {
  show(): void;
  hide(): void;
  updateState(state: ControllerState): void;
  destroy(): void;
}

const controls = createFloatingControls({
  controller,
  camera,
  position: 'bottom-right',
  showPlayPause: true,
  // ... other options
});
```

### Integration Pattern
- Controls adapter is created in `presentMermaid()` if DSL config exists or JS option provided
- Controller state changes trigger `updateState()` calls
- Controls subscribe to controller events for real-time updates
- Lifecycle: created on init, destroyed on controller destroy

### Icon Strategy
- Use Lucide Icons for consistency and quality
- Import only needed icons (tree-shakeable)
- Icons: ChevronLeft, ChevronRight, Play, Pause, ZoomIn, ZoomOut, Maximize2, Circle/Dot
- Fallback to Unicode symbols if Lucide unavailable (graceful degradation)

## Related
- Implements: REQ-FRAMEWORK-001 (Floating Controls Feature)
- Related to: ADR-0001 (Mermaid Presentation DSL), ADR-0008 (Framework Refactoring for Editor Durability)
- Follows pattern: Camera and Overlay adapters

## Date
2025-01-23
