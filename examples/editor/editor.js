// ============================================
// SECTION: Imports and Configuration
// ============================================

console.log('[Editor] Starting module load...');

import { presentMermaid, parseMPD } from "../../dist/index.js";

console.log('[Editor] Imports successful');

// Initialize Mermaid when it's available
if (typeof mermaid !== 'undefined') {
  mermaid.initialize({ startOnLoad: false, theme: "dark" });
} else {
  window.addEventListener('load', () => {
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ startOnLoad: false, theme: "dark" });
    }
  });
}

// ============================================
// SECTION: Global State (REQ-016: Reactive State Tracking)
// ============================================

// Centralized application state
const editorState = {
  // Core instances
  controller: null,
  mpdEditor: null,

  // Content state
  mermaidText: '',
  mermaidValid: false,
  mpdText: '',
  mpdValid: false,
  currentAst: null,

  // Rendering state
  renderStatus: 'idle', // 'idle', 'rendering', 'ready', 'error'

  // Presentation state
  isPlaying: false,
  playbackInterval: null,
  currentStepIndex: 0,

  // Available targets from diagram
  availableTargets: [],

  // Timers
  renderTimeout: null,
  mermaidValidationTimeout: null,
  mpdValidationTimeout: null
};

// Legacy global references (for backward compatibility)
let controller = null;
let mpdEditor = null;
let currentAst = null;
let renderTimeout = null;
let mermaidValidationTimeout = null;
let mpdValidationTimeout = null;
let isPlaying = false;
let playbackInterval = null;
let currentStepIndex = 0;

// ============================================
// SECTION: State Management and Control Enablement (REQ-017)
// ============================================

/**
 * Update editor state and trigger UI updates
 */
function updateState(updates) {
  console.log('[State] Updating state:', updates);
  Object.assign(editorState, updates);

  // Sync legacy globals
  if ('controller' in updates) controller = updates.controller;
  if ('mpdEditor' in updates) mpdEditor = updates.mpdEditor;
  if ('currentAst' in updates) currentAst = updates.currentAst;
  if ('isPlaying' in updates) isPlaying = updates.isPlaying;
  if ('currentStepIndex' in updates) currentStepIndex = updates.currentStepIndex;

  // Trigger control enablement updates
  updateControlStates();

  console.log('[State] State after update:', {
    renderStatus: editorState.renderStatus,
    hasController: !!editorState.controller,
    hasSteps: editorState.currentAst?.steps?.length || 0,
    mermaidValid: editorState.mermaidValid,
    mpdValid: editorState.mpdValid
  });
}

/**
 * Enable/disable controls based on current state (REQ-017)
 */
function updateControlStates() {
  const hasController = !!editorState.controller;
  const hasValidSteps = editorState.currentAst?.steps && editorState.currentAst.steps.length > 0;
  const isReady = editorState.renderStatus === 'ready';

  console.log('[Controls] Updating control states:', { hasController, hasValidSteps, isReady });

  // Presentation playback controls
  const playBtn = document.getElementById('play-pause');
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');

  const presentationEnabled = hasController && hasValidSteps && isReady;

  if (playBtn) playBtn.disabled = !presentationEnabled;
  if (prevBtn) prevBtn.disabled = !presentationEnabled;
  if (nextBtn) nextBtn.disabled = !presentationEnabled;

  // Camera controls
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const reset = document.getElementById('reset');
  const fitAll = document.getElementById('fit-all');

  const cameraEnabled = hasController && isReady;

  if (zoomIn) zoomIn.disabled = !cameraEnabled;
  if (zoomOut) zoomOut.disabled = !cameraEnabled;
  if (reset) reset.disabled = !cameraEnabled;
  if (fitAll) fitAll.disabled = !cameraEnabled;

  // Export button - enabled when content exists
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    const mermaidInput = document.getElementById('mermaid-input');
    const hasMermaid = mermaidInput && mermaidInput.value.trim().length > 0;
    const hasMpd = mpdEditor && mpdEditor.getValue().trim().length > 0;
    exportBtn.disabled = !(hasMermaid || hasMpd);
  }

  console.log('[Controls] Presentation controls enabled:', presentationEnabled);
  console.log('[Controls] Camera controls enabled:', cameraEnabled);
}

