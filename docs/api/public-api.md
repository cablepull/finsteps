# Public API Contract

## Entry Point

`presentMermaid({ mountEl, mermaidText, mpdText | ast, options }) => Controller`

Required:
- `mountEl`: HTMLElement that hosts the SVG.
- `mermaidText`: Mermaid source string.
- `ast` or `mpdText` + `options.parseMpd`: presentation AST from Task 1.

Optional:
- `options.diagram`: custom DiagramAdapter.
- `options.camera`: custom CameraHandle.
- `options.overlay`: custom OverlayHandle.
- `options.actionHandlers`: additional action handlers.
- `options.errorPolicy`: default error policy (`haltOnError` or `continueOnError`).

## Controller

Methods:
- `next()`
- `prev()`
- `goto(stepIndex | stepId)`
- `reset()`
- `destroy()`
- `getState()`
- `setState(partial)`

Events:
- `on("stepchange" | "actionerror" | "error" | "render", handler)`
  - `actionerror` is the preferred event name for action failures; `error` remains as a legacy alias.

## Interfaces

### DiagramHandle
- `getRoot() => SVGSVGElement`
- `getContainer() => HTMLElement`
- `resolveTarget(target) => Element | null`
- `destroy()`

### CameraHandle
- `fit(target, { padding? })`
- `reset()`
- `destroy()`

### OverlayHandle
- `showBubble({ id?, target, text })`
- `hideBubble(id?)`
- `destroy()`

## Semantic Versioning Discipline

- Backwards compatible additions: minor version.
- Breaking changes in public interfaces or behavior: major version.
- Bug fixes and non-breaking internal changes: patch version.
