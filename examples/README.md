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

## Reveal.js multi-chart demo

<http://localhost:5173/examples/revealjs/>

Multiple Mermaid diagrams in a Reveal.js deck. Each slide has its own stepper; buttons and keyboard control overlays.

## Large diagram walkthrough

<http://localhost:5173/examples/walkthrough/>

Single-page walkthrough of a large, multiforked Mermaid flowchart. Jump to different areas via the sidebar (non-sequential). Each spot uses **camera.fit** (zoom/pan), **style.highlight**, and **overlay.bubble** to focus on one part of the diagram.