// ============================================
// SECTION: Editor Initialization
// ============================================

// JSON editor removed - MPD only

/**
 * Initialize CodeMirror for MPD editor
 */
function initMPDEditor() {
  const editorElement = document.getElementById("mpd-editor");

  if (!editorElement) {
    console.error("MPD editor element not found");
    return false;
  }

  if (typeof CodeMirror === 'undefined') {
    console.error("CodeMirror not loaded");
    return false;
  }

  mpdEditor = CodeMirror(editorElement, {
    value: `mpd 1.0

deck {
  scene default {
    step overview {
      camera.reset()
    }
  }
}`,
    mode: "javascript",
    theme: "monokai",
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    scrollbarStyle: "native",
    cursorBlinkRate: 530  // Standard blink rate
  });

  // Expose mpdEditor on window for tests
  window.mpdEditor = mpdEditor;

  // Refresh CodeMirror to ensure it renders properly
  requestAnimationFrame(() => {
    if (mpdEditor) {
      mpdEditor.refresh();
    }
  });

  // Handle content changes
  mpdEditor.on("change", () => {
    handleMPDChange();
    // Update export button state when MPD changes
    updateControlStates();
  });

  // Add syntax validation
  mpdEditor.on("change", () => {
    clearTimeout(mpdValidationTimeout);
    mpdValidationTimeout = setTimeout(() => {
      validateMPDSyntax();
    }, 300);
  });

  return true;
}

/**
 * Initialize MPD editor and set up event listeners
 */
function initializeEditors() {
  console.log('[Editor] initializeEditors called');
  console.log('[Editor] document.readyState:', document.readyState);
  console.log('[Editor] CodeMirror available:', typeof CodeMirror !== 'undefined');
  console.log('[Editor] mermaid available:', typeof mermaid !== 'undefined');

  const mpdReady = initMPDEditor();

  console.log('[Editor] mpdReady:', mpdReady);

  if (mpdReady) {
    console.log('[Editor] Setting up event listeners...');
    setupButtonListeners();
    setupMermaidInput();
    setupPaneToggles();
    console.log('[Editor] Initialization complete!');

    // Auto-generate initial presentation
    autoGenerateInitialPresentation();
  } else {
    console.error("[Editor] Failed to initialize editor - mpdReady:", mpdReady);
  }
}

// ============================================
// SECTION: Validation
// ============================================

/**
 * Validate MPD syntax
 */
function validateMPDSyntax() {
  if (!mpdEditor) return;

  const mpdText = mpdEditor.getValue();
  if (!mpdText.trim()) {
    clearError("mpd-error");
    for (let i = 0; i < mpdEditor.lineCount(); i++) {
      mpdEditor.removeLineClass(i, "background", "cm-error-line");
    }
    return;
  }

  try {
    const parseResult = parseMPD(mpdText);
    console.log('[validateMPDSyntax] Parse diagnostics:', parseResult.diagnostics);

    // Clear all error line classes first
    for (let i = 0; i < mpdEditor.lineCount(); i++) {
      mpdEditor.removeLineClass(i, "background", "cm-error-line");
    }

    if (parseResult.diagnostics && parseResult.diagnostics.length > 0) {
      const errors = parseResult.diagnostics.filter(d => d.severity === "error");
      const warnings = parseResult.diagnostics.filter(d => d.severity === "warning");

      if (errors.length > 0) {
      if (errors.length > 0) {
        // Use framework's formatDiagnostics for proper formatting according to spec
        const formatted = formatDiagnostics(parseResult.diagnostics);
        showError("mpd-error", formatted);

        // Highlight error lines in editor
        errors.forEach(err => {
          const lineNum = err.span?.start?.line ?? 0;
          if (lineNum >= 0 && lineNum < mpdEditor.lineCount()) {
            mpdEditor.addLineClass(lineNum, "background", "cm-error-line");
          }
        });
      } else if (warnings.length > 0) {
        // Use framework's formatDiagnostics for proper formatting
        const formatted = formatDiagnostics(parseResult.diagnostics);
        showError("mpd-error", formatted);
        clearError("mpd-error"); // Clear so it doesn't block rendering
      } else {
        clearError("mpd-error");
      }
      } else if (warnings.length > 0) {
        // Use framework's formatDiagnostics for proper formatting
        const formatted = formatDiagnostics(parseResult.diagnostics);
        showError("mpd-error", formatted);
        clearError("mpd-error");
      } else {
        clearError("mpd-error");
      }
    } else if (parseResult.ast) {
      clearError("mpd-error");
    } else {
      showError("mpd-error", "MPD Parse Error: No AST generated");
    }
  } catch (error) {
    showError("mpd-error", `MPD Parse Error: ${error.message}`);
    if (error.line !== undefined && error.line >= 0 && error.line < mpdEditor.lineCount()) {
      mpdEditor.addLineClass(error.line, "background", "cm-error-line");
    }
  }
}

