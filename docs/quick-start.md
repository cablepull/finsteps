# Quick Start Guide

Get started with Finsteps in 5 minutes. This guide starts with the absolute minimal example and progressively adds features.

## Prerequisites

- A modern web browser
- Basic knowledge of HTML and JavaScript

## Step 1: Minimal Example

The simplest working Finsteps presentation - just a diagram with one step.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="diagram"></div>
  
  <script type="module">
    import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.4.3/dist/finsteps.esm.min.js';
    
    mermaid.initialize({ startOnLoad: false, theme: "dark" });
    
    const mermaidText = `graph LR
      A[Start] --> B[End]`;
    
    const mpdText = `mpd 1.0
scene default {
  step overview {
    camera reset();
  }
}`;
    
    const controller = await presentMermaid({
      mermaidText,
      mpdText,
      mountEl: document.getElementById('diagram'),
      options: { parseMpd: parseMPD }
    });
  </script>
</body>
</html>
```

**What this does:**
- Creates a simple flowchart with two nodes
- Sets up a presentation with one step that resets the camera view
- The diagram renders and shows the full view

**Try it:** Save this as `index.html` and open it in a browser. You should see a flowchart diagram.

## Step 2: Add Navigation

Add Next/Previous buttons to navigate between steps.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: system-ui; padding: 2rem; }
    #diagram { width: 100%; height: 400px; border: 1px solid #ccc; margin: 1rem 0; }
    button { padding: 0.5rem 1rem; margin: 0.25rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Finsteps Presentation</h1>
  <div id="diagram"></div>
  <div>
    <button id="prev">Previous</button>
    <button id="next">Next</button>
  </div>
  
  <script type="module">
    import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.4.3/dist/finsteps.esm.min.js';
    
    mermaid.initialize({ startOnLoad: false, theme: "dark" });
    
    const mermaidText = `graph LR
      A[Start] --> B[Process] --> C[End]`;
    
    const mpdText = `mpd 1.0
scene default {
  step overview {
    camera reset();
  }
  step detail {
    camera fit(target: dataId("B"));
  }
}`;
    
    const controller = await presentMermaid({
      mermaidText,
      mpdText,
      mountEl: document.getElementById('diagram'),
      options: { parseMpd: parseMPD }
    });
    
    // Wire up navigation buttons
    document.getElementById('prev').addEventListener('click', () => controller.prev());
    document.getElementById('next').addEventListener('click', () => controller.next());
  </script>
</body>
</html>
```

**What changed:**
- Added two steps: `overview` (shows full diagram) and `detail` (focuses on node B)
- Added Next/Previous buttons that call `controller.next()` and `controller.prev()`
- Clicking Next focuses the camera on node B, clicking Previous returns to overview

**Try it:** Click the Next button to see the camera focus on the Process node.

## Step 3: Add Camera Focus

