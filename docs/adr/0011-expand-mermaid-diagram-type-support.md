# ADR-0011: Expand Mermaid Diagram Type Support

## Status
accepted

## Context
Finsteps relies on Mermaid-rendered SVGs to support interactive presentation behavior (camera fit, highlighting, overlays). The editor and runtime depend on stable target resolution via `target: { dataId: "..." }`.

Today, supported diagram types are limited to a subset of Mermaid syntaxes (e.g. flowchart, class, ER, sequence, etc.). When users provide other Mermaid syntaxes (e.g. mindmap, xychart, sankey), the framework can often still render an SVG, but:
- `data-id` attributes are not reliably assigned for targetable elements
- the editor cannot populate the “Available Targets” list
- MPD starter generation can fail or generate unusable steps, leading to parse/validation errors

We want to expand support to additional Mermaid diagram types while preserving:
- framework-agnostic runtime behavior
- predictable target resolution for actions (`camera.fit`, `style.highlight`, `overlay.bubble`)
- editor-grade usability (auto-generated MPD based on targets)

## Decision
We will expand Mermaid diagram type support by:

1. **Adding explicit diagram type detection** for new Mermaid syntaxes (e.g. `mindmap`, `xychart`, `kanban`, `packet`, `radar`, `sankey`, `treemap`, `zenuml`).

2. **Implementing per-diagram “strategy” adapters** that conform to the existing `DiagramStrategy` interface, providing:
   - extraction of stable logical IDs from the rendered SVG
   - CSS selector generation for resolving `dataId` targets
   - (optional) adjacency discovery for camera-fit context

3. **Preferring stable, user-facing IDs** when Mermaid includes them in the SVG structure; otherwise using **text-based fallback extraction** (e.g. node labels) to produce consistent `data-id` values.

4. **Maintaining backward compatibility** by leaving existing strategies unchanged and using the strategy registry as the single dispatch mechanism based on detected diagram type.

5. **Providing examples and tests for each new type** to prevent regressions and document expected behavior.

## Consequences
### Positive
- Editor can generate MPD reliably for more Mermaid syntaxes (targets list + starter DSL).
- Runtime actions can target elements consistently across more diagram types.
- Strategy pattern isolates type-specific SVG quirks and enables incremental improvement per diagram type.

### Negative
- Mermaid SVG structure can change across Mermaid versions; strategies may require updates.
- Text-based fallback IDs can introduce ambiguity (duplicate labels) and may require disambiguation rules.
- Adds maintenance overhead: each new diagram type needs a strategy + tests + examples.

### Neutral
- Some diagram types may initially have minimal adjacency support; `camera.fit` will still work but may show less context until improved.

## Implementation Notes
- Strategies are registered in the Mermaid diagram adapter and selected using `detectDiagramType()`.
- `data-id` assignment is a prerequisite for editor target discovery and MPD starter generation.
- Examples should avoid relying on editor-specific code paths and should demonstrate at least:
  - `camera.fit` / `camera.reset`
  - `style.highlight`
  - `overlay.bubble`

## Related
- Implements: REQ-FRAMEWORK-002
- Related to: ADR-0006 (Mermaid ID to dataId mapping), ADR-0005 (camera fit adjacent nodes)

## Date
2026-01-24