/**
 * Validate Mermaid syntax
 */
async function validateMermaidSyntax() {
  const mermaidInput = document.getElementById("mermaid-input");
  const mermaidText = mermaidInput.value.trim();
  if (!mermaidText) {
    clearError("mermaid-error");
    return;
  }

  try {
    await mermaid.parse(mermaidText);
    clearError("mermaid-error");
    mermaidInput.classList.remove("has-error");
  } catch (error) {
    const errorMsg = error.message || String(error);
    let displayMsg = errorMsg;

    const lineMatch = errorMsg.match(/line (\d+)/i);
    if (lineMatch) {
      const lineNum = lineMatch[1];
      displayMsg = `Syntax Error at line ${lineNum}:\n${errorMsg}`;
    }

    showError("mermaid-error", displayMsg);
    mermaidInput.classList.add("has-error");
  }
}

// ============================================
// SECTION: DSL Conversion
// ============================================

/**
 * Convert MPD AST to JSON AST format
 */
function mpdToAST(mpdAst) {
  console.log('[mpdToAST] Input MPD AST type:', mpdAst.type);
  const steps = [];
  const bindings = [];

  // Find the Deck in the Program body
  let deckNode = null;
  if (mpdAst.type === "Program" && mpdAst.body) {
    deckNode = mpdAst.body.find(item => item.type === "Deck");
  }

  if (!deckNode || !deckNode.items) {
    console.warn('[mpdToAST] No Deck node found in MPD AST!');
    return { steps, bindings };
  }

  console.log('[mpdToAST] Found Deck with', deckNode.items.length, 'items');
  console.log('[mpdToAST] Raw scene AST:', JSON.stringify(deckNode.items[0], null, 2));

  // Process deck items (scenes)
  for (const item of deckNode.items) {
    if (item.type === "SceneDecl") {
      const scene = item;
      console.log('[mpdToAST] Processing scene:', scene.name?.value || 'unnamed');

      if (scene.items) {
        console.log('[mpdToAST] Scene has', scene.items.length, 'items');

        for (const sceneItem of scene.items) {
          console.log('[mpdToAST] Scene item type:', sceneItem.type);

          if (sceneItem.type === "StepDecl") {
            const step = sceneItem;
            const actions = [];

            // Extract actions from step statements (note: it's 'statements' not 'body')
            const stmtArray = step.statements || step.body || [];
            console.log('[mpdToAST] Step has', stmtArray.length, 'statements');

            for (const stmt of stmtArray) {
              console.log('[mpdToAST] Statement type:', stmt.type, stmt);
              if (stmt.type === "CallExpr") {
                const actionName = stmt.callee?.value || stmt.callee;
                console.log('[mpdToAST] Found action:', actionName);
                actions.push({
                  type: actionName,
                  payload: stmt.args ? parseActionArgs(stmt.args) : undefined
                });
              }
            }

            const stepId = step.name?.value || `step-${steps.length + 1}`;
            console.log('[mpdToAST] Adding step:', stepId, 'with', actions.length, 'actions');

            steps.push({
              id: stepId,
              name: stepId,
              actions: actions
            });
          }
        }
      }
    }
  }

  console.log('[mpdToAST] Extracted', steps.length, 'steps');

  // Extract bindings
  if (mpdAst.bindings) {
    for (const binding of mpdAst.bindings) {
      if (binding.rules) {
        for (const rule of binding.rules) {
          const action = rule.action;
          if (action?.type === "call") {
            bindings.push({
              event: rule.event?.type || "click",
              target: rule.event?.target ? parseTarget(rule.event.target) : undefined,
              key: rule.event?.key,
              actions: [{
                type: action.name,
                payload: action.args ? parseActionArgs(action.args) : undefined
              }]
            });
          }
        }
      }
    }
  }

  return { steps, bindings };
}

