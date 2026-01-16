# PRD: Finsteps Mermaid Presentation Framework (FMPF)

## 1) Summary

FMPF is a framework-agnostic presentation runtime for Mermaid diagrams, driven by a declarative script (DSL) that specifies steps, camera moves (zoom/pan/fit), highlights, and interactive overlays (bubbles/panels). It must run in modern browsers and integrate cleanly with any ES6+ JavaScript environment (vanilla, CodePen, React/Vue/Svelte, Reveal.js, etc.) without requiring those frameworks.

## 2) Goals and non-goals

### Goals

- Present a Mermaid diagram as an interactive “slide deck”:
  - Step-by-step focus on nodes/edges/subgraphs
  - Smooth pan/zoom transitions (camera)
  - Highlight/spotlight logic
  - Tooltips/bubbles/panels describing steps
- Work inside other frameworks and JS runtimes:
  - Drop-in: `presentMermaid({ mountEl, mermaidText, mpdText })`
  - Headless mode: you provide your own UI buttons; FMPF provides a control API
- Use open-source dependencies, keep the core library small, and support ES6+.
- Deterministic targeting that doesn’t break across re-renders:
  - Prefer stable Mermaid IDs when configured
  - Provide fallback selector strategies when not

### Non-goals (v1)

- Editing Mermaid text in runtime (presentation-only)
- Full diagram layout manipulation (Mermaid does layout)
- Exporting to video/PPTX (possible later)
- Server-side rendering as a first-class feature (FMPF can render on client after SSR)

## 3) Target users and primary use cases

### Personas

- Architect / Security engineer: presenting process diagrams in meetings.
- Instructor: stepwise explanation of system flows.
- Product manager: narrating a workflow with callouts.
- Developer: embedding Mermaid walkthroughs in docs sites.

### Use cases

- “Walkthrough” mode: next/prev through steps with a bubble anchored to the active node.
- “Interactive explainer”: click node → jump to matching step; hover edges → show details.
- “Zoom storytelling”: frame the full diagram, zoom into a subgraph, highlight a path.

#### Embed inside

- CodePen / static HTML
- Reveal.js slides
- React route component
- Documentation site (Docusaurus/Vitepress)

## 4) Compatibility goals

### Mermaid compatibility

- Support Mermaid v10+ as primary.
- Best-effort support for late v9 if needed, behind a compatibility shim.
- Require Mermaid rendering via:
  - `mermaid.run()` / `mermaid.render()` (runtime chooses best path based on version presence)

### Browser compatibility

- Evergreen browsers: latest Chrome/Edge/Firefox/Safari.
- ES6+ baseline:
  - Modules, const/let, arrow functions, Promise, async/await
- No hard dependency on Node APIs in the browser build.

### Framework / bundler compatibility

- Works with:
  - Vanilla script tag (`type="module"`)
  - Vite, Webpack, Rollup, Parcel
  - React/Vue/Svelte (as a UI-agnostic library)
- Provide builds:
  - ESM (`dist/index.js`)
  - CJS (`dist/index.cjs`) optional, depending on packaging strategy
  - Type definitions (`dist/index.d.ts`)

### Security / CSP compatibility

- No `eval` or dynamic `Function` compilation.
- Overlay content must support a “safe mode”:
  - Default: treat bubble bodies as text
  - Option: allow HTML with sanitizer hook

## 5) Product surface

### Inputs

- Mermaid source (string)
- MPD script (string) — the presentation DSL
- Mount element (`HTMLElement`) or selector

### Outputs

- Rendered diagram + optional default controls UI
- Controller API:
  - `next()`, `prev()`, `goto(step)`, `reset()`, `destroy()`
  - `getState()`, `setState(partial)`
  - Event hooks: `on('stepchange', ...)`, `on('actionerror', ...)`

### Modes

- Headless (default): FMPF does not add UI controls; user wires buttons.
- Batteries included UI: optional built-in controls (prev/next, step counter, reset).

## 6) DSL requirements (MPD v1)

### Core concepts

- Deck: a set of scenes
- Scene: tied to a single diagram instance (or references one)
- Step: named state in the presentation
- Actions: camera moves, style changes, UI overlays, navigation
- Bindings: event → action pipelines (click, key, hover, timer, custom)

### Required DSL features (v1)

- Version header (enables future compatibility)
- Comments
- Deterministic identification of targets:
  - `node(A)`, `edge(A,B)`, `subgraph(Group1)`, `css("...")`
