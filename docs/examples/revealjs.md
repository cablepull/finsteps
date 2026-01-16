# Reveal.js Integration Example

```html
<section>
  <div id="mermaid-slide"></div>
  <button id="prev">Prev</button>
  <button id="next">Next</button>
</section>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script type="module">
  import { presentMermaid } from "/dist/index.js";

  const controller = await presentMermaid({
    mountEl: document.getElementById("mermaid-slide"),
    mermaidText: "graph TD\\n  A[Intro] --> B[Detail]",
    ast: {
      steps: [
        { id: "intro", actions: [{ type: "overlay.bubble", payload: { target: { dataId: "A" }, text: "Intro" } }] },
        { id: "detail", actions: [{ type: "overlay.bubble", payload: { target: { dataId: "B" }, text: "Details" } }] }
      ],
      bindings: [
        { event: "key", key: "ArrowRight", actions: [{ type: "nav.next" }] },
        { event: "key", key: "ArrowLeft", actions: [{ type: "nav.prev" }] }
      ]
    }
  });

  Reveal.on("slidechanged", (event) => {
    if (event.currentSlide.querySelector("#mermaid-slide")) {
      controller.reset();
    }
  });
  document.getElementById("prev").addEventListener("click", () => controller.prev());
  document.getElementById("next").addEventListener("click", () => controller.next());
</script>
```