/**
 * Helper to parse action arguments
 */
function parseActionArgs(args) {
  if (!args || args.length === 0) return undefined;

  const payload = {};
  for (const arg of args) {
    if (arg.name) {
      payload[arg.name] = parseValue(arg.value);
    }
  }
  return Object.keys(payload).length > 0 ? payload : undefined;
}

/**
 * Helper to parse target
 */
function parseTarget(target) {
  if (!target) return undefined;

  if (target.type === "dataId") {
    return { dataId: target.id };
  } else if (target.type === "selector") {
    return { selector: target.selector };
  }
  return undefined;
}

/**
 * Helper to parse values
 */
function parseValue(value) {
  if (value.type === "literal") {
    return value.value;
  } else if (value.type === "object") {
    const obj = {};
    if (value.entries) {
      for (const entry of value.entries) {
        obj[entry.key] = parseValue(entry.value);
      }
    }
    return obj;
  } else if (value.type === "array") {
    return value.elements ? value.elements.map(parseValue) : [];
  }
  return value.value;
}

/**
 * Convert JSON AST to MPD text format
 */
function astToMPD(ast) {
  let mpd = `mpd 1.0

deck {
  scene default {
`;

  if (ast.steps) {
    for (const step of ast.steps) {
      mpd += `    step ${step.id} {
`;
      if (step.actions) {
        for (const action of step.actions) {
          const payloadStr = action.payload ? formatPayload(action.payload) : "";
          // Convert dot notation to space notation for MPD syntax (e.g., "camera.reset" -> "camera reset")
          const actionName = action.type.replace(/\./g, ' ');
          mpd += `      ${actionName}(${payloadStr})
`;
        }
      }
      mpd += `    }
`;
    }
  }

  mpd += `  }
}
`;

  if (ast.bindings && ast.bindings.length > 0) {
    for (const binding of ast.bindings) {
      mpd += `binding {
  on ${binding.event}`;
      if (binding.key) {
        mpd += ` key "${binding.key}"`;
      }
      if (binding.target) {
        mpd += ` target ${formatTarget(binding.target)}`;
      }
      mpd += ` {
`;
      if (binding.actions) {
        for (const action of binding.actions) {
          const payloadStr = action.payload ? formatPayload(action.payload) : "";
          // Convert dot notation to space notation for MPD syntax
          const actionName = action.type.replace(/\./g, ' ');
          mpd += `    ${actionName}(${payloadStr})
`;
        }
      }
      mpd += `  }
}
`;
    }
  }

  return mpd;
}

function formatPayload(payload) {
  const parts = [];
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      parts.push(`${key}: "${value}"`);
    } else if (typeof value === "number" || typeof value === "boolean") {
      parts.push(`${key}: ${value}`);
    } else if (value && typeof value === "object") {
      parts.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  return parts.join(", ");
}

function formatTarget(target) {
  if (target.dataId) {
    return `dataId("${target.dataId}")`;
  } else if (target.selector) {
    return `selector("${target.selector}")`;
  }
  return "";
}

// ============================================
// SECTION: Change Handlers
// ============================================

/**
 * Handle MPD changes - render diagram on change
 */
function handleMPDChange() {
  const mpdText = mpdEditor.getValue();
  if (!mpdText.trim()) {
    clearError("mpd-error");
    return;
  }

  try {
    const parseResult = parseMPD(mpdText);
    
    // Check for errors - don't render if there are blocking errors
    if (parseResult.diagnostics && parseResult.diagnostics.length > 0) {
      const errors = parseResult.diagnostics.filter(d => d.severity === "error");
      if (errors.length > 0) {
        // Errors will be shown by validateMPDSyntax
        return;
      }
    }
    
    if (parseResult.ast) {
      clearError("mpd-error");
      const ast = mpdToAST(parseResult.ast);
      // Update controls after MPD change - this will update navigation buttons, camera controls, etc.
      debounceRender();
    }
  } catch (error) {
    // Errors are handled by validateMPDSyntax
  }
}

