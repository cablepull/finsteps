# Diagram Runtime Target Resolver Contract

## Overview

`@mpf/diagram-runtime` resolves MPD logical target expressions (node/edge/subgraph/css/text) into stable SVG element sets produced by Mermaid rendering. The resolver intentionally prioritizes deterministic IDs for stability and falls back to text matching only when explicit identifiers are unavailable.

## Deterministic IDs (Recommended)

To make node/edge/subgraph resolution stable, configure Mermaid with deterministic IDs:

```js
mermaid.initialize({
  startOnLoad: false,
  deterministicIds: true,
  deterministicIdSeed: 'mpd',
});
```

With deterministic IDs enabled, Mermaid outputs stable IDs in the generated SVG. The resolver attempts to match these IDs first before using weaker fallback strategies.

## Target Syntax

| Target Kind | Syntax | Selector Rule | Notes |
| --- | --- | --- | --- |
| Node | `node:<id>` or `<id>` | Exact ID → data-id → ID contains → text match | Default when no kind is supplied. |
| Edge | `edge:<id>` | Exact ID → data-id → ID contains → text match | Edges are resolved from `g.edgePath` / `g.edgeLabel` groups. |
| Subgraph | `subgraph:<id>` | Exact ID → data-id → ID contains → text match | Subgraphs map to `g.cluster` groups. |
| CSS | `css:<selector>` | `querySelectorAll` on SVG | Power-user escape hatch. |
| Text | `text:<label>` | Exact text → partial text | Returns the closest SVG group for each match. |

## Resolution Strategy (Node/Edge/Subgraph)

1. **Diagram model lookup** (preferred): uses the in-memory model built from `data-id` or `id` attributes on Mermaid SVG groups.
2. **Deterministic ID**: exact `id="<id>"` match.
3. **`data-id` match**: exact `data-id="<id>"` match.
4. **ID contains**: `id*="<id>"` substring search for best-effort compatibility with Mermaid defaults.
5. **Text fallback**: matches SVG `<text>` nodes by exact text (then partial text) and returns their closest `<g>` container.

## Failure Modes

- **Unknown target kinds**: treated as `node` by default.
- **Empty target value**: returns an empty array.
- **No matching elements**: returns an empty array. Callers should handle the empty result explicitly.
- **Missing Mermaid instance**: `renderDiagram` throws when no Mermaid instance is provided or available globally.

## Diagram Model Snapshot

The runtime exposes a minimal model of resolved elements after rendering:

- `nodes`: `{ id, elements }[]` for `g.node` elements
- `edges`: `{ id, elements }[]` for `g.edgePath` and `g.edgeLabel` elements
- `subgraphs`: `{ id, elements }[]` for `g.cluster` elements

The model is rebuilt on each render, and resolver caches are invalidated accordingly.
