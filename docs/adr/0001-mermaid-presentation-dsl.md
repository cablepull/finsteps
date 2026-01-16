# ADR 0001: Mermaid Presentation DSL (MPD) for Interactive Diagram Presentations

- **Status:** Proposed
- **Date:** 2025-02-14

## Context
We want a framework-agnostic “presentation layer” that sits on top of a Mermaid-rendered SVG and drives zoom, pan, highlight, and interactive UI. The solution should build on existing open-source components rather than forking Mermaid or embedding custom SVG logic.

Key building blocks:

- **Mermaid render API**: `mermaid.render(...)` returns `{ svg, bindFunctions }`, allowing insertion of the SVG and safe attachment of Mermaid-generated interactions.
- **Stable SVG IDs**: `deterministicIds` and optional `deterministicIDSeed` ensure predictable element targeting.
- **Pan/zoom**: `svg-pan-zoom` (SVG-focused, hookable) or `d3-zoom` (flexible, DOM-agnostic, programmatic control).
- **Popovers**: Tippy.js (Popper-based) for bubbles and overlays.

## Decision
Adopt a **Mermaid Presentation DSL (MPD)** as a companion artifact (YAML or JSON) that is consumed alongside Mermaid text. The runtime accepts:

- Mermaid source text
- MPD document
- DOM mount element

The MPD controls navigation, camera, styling, and UI interactions without requiring Mermaid forks.

### Design goals

1. **Diagram-source independent**: MPD lives adjacent to Mermaid text without requiring Mermaid forks.
2. **Portable**: Works in plain HTML, React, Vue, Svelte, Reveal.js, etc.
3. **Deterministic targeting**: Targets nodes/edges/subgraphs via Mermaid IDs, with fallbacks.
4. **Composable**: Steps are timelines of actions; interactions can trigger steps or ad-hoc actions.

## MPD v0.1 schema (draft)

```yaml
mpd: 0.1

diagram:
  id: "processDiagram"
  mermaid:
    # Optional runtime config hints the host should apply before rendering
    config:
      theme: "neutral"
      securityLevel: "loose"
      deterministicIds: true
      deterministicIDSeed: "process-v1"

runtime:
  camera:
    engine: "svg-pan-zoom"     # or "d3-zoom"
    options:
      maxZoom: 8
      minZoom: 0.2
      zoomSensitivity: 0.2
      smooth: true
  overlay:
    engine: "tippy"
    options:
      theme: "light-border"
  navigation:
    keys:
      next: ["ArrowRight", " "]
      prev: ["ArrowLeft"]
      reset: ["Escape"]
    wheelZoom: true
    dragPan: true

selectors:
  # How to map logical targets (node A) to real SVG elements
  strategy: "mermaid-node-id"
  fallback:
    - "id-contains"   # e.g. element.id contains "-A-"
    - "data-id"       # if present
    - "text-match"    # last resort

styles:
  classes:
    dim: "dimmed"
    active: "active-node"
  spotlight:
    dimOthers: true

steps:
  - name: "Draft standard"
    focus: { node: "A", pad: 48 }
    do:
      - camera.fit: { target: "$focus", durationMs: 500, easing: "cubicOut" }
      - style.spotlight: { active: ["node:A"], dimOthers: true }
      - ui.bubble:
          target: "node:A"
          title: "Step 1"
          body: "Security Architect drafts the enterprise standard."
          placement: "top"
  - name: "EAB review"
    focus: { node: "B", pad: 56 }
    do:
      - camera.fit: { target: "$focus", durationMs: 500 }
      - style.spotlight: { active: ["node:B"], dimOthers: true }
      - ui.bubble:
          target: "node:B"
          title: "Step 2"
          body: "EAB reviews for alignment."

bindings:
  - on: "click"
    target: "node:*"
    run:
      - nav.gotoStepByTarget: { selector: "$target" }

  - on: "key"
    key: "Enter"
    run:
      - nav.next: {}
```

### Key ideas

- **Symbolic targets**: `node:A`, `edge:A->B`, `subgraph:Group1`, or `css:#someId`.
- **Focus**: `focus` defines a bounding box to fit the camera (padding avoids clipping).
- **Actions**: `do` is an ordered list of `namespace.verb` commands.
- **Bindings**: Declarative event mapping without hardcoded JS listeners.

## Action vocabulary (minimum viable set)

### Camera actions

- `camera.fit`: compute bbox of target(s), set transform so bbox fills viewport with padding
- `camera.zoom`: set absolute zoom, optional center target
- `camera.pan`: absolute translate
- `camera.panBy`: relative translate
- `camera.reset`: return to initial view

### Styling actions

- `style.classAdd`, `style.classRemove`, `style.classToggle`
- `style.spotlight` (adds dim class to everything, active class to targets)
- `style.pulse` (CSS animation class for emphasis)
- `style.edgeEmphasis` (apply stroke/width class on edge paths)

### UI actions

- `ui.bubble` (popover anchored to SVG element; rendered outside SVG to avoid clipping)
- `ui.panel` (side panel markdown/html)
- `ui.callout` (arrow + label overlay; optional)

### Navigation actions

- `nav.next`, `nav.prev`, `nav.goto`
- `nav.gotoStepByTarget` (click a node -> jump to step that focuses it)

## Targeting rules

Mermaid’s SVG IDs are made deterministic with:

- `deterministicIds: true`
- optional `deterministicIDSeed: "string"`

Resolution order:

1. **Preferred**: element whose ID encodes the Mermaid node ID (common in practice).
2. **Fallback strategies** (configurable): `id-contains`, `data-id`, `text-match`.

Additionally, Mermaid’s `bindFunctions` API allows the runtime to attach Mermaid-generated interactions after inserting the SVG.

## Host API (embedding)

Minimal JS surface:

```ts
presentMermaid({
  mermaidText: string,
  mpd: object | string,        // YAML or JSON
  mountEl: HTMLElement,
  engines?: {
    camera?: "svg-pan-zoom" | "d3-zoom",
    overlay?: "tippy" | "none"
  }
}): {
  goto(stepIndexOrName: number | string): void,
  next(): void,
  prev(): void,
  destroy(): void,
  getState(): unknown
}
```

Example usage:

```js
const presenter = presentMermaid({
  mermaidText,
  mpd,
  mountEl: document.getElementById("diagram")
});

presenter.next();
```

## Consequences

- **Positive**: Framework-agnostic, composable interactions; keeps Mermaid as-is; predictable targeting.
- **Trade-offs**: Requires a runtime adapter for each camera/overlay engine; multiple fallback selector strategies must be maintained.

## References

- Mermaid render API: `mermaid.render(...)`
- `svg-pan-zoom`
- `d3-zoom`
- Tippy.js