// Tab switching removed - MPD only

// ============================================
// SECTION: Mermaid Input
// ============================================

function setupMermaidInput() {
  const mermaidInput = document.getElementById("mermaid-input");
  console.log('[Editor] setupMermaidInput - element found:', !!mermaidInput);
  console.log('[Editor] Mermaid input value:', mermaidInput?.value?.substring(0, 50));
  console.log('[Editor] Mermaid input disabled:', mermaidInput?.disabled);
  console.log('[Editor] Mermaid input readonly:', mermaidInput?.readOnly);

  if (mermaidInput) {
    mermaidInput.addEventListener("input", () => {
      clearError("mermaid-error");
      mermaidInput.classList.remove("has-error");

      // Update export button state when Mermaid changes
      updateControlStates();

      // Validate Mermaid syntax
      clearTimeout(mermaidValidationTimeout);
      mermaidValidationTimeout = setTimeout(() => {
        validateMermaidSyntax();
      }, 300);

      debounceRender();
    });
    console.log('[Editor] Mermaid input event listener attached');
  }
}

// ============================================
// SECTION: Auto-Generation
// ============================================

/**
 * Auto-generate initial presentation on page load
 */
async function autoGenerateInitialPresentation() {
  console.log('[Editor] autoGenerateInitialPresentation called');
  const mermaidInput = document.getElementById("mermaid-input");
  console.log('[Editor] Mermaid input element:', !!mermaidInput);
  const mermaidText = mermaidInput.value.trim();
  console.log('[Editor] Mermaid text length:', mermaidText.length);
  console.log('[Editor] Mermaid text preview:', mermaidText.substring(0, 100));

  // Only auto-generate if there's a diagram and no existing DSL
  if (!mermaidText) {
    console.log('[Editor] No mermaid text, skipping auto-generation');
    return;
  }

  const mpdText = mpdEditor.getValue();
  try {
    const parseResult = parseMPD(mpdText);
    if (parseResult.ast) {
      const ast = mpdToAST(parseResult.ast);
      // If there are already steps defined, don't override
      if (ast.steps && ast.steps.length > 0) return;
    }
  } catch (e) {
    // Invalid MPD or empty, proceed with generation
  }

  console.log('[Editor] Auto-generating initial presentation...');

  try {
    // Reuse existing generation logic
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
    const mpdText = astToMPD(starterDSL);
    mpdEditor.setValue(mpdText);

    document.body.removeChild(tempMount);
    currentAst = starterDSL;
    await renderDiagram();

    console.log('[Editor] Initial presentation generated successfully!');
  } catch (error) {
    console.error('[Editor] Failed to auto-generate presentation:', error);
    // Silently fail - user can still manually generate
  }
}

// ============================================
// SECTION: Button Listeners
// ============================================