Add camera movements to focus on different parts of the diagram.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: system-ui; padding: 2rem; }
    #diagram { width: 100%; height: 400px; border: 1px solid #ccc; margin: 1rem 0; }
    button { padding: 0.5rem 1rem; margin: 0.25rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Finsteps Presentation</h1>
  <div id="diagram"></div>
  <div>
    <button id="prev">Previous</button>
    <button id="next">Next</button>
  </div>
  
  <script type="module">
    import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.4.3/dist/finsteps.esm.min.js';
    
    mermaid.initialize({ startOnLoad: false, theme: "dark" });
    
    const mermaidText = `graph LR
      A[Start] --> B[Process] --> C[End]`;
    
    const mpdText = `mpd 1.0
scene default {
  step overview {
    camera reset();
  }
  step start {
    camera fit(target: dataId("A"), padding: 60, duration: 500);
  }
  step process {
    camera fit(target: dataId("B"), padding: 60, duration: 500);
  }
  step end {
    camera fit(target: dataId("C"), padding: 60, duration: 500);
  }
}`;
    
    const controller = await presentMermaid({
      mermaidText,
      mpdText,
      mountEl: document.getElementById('diagram'),
      options: { parseMpd: parseMPD }
    });
    
    // Wire up navigation buttons
    document.getElementById('prev').addEventListener('click', () => controller.prev());
    document.getElementById('next').addEventListener('click', () => controller.next());
  </script>
</body>
</html>
```

**What changed:**
- Added three steps that focus on different nodes (A, B, C)
- Each step uses `camera fit()` with padding and duration for smooth animated transitions
- Navigation now smoothly pans between nodes

**Try it:** Use Next/Previous to see smooth camera movements between nodes.

## Step 4: Add Overlays

Add bubble callouts to highlight and explain parts of the diagram.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: system-ui; padding: 2rem; }
    #diagram { width: 100%; height: 400px; border: 1px solid #ccc; margin: 1rem 0; }
    button { padding: 0.5rem 1rem; margin: 0.25rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Finsteps Presentation</h1>
  <div id="diagram"></div>
  <div>
    <button id="prev">Previous</button>
    <button id="next">Next</button>
  </div>
  
  <script type="module">
    import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.4.3/dist/finsteps.esm.min.js';
    
    mermaid.initialize({ startOnLoad: false, theme: "dark" });
    
    const mermaidText = `graph LR
      A[Start] --> B[Process] --> C[End]`;
    
    const mpdText = `mpd 1.0
scene default {
  step overview {
    camera reset();
    overlay bubble(target: dataId("A"), text: "Welcome! This is the overview step.");
  }
  step start {
    camera fit(target: dataId("A"), padding: 60, duration: 500);
    overlay bubble(target: dataId("A"), text: "This is the starting point of our process.");
  }
  step process {
    camera fit(target: dataId("B"), padding: 60, duration: 500);
    overlay bubble(target: dataId("B"), text: "Processing happens here with important logic.");
  }
  step end {
    camera fit(target: dataId("C"), padding: 60, duration: 500);
    overlay bubble(target: dataId("C"), text: "And finally, we reach the end!");
  }
}`;
    
    const controller = await presentMermaid({
      mermaidText,
      mpdText,
      mountEl: document.getElementById('diagram'),
      options: { parseMpd: parseMPD }
    });
    
    // Wire up navigation buttons
    document.getElementById('prev').addEventListener('click', () => controller.prev());
    document.getElementById('next').addEventListener('click', () => controller.next());
  </script>
</body>
</html>
```

**What changed:**
- Each step now includes `overlay bubble()` actions
- Bubbles appear next to the target node explaining what's happening
- The text provides context for each step

**Try it:** Navigate through steps to see explanatory bubbles appear.

## Step 5: Add Keyboard Controls

Add keyboard navigation for a better presentation experience.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: system-ui; padding: 2rem; }
    #diagram { width: 100%; height: 400px; border: 1px solid #ccc; margin: 1rem 0; }
    button { padding: 0.5rem 1rem; margin: 0.25rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Finsteps Presentation</h1>
  <div id="diagram"></div>
  <div>
    <button id="prev">Previous</button>
    <button id="next">Next</button>
    <p><small>Use ← → arrow keys to navigate</small></p>
  </div>
  
  <script type="module">
    import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.4.3/dist/finsteps.esm.min.js';
    
    mermaid.initialize({ startOnLoad: false, theme: "dark" });
    
    const mermaidText = `graph LR
      A[Start] --> B[Process] --> C[End]`;
    
    const mpdText = `mpd 1.0
scene default {
  step overview {
    camera reset();
    overlay bubble(target: dataId("A"), text: "Welcome! This is the overview step.");
  }
  step start {
    camera fit(target: dataId("A"), padding: 60, duration: 500);
    overlay bubble(target: dataId("A"), text: "This is the starting point of our process.");
  }
  step process {
    camera fit(target: dataId("B"), padding: 60, duration: 500);
    overlay bubble(target: dataId("B"), text: "Processing happens here with important logic.");
  }
  step end {
    camera fit(target: dataId("C"), padding: 60, duration: 500);
    overlay bubble(target: dataId("C"), text: "And finally, we reach the end!");
  }
}

binding {
  on key "ArrowRight" {
    do nav.next();
  }
  on key "ArrowLeft" {
    do nav.prev();
  }
}`;
    
    const controller = await presentMermaid({
      mermaidText,
      mpdText,
      mountEl: document.getElementById('diagram'),
      options: { parseMpd: parseMPD }
    });
    
    // Wire up navigation buttons
    document.getElementById('prev').addEventListener('click', () => controller.prev());
    document.getElementById('next').addEventListener('click', () => controller.next());
  </script>
</body>
</html>
```

**What changed:**
- Added a `binding` block that maps keyboard events to navigation actions
- Arrow Right goes to next step, Arrow Left goes to previous step
- Keyboard navigation works automatically without additional JavaScript

**Try it:** Use the left and right arrow keys to navigate through the presentation.

## What You Learned

You've built a complete interactive presentation with:
- ✅ Multiple steps
- ✅ Camera movements (focus, reset)
- ✅ Overlay callouts (bubbles)
- ✅ Navigation buttons
- ✅ Keyboard controls

## Next Steps

Now that you understand the basics, explore:

- **[Complete Grammar Documentation](grammar.md)** - Learn all MPD syntax
- **[API Reference](api/public-api.md)** - Full API documentation
- **[Live Examples](../examples/)** - See more complex presentations
- **[JSON Schemas](schema/)** - Validate your MPD and AST

## Common Issues

**Diagram not rendering?**
- Make sure Mermaid.js is loaded before Finsteps
- Check browser console for errors
- Verify your Mermaid syntax is valid

**Navigation not working?**
- Ensure your MPD has multiple steps
- Check that `parseMpd` is passed in options
- Verify step IDs are correct

**Camera not focusing?**
- Check that `dataId` matches your Mermaid node IDs
- Ensure `camera fit()` target is correct
- Try with explicit node IDs like `node("A")`

**Overlays not appearing?**
- Verify the target element exists in the diagram
- Check that `dataId` or selector matches a real element
- Ensure overlay engine is available (basic overlay is default)

## Need Help?

- Check the [full documentation](../README.md)
- Explore [working examples](../examples/)
- Review the [MPD grammar](grammar.md) for syntax details
