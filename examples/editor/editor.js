import { presentMermaid } from "../../dist/index.js";
import { initVisualBuilder, loadASTIntoVisual, getVisualStateAsAST } from "./visual-builder.js";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

let controller = null;
let jsonEditor = null;
let currentAst = null;
let renderTimeout = null;
let mermaidValidationTimeout = null;
let jsonValidationTimeout = null;

// Initialize CodeMirror for JSON editor
function initJSONEditor() {
  const editorElement = document.getElementById("json-editor");
  jsonEditor = CodeMirror(editorElement, {
    value: JSON.stringify({ steps: [], bindings: [] }, null, 2),
    mode: { name: "javascript", json: true },
    theme: "monokai",
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true
  });

  jsonEditor.on("change", () => {
    handleDSLChange();
  });

  // Add syntax error marking
  jsonEditor.on("change", () => {
    clearTimeout(jsonValidationTimeout);
    jsonValidationTimeout = setTimeout(() => {
      validateJSONSyntax();
    }, 300);
  });
}

// Validate JSON syntax and mark errors in CodeMirror
function validateJSONSyntax() {
  if (!jsonEditor) return;
  
  const jsonText = jsonEditor.getValue();
  if (!jsonText.trim()) {
    clearError("dsl-error");
    // Remove error classes from all lines
    for (let i = 0; i < jsonEditor.lineCount(); i++) {
      jsonEditor.removeLineClass(i, "background", "cm-error-line");
    }
    return;
  }

  try {
    JSON.parse(jsonText);
    clearError("dsl-error");
    // Remove error classes from all lines
    for (let i = 0; i < jsonEditor.lineCount(); i++) {
      jsonEditor.removeLineClass(i, "background", "cm-error-line");
    }
  } catch (error) {
    const match = error.message.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      const lines = jsonText.substring(0, pos).split('\n');
      const lineNum = lines.length - 1;
      const colNum = lines[lines.length - 1].length;
      
      showError("dsl-error", `JSON Syntax Error at line ${lineNum + 1}, column ${colNum + 1}:\n${error.message}`);
      
      // Mark error line in CodeMirror
      jsonEditor.addLineClass(lineNum, "background", "cm-error-line");
    } else {
      showError("dsl-error", `JSON Syntax Error: ${error.message}`);
      // Try to find line number from error message
      const lineMatch = error.message.match(/line (\d+)/i);
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]) - 1;
        if (lineNum >= 0 && lineNum < jsonEditor.lineCount()) {
          jsonEditor.addLineClass(lineNum, "background", "cm-error-line");
        }
      }
    }
  }
}

// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`${tabName}-tab`).classList.add("active");
    
    // Sync between JSON and Visual when switching tabs
    if (tabName === "visual") {
      try {
        const jsonText = jsonEditor.getValue();
        const ast = JSON.parse(jsonText);
        loadASTIntoVisual(ast);
        initVisualBuilder(document.getElementById("visual-tab"), (ast) => {
          const jsonText = JSON.stringify(ast, null, 2);
          jsonEditor.setValue(jsonText);
          currentAst = ast;
          debounceRender();
        });
      } catch (error) {
        console.error("Failed to load AST into visual builder:", error);
      }
    } else if (tabName === "json") {
      try {
        const visualAST = getVisualStateAsAST();
        const jsonText = JSON.stringify(visualAST, null, 2);
        jsonEditor.setValue(jsonText);
        currentAst = visualAST;
        debounceRender();
      } catch (error) {
        console.error("Failed to sync visual to JSON:", error);
      }
    }
  });
});

// Mermaid input handler
const mermaidInput = document.getElementById("mermaid-input");
mermaidInput.addEventListener("input", () => {
  clearError("mermaid-error");
  mermaidInput.classList.remove("has-error");
  
  // Validate Mermaid syntax
  clearTimeout(mermaidValidationTimeout);
  mermaidValidationTimeout = setTimeout(() => {
    validateMermaidSyntax();
  }, 300);
  
  debounceRender();
});