function setupButtonListeners() {
  // Generate Presentation button (only button now)
  const generateMpdBtn = document.getElementById("generate-mpd");
  if (generateMpdBtn) {
    generateMpdBtn.addEventListener("click", async () => {
      const mermaidInput = document.getElementById("mermaid-input");
      const mermaidText = mermaidInput.value.trim();
      if (!mermaidText) {
        showError("mermaid-error", "Please enter a Mermaid diagram first");
        return;
      }

      try {
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
        const mpdText = astToMPD(starterDSL);
        mpdEditor.setValue(mpdText);

        document.body.removeChild(tempMount);
        currentAst = starterDSL;
        await renderDiagram();
      } catch (error) {
        showError("mermaid-error", `Failed to generate MPD: ${error.message}`);
      }
    });
  }

  // Export functionality - exports MPD text
  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const mermaidInput = document.getElementById("mermaid-input");
      const mermaidText = mermaidInput.value.trim();
      const mpdText = mpdEditor.getValue();

      try {
        const parseResult = parseMPD(mpdText);
        let ast = null;
        if (parseResult.ast) {
          ast = mpdToAST(parseResult.ast);
        }

        const exportData = {
          mermaid: mermaidText,
          mpd: mpdText,
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
        showError("mpd-error", `Cannot export: ${error.message}`);
      }
    });
  }

  // Import functionality - imports MPD text
  const importBtn = document.getElementById("import-btn");
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      document.getElementById("import-file").click();
    });
  }

  const importFile = document.getElementById("import-file");
  if (importFile) {
    importFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target.result);

          const mermaidInput = document.getElementById("mermaid-input");
          if (importData.mermaid) {
            mermaidInput.value = importData.mermaid;
          }

          if (importData.mpd) {
            mpdEditor.setValue(importData.mpd);
            const parseResult = parseMPD(importData.mpd);
            if (parseResult.ast) {
              currentAst = mpdToAST(parseResult.ast);
            }
            renderDiagram();
          } else if (importData.dsl) {
            // Fallback for old format
            const mpdText = astToMPD(importData.dsl);
            mpdEditor.setValue(mpdText);
            currentAst = importData.dsl;
            renderDiagram();
          }
        } catch (error) {
          showError("mpd-error", `Failed to import: ${error.message}`);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }
}

// ============================================
// SECTION: Pane Toggles
// ============================================

function setupPaneToggles() {
  // Sidebar collapse toggle
  const sidebarToggle = document.getElementById("sidebar-collapse-toggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      const leftPanels = document.querySelector(".left-panels");
      leftPanels.classList.toggle("collapsed");

      // Update icon direction
      const icon = sidebarToggle.querySelector(".collapse-icon");
      if (leftPanels.classList.contains("collapsed")) {
        icon.textContent = "►";
      } else {
        icon.textContent = "◄";
      }
    });
  }

  // Panels expand toggle (shows when sidebar is collapsed)
  const panelsToggle = document.getElementById("panels-toggle-btn");
  if (panelsToggle) {
    panelsToggle.addEventListener("click", () => {
      const leftPanels = document.querySelector(".left-panels");
      leftPanels.classList.remove("collapsed");

      // Update collapse button icon
      const collapseIcon = sidebarToggle?.querySelector(".collapse-icon");
      if (collapseIcon) {
        collapseIcon.textContent = "◄";
      }
    });
  }

  // Mermaid pane toggle
  const mermaidToggle = document.getElementById("mermaid-pane-toggle");
  if (mermaidToggle) {
    mermaidToggle.addEventListener("click", () => {
      const mermaidPane = document.getElementById("mermaid-pane");
      mermaidPane.classList.toggle("collapsed");
    });
  }

  // DSL pane toggle
  const dslToggle = document.getElementById("dsl-pane-toggle");
  if (dslToggle) {
    dslToggle.addEventListener("click", () => {
      const dslPane = document.getElementById("dsl-pane");
      dslPane.classList.toggle("collapsed");
    });
  }
}

// Visual builder removed - MPD only

// ============================================
// SECTION: Rendering
// ============================================

/**
 * Debounced render function
 */
function debounceRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    renderDiagram();
  }, 500);
}

/**
 * Render diagram with current Mermaid and MPD
 */
