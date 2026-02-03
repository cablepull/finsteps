# Examples

This directory contains runnable demos for the Finsteps presentation runtime.

## Run any example

1. Build the library output:
   ```bash
   npm run build
   ```
2. Start a local web server from the repo root:
   ```bash
   ./examples/run-example.sh
   ```
3. Open the example in your browser (see below).

> Tip: You can use `npx serve -p 5173` directly if you prefer. The `serve` package handles ES modules better than Python's HTTP server.

## Live Editor

<http://localhost:5173/examples/editor/>

Interactive live editor for creating and testing Finsteps presentations. Features:

- **Mermaid Input**: Edit your Mermaid diagram text with live preview
- **DSL Editor**: Edit the PresentationAst DSL in JSON format or use the visual builder
- **Auto-Generation**: Automatically generate a starter DSL from your diagram
- **Available Targets**: See all `data-id` values from your rendered diagram
- **Live Preview**: See your presentation in real-time as you edit
- **Export/Import**: Save and load your presentations

## Reveal.js multi-chart demo

<http://localhost:5173/examples/revealjs/>

Multiple Mermaid diagrams in a Reveal.js deck. Each slide has its own stepper; buttons and keyboard control overlays.

## Reveal.js plugin (declarative)

<http://localhost:5173/examples/revealjs-plugin/>

Declarative Reveal.js integration using `data-finsteps` HTML attributes. Diagrams auto-initialize with no manual JavaScript required. Supports fragment synchronization.

## Floating controls

<http://localhost:5173/examples/floating-controls/>

Built-in UI controls for navigation and camera operations.

## Compact controls

<http://localhost:5173/examples/floating-controls-compact/>

Demonstrates compact controls with size presets (compact/normal/large), theme presets (dark/light/auto), orientation (horizontal/vertical), custom playback speed, and reset button.

## Large diagram walkthrough

<http://localhost:5173/examples/walkthrough/>

Single-page walkthrough of a large, multiforked Mermaid flowchart. Jump to different areas via the sidebar (non-sequential). Each spot uses **camera.fit** (zoom/pan), **style.highlight**, and **overlay.bubble** to focus on one part of the diagram.

## Timeline walkthrough

<http://localhost:5173/examples/timeline/>

Single-page walkthrough of a Mermaid gantt chart showing a project timeline. Navigate chronologically through project phases (Planning, Development, Testing, Deployment) or jump to specific phases. Demonstrates animated camera transitions for horizontal panning through time-based data with task highlighting and explanatory bubbles.

## Sequence diagram walkthrough

<http://localhost:5173/examples/sequence/>

Interactive walkthrough of a sequence diagram showing order processing flow with multiple participants, messages, and conditional paths. Demonstrates targeting participants, messages, and activations.

## Class diagram walkthrough

<http://localhost:5173/examples/class/>

Walkthrough of a class diagram demonstrating inheritance hierarchy and composition relationships between Vehicle, Car, Motorcycle, and Wheel classes. Shows targeting classes and relationships.

## State diagram walkthrough

<http://localhost:5173/examples/state/>

State machine walkthrough showing state transitions, nested states (Error with Retry substate), and recovery paths. Demonstrates targeting states and transitions.

## ER diagram walkthrough

<http://localhost:5173/examples/er/>

Entity-relationship diagram walkthrough for an e-commerce system, highlighting entities, relationships, and constraints (PK, FK, UK). Shows targeting entities and relationships.

## Pie chart walkthrough

<http://localhost:5173/examples/pie/>

Pie chart walkthrough showing device usage distribution, with animated transitions between slices. Demonstrates targeting individual pie slices.

## User journey walkthrough

<http://localhost:5173/examples/journey/>

User journey diagram walkthrough showing signup and onboarding flow with engagement scores for each step. Demonstrates sequential step navigation.

## Git graph walkthrough

<http://localhost:5173/examples/gitgraph/>

Git graph walkthrough demonstrating branch structure, commits, and merge workflow patterns. Shows targeting commits and branches.

## Timeline diagram walkthrough (experimental)

<http://localhost:5173/examples/timeline-experimental/>

Timeline diagram walkthrough showing software release history across major versions and recent releases. Demonstrates targeting timeline sections and events.

## Quadrant chart walkthrough (experimental)

<http://localhost:5173/examples/quadrant/>

Quadrant chart walkthrough showing market positioning across four quadrants (Leader, Challenger, Niche, Innovator). Demonstrates targeting data points and quadrants.

## Requirement diagram walkthrough (experimental)

<http://localhost:5173/examples/requirement/>

Requirement diagram walkthrough showing requirements and their relationships to functions. Demonstrates targeting requirements and functions.

## C4 Context diagram walkthrough (experimental)

<http://localhost:5173/examples/c4context/>

C4 context diagram walkthrough showing system boundaries and external interactions. Demonstrates targeting C4 elements and relationships.

## C4 Container diagram walkthrough (experimental)

<http://localhost:5173/examples/c4container/>

C4 container diagram walkthrough showing system containers and their relationships. Demonstrates targeting containers within system boundaries.

## C4 Component diagram walkthrough (experimental)

<http://localhost:5173/examples/c4component/>

C4 component diagram walkthrough showing internal components and their relationships. Demonstrates targeting components within containers.

## Block diagram walkthrough (experimental)

<http://localhost:5173/examples/block/>

Block diagram walkthrough showing a simple decision flow process. Demonstrates targeting blocks and connections.

## Mindmap walkthrough (experimental)

<http://localhost:5173/examples/mindmap/>

Mindmap walkthrough demonstrating editor-grade target discovery via `data-id` for mindmap nodes.

## XY chart walkthrough (experimental)

<http://localhost:5173/examples/xychart/>

XY chart walkthrough demonstrating editor-grade target discovery via `data-id` for chart labels/series.

## Kanban walkthrough (experimental)

<http://localhost:5173/examples/kanban/>

Kanban walkthrough demonstrating targeting columns and tasks.

## Packet walkthrough (experimental)

<http://localhost:5173/examples/packet/>

Packet diagram walkthrough demonstrating targeting layer labels.

## Radar walkthrough (experimental)

<http://localhost:5173/examples/radar/>

Radar chart walkthrough demonstrating targeting metric labels.

## Sankey walkthrough (experimental)

<http://localhost:5173/examples/sankey/>

Sankey diagram walkthrough demonstrating targeting node labels.

## Treemap walkthrough (experimental)

<http://localhost:5173/examples/treemap/>

Treemap diagram walkthrough demonstrating targeting group labels.

## ZenUML walkthrough (experimental)

<http://localhost:5173/examples/zenuml/>

ZenUML walkthrough demonstrating targeting participant labels (subject to Mermaid ZenUML support in the loaded Mermaid version).