// Validate Mermaid syntax
async function validateMermaidSyntax() {
  const mermaidText = mermaidInput.value.trim();
  if (!mermaidText) {
    clearError("mermaid-error");
    return;
  }

  try {
    // Try to parse the Mermaid diagram
    await mermaid.parse(mermaidText);
    clearError("mermaid-error");
    mermaidInput.classList.remove("has-error");
  } catch (error) {
    const errorMsg = error.message || String(error);
    let displayMsg = errorMsg;
    
    // Try to extract line number from error message
    const lineMatch = errorMsg.match(/line (\d+)/i);
    if (lineMatch) {
      const lineNum = lineMatch[1];
      displayMsg = `Syntax Error at line ${lineNum}:\n${errorMsg}`;
    }
    
    showError("mermaid-error", displayMsg);
    mermaidInput.classList.add("has-error");
  }
}

// Format JSON button
document.getElementById("format-json").addEventListener("click", () => {
  try {
    const currentText = jsonEditor.getValue();
    const parsed = JSON.parse(currentText);
    const formatted = JSON.stringify(parsed, null, 2);
    jsonEditor.setValue(formatted);
  } catch (error) {
    showError("dsl-error", `Invalid JSON: ${error.message}`);
  }
});

// Generate Starter DSL button
document.getElementById("generate-dsl").addEventListener("click", async () => {
  const mermaidText = mermaidInput.value.trim();
  if (!mermaidText) {
    showError("mermaid-error", "Please enter a Mermaid diagram first");
    return;
  }

  try {
    // Render diagram temporarily to extract dataIds
    const tempMount = document.createElement("div");
    tempMount.style.position = "absolute";
    tempMount.style.left = "-9999px";
    document.body.appendChild(tempMount);

    const { createMermaidDiagramAdapter } = await import("../../dist/adapters/mermaidDiagram.js");
    const adapter = createMermaidDiagramAdapter();
    const diagramHandle = await adapter.render({
      mountEl: tempMount,
      mermaidText
    });

    const starterDSL = generateStarterDSL(diagramHandle, mermaidText);
    const formatted = JSON.stringify(starterDSL, null, 2);
    jsonEditor.setValue(formatted);

    document.body.removeChild(tempMount);
    currentAst = starterDSL;
    await renderDiagram();
  } catch (error) {
    showError("mermaid-error", `Failed to generate DSL: ${error.message}`);
  }
});

// Debounced render function
function debounceRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    renderDiagram();
  }, 500);
}

// Handle DSL changes
function handleDSLChange() {
  const jsonText = jsonEditor.getValue();
  if (!jsonText.trim()) {
    clearError("dsl-error");
    return;
  }

  try {
    const parsed = JSON.parse(jsonText);
    
    // Validate AST structure
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("DSL must be an object");
    }
    if (!Array.isArray(parsed.steps)) {
      throw new Error("DSL must have a 'steps' array");
    }
    
    // Validate each step
    parsed.steps.forEach((step, index) => {
      if (!step.id) {
        throw new Error(`Step ${index + 1} is missing an 'id'`);
      }
      if (!Array.isArray(step.actions)) {
        throw new Error(`Step '${step.id}' must have an 'actions' array`);
      }
    });
    
    clearError("dsl-error");
    currentAst = parsed;
    debounceRender();
  } catch (error) {
    // JSON syntax errors are handled by validateJSONSyntax
    // Only show structure validation errors here
    if (!(error instanceof SyntaxError)) {
      showError("dsl-error", error.message);
    }
  }
}