async function renderDiagram() {
  console.log('[Render] Starting renderDiagram');

  const mermaidInput = document.getElementById("mermaid-input");
  const mermaidText = mermaidInput.value.trim();
  if (!mermaidText) {
    console.log('[Render] No mermaid text, aborting');
    return;
  }

  // Update state: rendering started
  updateState({ renderStatus: 'rendering' });

  const mountEl = document.getElementById("diagram-mount");
  mountEl.innerHTML = "";

  // Parse MPD
  let ast = null;
  const mpdText = mpdEditor.getValue();
  console.log('[Render] MPD text length:', mpdText.length);

  try {
    const parseResult = parseMPD(mpdText);
    console.log('[Render] Parse result:', {
      hasAst: !!parseResult.ast,
      diagnostics: parseResult.diagnostics?.length || 0
    });

    if (parseResult.diagnostics && parseResult.diagnostics.length > 0) {
      const errors = parseResult.diagnostics.filter(d => d.severity === "error");
      if (errors.length > 0) {
        const firstError = errors[0];
        console.error('[Render] MPD parse errors:', errors);
        showError("mpd-error", `MPD Error: ${firstError.message}`);
        updateState({ renderStatus: 'error', mpdValid: false });
        return;
      }
    }

    if (parseResult.ast) {
      ast = mpdToAST(parseResult.ast);
      console.log('[Render] Converted AST:', {
        stepsCount: ast.steps?.length || 0,
        bindingsCount: ast.bindings?.length || 0
      });

      if (!ast.steps || ast.steps.length === 0) {
        console.error('[Render] AST has no steps!');
        showError("mpd-error", "DSL must have at least one step");
        updateState({ renderStatus: 'error', mpdValid: false });
        return;
      }

      clearError("mpd-error");
      updateState({ mpdValid: true });
    } else {
      console.error('[Render] No AST generated');
      showError("mpd-error", "Failed to parse MPD");
      updateState({ renderStatus: 'error', mpdValid: false });
      return;
    }
  } catch (error) {
    console.error('[Render] MPD parse exception:', error);
    showError("mpd-error", `Invalid MPD: ${error.message}`);
    updateState({ renderStatus: 'error', mpdValid: false });
    return;
  }

  // Validate AST structure
  if (!ast.steps || !Array.isArray(ast.steps)) {
    console.error('[Render] Invalid AST structure');
    showError("mpd-error", "DSL must have a 'steps' array");
    updateState({ renderStatus: 'error' });
    return;
  }

  try {
    // Stop any active playback
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
    }

    // Clean up previous controller
    if (controller) {
      try {
        controller.destroy();
      } catch (e) {
        console.warn('[Render] Controller destroy error:', e);
      }
    }

    console.log('[Render] Calling presentMermaid...');
    // Render new diagram using MPD
    const newController = await presentMermaid({
      mountEl,
      mermaidText,
      mpdText,
      options: {
        parseMpd: parseMPD
      }
    });

    console.log('[Render] presentMermaid completed, controller created');

    // Update state with new controller and AST
    updateState({
      controller: newController,
      currentAst: ast,
      renderStatus: 'ready',
      mermaidValid: true,
      mpdValid: true,
      currentStepIndex: 0,
      isPlaying: false
    });

    // Update available dataIds
    updateAvailableDataIds(newController);

    // Update navigation buttons
    console.log('[Render] Updating navigation buttons with', ast.steps.length, 'steps');
    updateNavigationButtons(ast.steps);

    // Setup camera controls
    setupCameraControls(newController);

    // Setup presentation controls
    console.log('[Render] Setting up presentation controls');
    setupPresentationControls(newController);

    // Update active button state
    newController.on("stepchange", (state) => {
      console.log('[Render] Step changed to index:', state.stepIndex);
      const currentStep = ast.steps[state.stepIndex];
      if (currentStep) {
        updateActiveNavButton(currentStep.id);
        updateState({ currentStepIndex: state.stepIndex });
      }
    });

    // Go to first step to initialize the presentation
    if (ast.steps && ast.steps.length > 0) {
      try {
        console.log('[Render] Going to first step:', ast.steps[0].id);
        await newController.goto(ast.steps[0].id);
      } catch (e) {
        console.warn('[Render] Could not goto first step:', e);
      }
    }

    console.log('[Render] Render completed successfully!');

  } catch (error) {
    console.error('[Render] Render error:', error);
    showError("mermaid-error", `Render error: ${error.message}`);
    updateState({ renderStatus: 'error' });
  }
}

// ============================================
// SECTION: DSL Generation
// ============================================

/**
 * Generate starter DSL from diagram
 */
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

/**
 * Extract available dataIds from diagram
 */
function extractAvailableDataIds(diagramHandle) {
  const svg = diagramHandle.getRoot();
  const dataIdElements = Array.from(svg.querySelectorAll("[data-id]"));
  return dataIdElements.map(el => ({
    dataId: el.getAttribute("data-id"),
    element: el,
    tagName: el.tagName
  })).filter(item => item.dataId);
}

// ============================================
// SECTION: UI Updates
// ============================================