- Step orchestration:
  - `focus … pad N`
  - `do camera.fit(...)`, `do ui.bubble(...)`, `do style.spotlight(...)`
- Bindings:
  - `click node → nav.gotoStepByTarget(...)`
  - Key shortcuts for next/prev/reset
- Variables and minimal expressions:
  - `$event.target`, `$step.index`, `$state.foo`
  - Basic booleans/strings/numbers

### Non-functional DSL requirements

- Parse errors must be actionable:
  - Line/column ranges
  - Show nearest token and expected tokens
- Stable semantics:
  - Step execution order deterministic
  - Well-defined error handling per action (fail step vs continue)

## 7) Parser requirements

### Implementation choice

- Parser must be open source, ES6-friendly, and browser-compatible.
- Recommended: Chevrotain (lexer + LL parser; fast, good errors, TS-friendly).
- Alternatives acceptable: nearley, pegjs, lezer — but must meet error-reporting and runtime size goals.

### Parser outputs

- AST with:
  - Node types (Deck, DiagramDecl, Scene, Step, ActionCall, TargetExpr, etc.)
  - Source spans on all nodes (start/end offsets + line/col)
- Validation phase (post-parse):
  - Unknown action names (unless plugin-provided)
  - Invalid target expressions
  - Missing diagram references
  - Version mismatch warnings

### Testing goals for parser

- Golden parse tests: DSL → AST snapshots
- Negative tests: invalid DSL produces correct error messages + locations
- Fuzz tests (optional but desirable): ensure parser doesn’t hang/crash on random input
- Acceptance criteria:
  - Parse a 200–500 line deck in < 50ms on a typical laptop browser.
  - 95%+ of syntax errors return an error with a correct line/column and a helpful message.

## 8) Runtime architecture

### High-level modules

- MermaidRenderer
  - Initializes Mermaid config
  - Renders Mermaid → SVG string
  - Mounts SVG into container
  - Optionally calls Mermaid’s binding helper if provided by the API in that version
- TargetResolver
  - Resolves MPD targets to real SVG elements:
    - Node/edge/subgraph by ID strategies
    - Fallback selectors (id-contains, data attributes, text-match)
  - Maintains a mapping cache (for performance)
- CameraEngine (adapter-based)
  - Interface: `fit(bbox)`, `zoom(level)`, `pan(x,y)`, `reset()`, `transform(...)`
  - Adapters:
    - svg-pan-zoom adapter (SVG-first)
    - d3-zoom adapter (general)
  - Must support programmatic transitions with duration/easing
- StyleEngine
  - Applies classes and inline SVG attrs
  - Spotlight: dim everything except target set
  - “Bring to front” utilities for SVG groups
- OverlayEngine
  - Tooltip/bubble engine (Tippy.js / Popper)
  - Panel overlays (basic DOM)
  - Must avoid clipping by appending to `document.body` by default
- ActionEngine
  - Executes action lists with a consistent calling convention
  - Supports:
    - Synchronous actions
    - Async actions (awaitable)
    - Time-based transitions
  - Error policy: per-step configurable (`haltOnError`, `continueOnError`)
- BindingEngine
  - Declarative event bindings from DSL
  - Normalizes events into `$event` object
  - Supports attaching listeners to:
    - Container
    - SVG root
    - Resolved targets (e.g., nodes)
  - Provides `destroy()` cleanup
- Controller API
  - Owns lifecycle: render → bind → step init
  - Exposes `next`/`prev`/`goto`/`reset`/`destroy`
  - Emits events for host integration

## 9) Open-source dependencies (v1 recommendation)

### Core required

- Mermaid (peer dependency preferred; user supplies version)
- Parser library (Chevrotain recommended)

### Optional / pluggable

- svg-pan-zoom OR d3-zoom (camera adapter)
- tippy.js + @popperjs/core (bubbles)
- Sanitizer hook (user-provided) if HTML overlays enabled

### Dependency policy

- Keep the default install minimal:
  - Ship core with a single camera and overlay choice OR allow external adapters loaded by user
- Avoid large UI frameworks in core (no React dependency, etc.)

## 10) Functional requirements (detailed)

### Rendering

- Must render Mermaid diagram into a provided mount element
- Must support rerender on demand (e.g., diagram changes)
- Must preserve the ability to run MPD steps after rerender

### Navigation

- `next`, `prev`, `goto`
- Optional “looping” behavior (end wraps)
- Step counter and step name available