// Render diagram with current Mermaid and DSL
async function renderDiagram() {
  const mermaidText = mermaidInput.value.trim();
  if (!mermaidText) {
    return;
  }

  const mountEl = document.getElementById("diagram-mount");
  mountEl.innerHTML = "";

  // Parse DSL
  let ast = null;
  try {
    const jsonText = jsonEditor.getValue();
    ast = JSON.parse(jsonText);
    currentAst = ast;
    clearError("dsl-error");
  } catch (error) {
    showError("dsl-error", `Invalid JSON: ${error.message}`);
    return;
  }

  // Validate AST structure
  if (!ast.steps || !Array.isArray(ast.steps)) {
    showError("dsl-error", "DSL must have a 'steps' array");
    return;
  }

  try {
    // Clean up previous controller
    if (controller) {
      try {
        controller.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    }

    // Render new diagram
    controller = await presentMermaid({
      mountEl,
      mermaidText,
      ast
    });

    // Update available dataIds
    updateAvailableDataIds(controller);

    // Update navigation buttons
    updateNavigationButtons(ast.steps);

    // Setup camera controls
    setupCameraControls(controller);

    // Update active button state
    controller.on("stepchange", (state) => {
      const currentStep = ast.steps[state.stepIndex];
      if (currentStep) {
        updateActiveNavButton(currentStep.id);
      }
    });

  } catch (error) {
    showError("mermaid-error", `Render error: ${error.message}`);
    console.error("Render error:", error);
  }
}

// Generate starter DSL from diagram
function generateStarterDSL(diagramHandle, mermaidText) {
  const svg = diagramHandle.getRoot();
  const dataIdElements = Array.from(svg.querySelectorAll("[data-id]"));
  const dataIds = [...new Set(dataIdElements.map(el => el.getAttribute("data-id")).filter(Boolean))];

  const steps = [
    {
      id: "overview",
      actions: [
        { type: "camera.reset" },
        {
          type: "overlay.bubble",
          payload: {
            target: { dataId: dataIds[0] || "unknown" },
            text: "Full diagram view. Use the sidebar to navigate."
          }
        }
      ]
    },
    ...dataIds.map(dataId => ({
      id: dataId.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      actions: [
        {
          type: "camera.fit",
          payload: {
            target: { dataId },
            padding: 60,
            duration: 500,
            easing: "cubicOut"
          }
        },
        {
          type: "style.highlight",
          payload: { target: { dataId } }
        },
        {
          type: "overlay.bubble",
          payload: {
            target: { dataId },
            text: `Focused on ${dataId}`
          }
        }
      ]
    }))
  ];

  const bindings = [
    { event: "key", key: "ArrowRight", actions: [{ type: "nav.next" }] },
    { event: "key", key: "ArrowLeft", actions: [{ type: "nav.prev" }] },
    ...steps.map(step => ({
      event: "click",
      target: { selector: `button[data-goto='${step.id}']` },
      actions: [{ type: "nav.goto", payload: { id: step.id } }]
    }))
  ];

  return { steps, bindings };
}

// Extract available dataIds from diagram
function extractAvailableDataIds(diagramHandle) {
  const svg = diagramHandle.getRoot();
  const dataIdElements = Array.from(svg.querySelectorAll("[data-id]"));
  return dataIdElements.map(el => ({
    dataId: el.getAttribute("data-id"),
    element: el,
    tagName: el.tagName
  })).filter(item => item.dataId);
}

// Update available dataIds panel
function updateAvailableDataIds(controller) {
  const dataIdsList = document.getElementById("dataids-list");
  if (!controller || !controller.deps || !controller.deps.diagram) {
    dataIdsList.innerHTML = '<p class="empty-state">Render a diagram to see available targets</p>';
    return;
  }

  const dataIds = extractAvailableDataIds(controller.deps.diagram);
  
  if (dataIds.length === 0) {
    dataIdsList.innerHTML = '<p class="empty-state">No targets found in diagram</p>';
    return;
  }

  dataIdsList.innerHTML = dataIds.map(item => 
    `<span class="dataid-chip" data-dataid="${item.dataId}">${item.dataId}</span>`
  ).join("");

  // Add click handlers to insert dataId into JSON
  dataIdsList.querySelectorAll(".dataid-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const dataId = chip.dataset.dataid;
      insertDataIdIntoJSON(dataId);
    });
  });
}

// Insert dataId into JSON editor at cursor position
function insertDataIdIntoJSON(dataId) {
  const cursor = jsonEditor.getCursor();
  const text = `"${dataId}"`;
  jsonEditor.replaceSelection(text);
  jsonEditor.setCursor(cursor.line, cursor.ch + text.length);
}