/**
 * Update available dataIds panel
 */
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

  // Add click handlers to insert dataId into MPD
  dataIdsList.querySelectorAll(".dataid-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const dataId = chip.dataset.dataid;
      insertDataIdIntoMPD(dataId);
    });
  });
}

/**
 * Insert dataId into MPD editor at cursor position
 */
function insertDataIdIntoMPD(dataId) {
  const cursor = mpdEditor.getCursor();
  const text = `"${dataId}"`;
  mpdEditor.replaceSelection(text);
  mpdEditor.setCursor(cursor.line, cursor.ch + text.length);
}

/**
 * Update navigation buttons
 */
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

/**
 * Update active navigation button
 */
function updateActiveNavButton(stepId) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.goto === stepId);
  });
}

/**
 * Setup camera controls
 */
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

/**
 * Setup presentation playback controls
 */
function setupPresentationControls(controller) {
  if (!controller) return;

  const playPauseBtn = document.getElementById("play-pause");
  const prevBtn = document.getElementById("prev-step");
  const nextBtn = document.getElementById("next-step");
  const stepDisplay = document.getElementById("current-step-display");

  if (!playPauseBtn || !prevBtn || !nextBtn || !stepDisplay) return;

  // Update step display
  const updateStepDisplay = () => {
    if (!currentAst || !currentAst.steps) {
      stepDisplay.textContent = "Step 0 / 0";
      return;
    }
    stepDisplay.textContent = `Step ${currentStepIndex + 1} / ${currentAst.steps.length}`;
  };

  // Stop playback
  const stopPlayback = () => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
    }
    isPlaying = false;
    playPauseBtn.classList.remove("playing");
    playPauseBtn.querySelector(".btn-icon").textContent = "▶";
    playPauseBtn.title = "Play Presentation";
  };

  // Start playback
  const startPlayback = () => {
    if (!currentAst || !currentAst.steps || currentAst.steps.length === 0) {
      return;
    }

    isPlaying = true;
    playPauseBtn.classList.add("playing");
    playPauseBtn.querySelector(".btn-icon").textContent = "⏸";
    playPauseBtn.title = "Pause Presentation";

    playbackInterval = setInterval(() => {
      if (currentStepIndex < currentAst.steps.length - 1) {
        currentStepIndex++;
        const stepId = currentAst.steps[currentStepIndex].id;
        controller.goto(stepId);
        updateStepDisplay();
        updateActiveNavButton(stepId);
      } else {
        // Reached the end, stop playback
        stopPlayback();
      }
    }, 3000); // 3 seconds per step
  };

  // Play/Pause button
  playPauseBtn.addEventListener("click", () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  // Previous button
  prevBtn.addEventListener("click", () => {
    stopPlayback();
    if (!currentAst || !currentAst.steps || currentAst.steps.length === 0) {
      return;
    }
    if (currentStepIndex > 0) {
      currentStepIndex--;
      const stepId = currentAst.steps[currentStepIndex].id;
      controller.goto(stepId);
      updateStepDisplay();
      updateActiveNavButton(stepId);
    }
  });

  // Next button
  nextBtn.addEventListener("click", () => {
    stopPlayback();
    if (!currentAst || !currentAst.steps || currentAst.steps.length === 0) {
      return;
    }
    if (currentStepIndex < currentAst.steps.length - 1) {
      currentStepIndex++;
      const stepId = currentAst.steps[currentStepIndex].id;
      controller.goto(stepId);
      updateStepDisplay();
      updateActiveNavButton(stepId);
    }
  });

  // Listen to controller step changes
  controller.on("stepchange", (state) => {
    currentStepIndex = state.stepIndex;
    updateStepDisplay();
  });

  // Initialize display
  updateStepDisplay();
}

// ============================================
// SECTION: Error Handling
// ============================================

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

// ============================================
// SECTION: Initialization
// ============================================

// Initialize editors when DOM is ready
console.log('[Editor] Setting up initialization, readyState:', document.readyState);
if (document.readyState === 'loading') {
  console.log('[Editor] DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', initializeEditors);
} else {
  console.log('[Editor] DOM already loaded, initializing immediately...');
  initializeEditors();
}