### Camera behaviors

- Fit target bbox with padding
- Zoom to absolute level and relative (e.g., `zoomBy`)
- Pan absolute and relative
- Must handle:
  - Container resizing
  - Scroll containers (update overlay positions)

### Styling / spotlight

- Dim non-active nodes
- Highlight active node with custom class
- Allow edge emphasis (stroke width/color via class)

### Overlays

- Bubble anchored to SVG element
- Must not clip when SVG is inside scroll/overflow containers
- Panel overlay optional

### Interactions

- Click node → optionally jump to step
- Hover node/edge → show bubble
- Key bindings for next/prev/reset
- Timer-based steps (optional)

## 11) Non-functional requirements

### Performance

- Step change should complete (including camera transition scheduling) within:
  - <16ms to start transition
- Transitions executed via `requestAnimationFrame`
- Overlay updates should be throttled on scroll/resize

### Reliability

- Works even if Mermaid generates non-deterministic IDs:
  - Fallback resolver strategies must still find the intended elements where possible
- Clean destroy:
  - Removes listeners
  - Destroys overlays
  - Releases camera engine instance

### Accessibility

- If built-in UI is used:
  - Buttons have ARIA labels
  - Keyboard navigation works
  - Focus management doesn’t trap user
- Bubble content accessible in DOM (not SVG-only)

## 12) Testing plan

### Unit tests (fast)

- Parser:
  - Tokenization
  - AST shape
  - Error locations
- TargetResolver:
  - Resolves node/edge/subgraph under multiple Mermaid ID patterns
- ActionEngine:
  - Ordering, async actions, error policies
- StyleEngine:
  - Spotlight correctness (class application sets)
- Camera adapter interface compliance (mocked)

### Integration tests (browser)

- Use Playwright (or similar) to run real rendering:
  - Load Mermaid + FMPF
  - Render a known diagram
  - Execute steps:
    - Ensure viewBox/transform changes occur
    - Ensure active node highlighted
    - Ensure bubble appears and stays anchored when scrolling
- Binding tests:
  - Click node jumps step
  - Key shortcuts work
- Rerender tests:
  - Re-run with changed diagram; resolver updates still function

### Visual regression tests

- Render key scenarios, take screenshots, diff with a threshold:
  - “Fit to node A”
  - “Edge label visible”
  - “Bubble not clipped”
  - “Zoomed subgraph”

### Compatibility matrix tests

- Mermaid versions: v10.x latest + at least one prior minor
- Browser matrix: latest Chrome/Firefox/Safari
- Bundler: Vite + Webpack sample apps
- Acceptance criteria:
  - No clipping for focused nodes/labels in reference diagrams across the matrix.
  - Visual diffs remain within threshold across minor version bumps.

## 13) Deliverables

### MVP (v0.1)

- DSL + parser + AST
- Single diagram + single scene
- Steps with focus, `camera.fit`, `style.spotlight`, `ui.bubble`
- Next/prev controller functions
- One camera adapter and one bubble adapter
- Click node → jump step (optional but recommended)

### v0.5

- Multiple scenes/decks
- More target types: edges, subgraphs
- Timers, hover bindings
- Built-in minimal UI controls (optional package)

### v1.0

- Stable DSL versioning and migration notes
- Plugin API for custom actions and resolvers
- Robust compatibility layer for Mermaid ID variations
- Comprehensive docs + example gallery (Reveal.js, React, Vanilla)

## 14) Risks and mitigations

- Mermaid ID instability
  - Mitigation: deterministic ID configuration guidance + fallback resolution strategies + test suite across versions
- Camera/transform differences between libraries
  - Mitigation: strict adapter interface + conformance tests + keep one “blessed” adapter for v1
- Overlay positioning in scroll containers
  - Mitigation: append overlays to body + scroll/resize update hooks + integration tests
- Security concerns with HTML overlays
  - Mitigation: default to text-only; require explicit opt-in + sanitizer hook

## 15) Open questions (decide early)

- DSL format: custom text DSL (as we drafted) vs YAML/JSON (easier authoring, less parser work)
- “Peer dependency” vs bundling Mermaid:
  - Peer dependency strongly preferred to avoid version conflicts
- Which camera engine is “default” for v1:
  - svg-pan-zoom (simple) vs d3-zoom (flexible)
- Deterministic ID enforcement:
  - Should FMPF refuse to run without deterministic IDs enabled (strict) or warn and fallback (lenient)?