// Update navigation buttons
function updateNavigationButtons(steps) {
  const navButtons = document.getElementById("nav-buttons");
  if (!steps || steps.length === 0) {
    navButtons.innerHTML = '<p class="empty-state">No steps defined</p>';
    return;
  }

  navButtons.innerHTML = steps.map(step => 
    `<button class="nav-btn" data-goto="${step.id}">${step.name || step.id}</button>`
  ).join("");

  // Add click handlers
  navButtons.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (controller) {
        const stepId = btn.dataset.goto;
        controller.goto(stepId);
      }
    });
  });
}

// Update active navigation button
function updateActiveNavButton(stepId) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.goto === stepId);
  });
}

// Setup camera controls
function setupCameraControls(controller) {
  if (!controller) return;

  const camera = controller.deps.camera;

  document.getElementById("zoom-in")?.addEventListener("click", () => {
    camera.zoom?.(1.2);
  });

  document.getElementById("zoom-out")?.addEventListener("click", () => {
    camera.zoom?.(0.8);
  });

  document.getElementById("reset")?.addEventListener("click", () => {
    camera.reset();
  });

  document.getElementById("fit-all")?.addEventListener("click", () => {
    camera.fitAll?.();
  });
}

// Error handling
function showError(elementId, message) {
  const errorEl = document.getElementById(elementId);
  errorEl.textContent = message;
  errorEl.classList.add("show");
}

function clearError(elementId) {
  const errorEl = document.getElementById(elementId);
  errorEl.textContent = "";
  errorEl.classList.remove("show");
}

// Export functionality
document.getElementById("export-btn").addEventListener("click", () => {
  const mermaidText = mermaidInput.value.trim();
  const jsonText = jsonEditor.getValue();
  
  try {
    const ast = JSON.parse(jsonText);
    const exportData = {
      mermaid: mermaidText,
      dsl: ast,
      version: "1.0",
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finsteps-presentation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    showError("dsl-error", `Cannot export: ${error.message}`);
  }
});

// Import functionality
document.getElementById("import-btn").addEventListener("click", () => {
  document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importData = JSON.parse(event.target.result);
      
      if (importData.mermaid) {
        mermaidInput.value = importData.mermaid;
      }
      
      if (importData.dsl) {
        const formatted = JSON.stringify(importData.dsl, null, 2);
        jsonEditor.setValue(formatted);
        currentAst = importData.dsl;
        
        // Update visual builder if visual tab is active
        const visualTab = document.getElementById("visual-tab");
        if (visualTab && visualTab.classList.contains("active")) {
          loadASTIntoVisual(importData.dsl);
          const onUpdate = (ast) => {
            const jsonText = JSON.stringify(ast, null, 2);
            jsonEditor.setValue(jsonText);
            currentAst = ast;
            debounceRender();
          };
          initVisualBuilder(visualTab, onUpdate);
        }
        
        renderDiagram();
      }
    } catch (error) {
      showError("dsl-error", `Failed to import: ${error.message}`);
    }
  };
  reader.readAsText(file);
  e.target.value = ""; // Reset file input
});

// Sidebar toggle
document.getElementById("sidebar-toggle").addEventListener("click", () => {
  const inputPanel = document.getElementById("input-panel");
  inputPanel.classList.toggle("collapsed");
});

// Initialize on load
initJSONEditor();

// Render diagram on load
window.addEventListener("load", async () => {
  // Wait a bit for everything to initialize
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Validate initial Mermaid syntax
  await validateMermaidSyntax();
  
  // Validate initial JSON syntax
  validateJSONSyntax();
  
  // Only render if there are no errors
  const mermaidError = document.getElementById("mermaid-error");
  const dslError = document.getElementById("dsl-error");
  if (!mermaidError.classList.contains("show") && !dslError.classList.contains("show")) {
    await renderDiagram();
  }
});

// Initialize visual builder when visual tab is first opened
let visualBuilderInitialized = false;
document.querySelector('[data-tab="visual"]').addEventListener("click", () => {
  if (!visualBuilderInitialized) {
    initVisualBuilder(document.getElementById("visual-tab"), (ast) => {
      const jsonText = JSON.stringify(ast, null, 2);
      jsonEditor.setValue(jsonText);
      currentAst = ast;
      debounceRender();
    });
    visualBuilderInitialized = true;
  }
});
