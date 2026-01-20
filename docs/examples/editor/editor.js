// ============================================
// SECTION: Imports and Configuration
// ============================================

console.log('[Editor] Starting module load...');

import { presentMermaid, parseMPD, formatDiagnostics, createBasicCameraHandle } from "../../dist/index.js";

console.log('[Editor] Imports successful');
console.log('[Editor] createBasicCameraHandle type:', typeof createBasicCameraHandle);
console.log('[Editor] createBasicCameraHandle:', createBasicCameraHandle);

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

// Expose editorState on window immediately for tests
window.editorState = editorState;

// Legacy global references (for backward compatibility)
let controller = null;
let cameraHandle = null; // Store camera handle separately for direct access
let mpdEditor = null;
let currentAst = null;
let renderTimeout = null;
let mermaidValidationTimeout = null;
let mpdValidationTimeout = null;
let isPlaying = false;
let playbackInterval = null;
let currentStepIndex = 0;
let isSettingMpdProgrammatically = false; // Flag to prevent change handler from triggering render

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
    const hasMermaid = mermaidInput && mermaidInput.value && mermaidInput.value.trim().length > 0;
    let hasMpd = false;
    try {
      if (mpdEditor && typeof mpdEditor.getValue === 'function') {
        const mpdValue = mpdEditor.getValue();
        hasMpd = mpdValue && mpdValue.trim().length > 0;
      }
    } catch (e) {
      // mpdEditor might not be initialized yet
      console.warn('[Controls] mpdEditor not ready:', e);
    }
    const shouldEnable = hasMermaid || hasMpd;
    exportBtn.disabled = !shouldEnable;
    console.log('[Controls] Export button state:', { hasMermaid, hasMpd, shouldEnable, disabled: exportBtn.disabled });
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
  
  // Expose editorState on window for tests
  window.editorState = editorState;

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

    // Initial control state update
    updateControlStates();

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
        // Show warnings but don't block rendering - warnings are informational
        showError("mpd-error", formatted);
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
  if (!mermaidInput) {
    console.error('[validateMermaidSyntax] Mermaid input element not found');
    return;
  }

  const mermaidText = mermaidInput.value.trim();
  if (!mermaidText) {
    clearError("mermaid-error");
    mermaidInput.classList.remove("has-error");
    return;
  }

  try {
    // mermaid.parse() is async and may throw synchronously or asynchronously
    const result = await mermaid.parse(mermaidText);
    // If parse succeeds, clear errors
    clearError("mermaid-error");
    mermaidInput.classList.remove("has-error");
    editorState.mermaidValid = true;
    updateState({ mermaidValid: true });
  } catch (error) {
    // Parse failed - display error
    const errorMsg = error.message || String(error) || 'Unknown syntax error';
    let displayMsg = errorMsg;

    const lineMatch = errorMsg.match(/line (\d+)/i);
    if (lineMatch) {
      const lineNum = lineMatch[1];
      displayMsg = `Syntax Error at line ${lineNum}:\n${errorMsg}`;
    }

    showError("mermaid-error", displayMsg);
    mermaidInput.classList.add("has-error");
    editorState.mermaidValid = false;
    updateState({ mermaidValid: false });
    
    console.log('[validateMermaidSyntax] Error detected:', errorMsg);
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
              
              // Handle DoStmt (new MPD syntax: "camera fit(...)" without "do" keyword)
              if (stmt.type === "DoStmt" && stmt.action) {
                const actionCall = stmt.action;
                console.log('[mpdToAST] Found DoStmt with action:', actionCall);
                console.log('[mpdToAST] Action name:', actionCall.name);
                console.log('[mpdToAST] Action args:', actionCall.args);
                
                // Convert space-separated action name to dot-separated (e.g., "camera fit" → "camera.fit")
                const actionName = actionCall.name ? actionCall.name.replace(/\s+/g, '.') : null;
                console.log('[mpdToAST] Converted action name:', actionName);
                
                if (actionName) {
                  // Parse action arguments
                  let payload = undefined;
                  if (actionCall.args && actionCall.args.length > 0) {
                    payload = {};
                    for (const arg of actionCall.args) {
                      // ActionArg has 'key' (not 'name') and 'value' (which is an Expr)
                      if (arg.key) {
                        console.log('[mpdToAST] Parsing arg:', arg.key, '=', arg.value);
                        let key = arg.key;
                        // Normalize common typos/mistakes in key names
                        if (key === 'ataI' || key === 'atai') {
                          key = 'dataId';
                          console.log('[mpdToAST] Normalized key from', arg.key, 'to', key);
                        }
                        const value = parseValue(arg.value);
                        // Special handling for target objects - ensure dataId key is correct
                        if (key === 'target' && value && typeof value === 'object') {
                          if (value.ataI) {
                            value.dataId = value.ataI;
                            delete value.ataI;
                            console.log('[mpdToAST] Normalized target.ataI to target.dataId');
                          }
                        }
                        payload[key] = value;
                      } else {
                        // Positional argument (no key) - skip for now as we don't have a way to handle them
                        console.warn('[mpdToAST] Skipping positional arg:', arg);
                      }
                    }
                    console.log('[mpdToAST] Parsed payload:', payload);
                  }
                  
                  actions.push({
                    type: actionName,
                    payload: Object.keys(payload || {}).length > 0 ? payload : undefined
                  });
                  console.log('[mpdToAST] Added action:', actionName, 'with payload:', payload);
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:452',message:'Action extracted with full payload',data:{actionName,payload,payloadKeys:payload?Object.keys(payload):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                }
              }
              // Handle CallExpr (old syntax - for backward compatibility)
              else if (stmt.type === "CallExpr") {
                const actionName = stmt.callee?.value || stmt.callee;
                console.log('[mpdToAST] Found CallExpr action:', actionName);
                actions.push({
                  type: actionName,
                  payload: stmt.args ? parseActionArgs(stmt.args) : undefined
                });
              }
            }

            const stepId = step.name?.value || `step-${steps.length + 1}`;
            console.log('[mpdToAST] Adding step:', stepId, 'with', actions.length, 'actions');
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:471',message:'Step extracted from MPD',data:{stepId,actionCount:actions.length,actions:actions.map(a=>({type:a.type,hasPayload:!!a.payload}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion

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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:446',message:'Final AST structure',data:{stepCount:steps.length,steps:steps.map(s=>({id:s.id,actionCount:s.actions?.length||0,actions:s.actions?.map(a=>({type:a.type,hasPayload:!!a.payload}))||[]}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

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
    // Support both 'name' (old format) and 'key' (new ActionArg format)
    const key = arg.key || arg.name;
    if (key) {
      payload[key] = parseValue(arg.value);
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
  console.log('[parseValue] Parsing value:', value, 'type:', value?.type);
  
  if (!value || typeof value !== 'object') {
    console.log('[parseValue] Value is not an object, returning as-is:', value);
    return value;
  }
  
  // Handle LiteralExprNode (type: "Literal")
  if (value.type === "Literal" || value.type === "literal") {
    console.log('[parseValue] Literal value:', value.value, 'literalType:', value.literalType);
    return value.value;
  }
  
  // Handle ObjectExprNode (type: "ObjectExpr")
  if (value.type === "ObjectExpr" || value.type === "object") {
    console.log('[parseValue] ObjectExpr with entries:', value.entries);
    const obj = {};
    if (value.entries) {
      for (const entry of value.entries) {
        // ObjectEntryNode has 'key' (which can be a string or NameValue) and 'value' (Expr)
        const key = typeof entry.key === 'string' ? entry.key : (entry.key?.value || entry.key);
        console.log('[parseValue] Object entry key:', key, 'value:', entry.value);
        obj[key] = parseValue(entry.value);
      }
    }
    console.log('[parseValue] Parsed object:', obj);
    return obj;
  }
  
  // Handle ArrayExprNode (type: "ArrayExpr")
  if (value.type === "ArrayExpr" || value.type === "array") {
    console.log('[parseValue] ArrayExpr with elements:', value.elements);
    return value.elements ? value.elements.map(parseValue) : [];
  }
  
  // Fallback: try to get value property
  if (value.value !== undefined) {
    console.log('[parseValue] Using value property:', value.value);
  return value.value;
  }
  
  console.warn('[parseValue] Unknown value type:', value.type, value);
  return value;
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
  // Don't trigger render if we're programmatically setting the MPD value
  if (isSettingMpdProgrammatically) {
    console.log('[handleMPDChange] Skipping render - MPD being set programmatically');
    return;
  }
  
  const mpdText = mpdEditor.getValue();
  if (!mpdText.trim()) {
    clearError("mpd-error");
    // Update control states when content is cleared
    updateControlStates();
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
    
    // Set value without triggering change event to avoid double render
    // We'll call renderDiagram() manually after setting the value
    mpdEditor.off("change"); // Temporarily remove change listeners
    mpdEditor.setValue(mpdText);
    // Re-attach change listeners
    mpdEditor.on("change", () => {
      handleMPDChange();
      updateControlStates();
    });
    mpdEditor.on("change", () => {
      clearTimeout(mpdValidationTimeout);
      mpdValidationTimeout = setTimeout(() => {
        validateMPDSyntax();
      }, 300);
    });

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
    
    // Set flag to prevent change handler from triggering render
    isSettingMpdProgrammatically = true;
    mpdEditor.setValue(mpdText);
    isSettingMpdProgrammatically = false;

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
            isSettingMpdProgrammatically = true;
            mpdEditor.setValue(importData.mpd);
            isSettingMpdProgrammatically = false;
            const parseResult = parseMPD(importData.mpd);
            if (parseResult.ast) {
              currentAst = mpdToAST(parseResult.ast);
            }
            renderDiagram();
          } else if (importData.dsl) {
            // Fallback for old format
            const mpdText = astToMPD(importData.dsl);
            isSettingMpdProgrammatically = true;
            mpdEditor.setValue(mpdText);
            isSettingMpdProgrammatically = false;
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
    sidebarToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[PaneToggles] Sidebar toggle clicked');
      const leftPanels = document.querySelector(".left-panels");
      if (!leftPanels) {
        console.error('[PaneToggles] .left-panels element not found');
        return;
      }
      
      const wasCollapsed = leftPanels.classList.contains("collapsed");
      leftPanels.classList.toggle("collapsed");
      const isNowCollapsed = leftPanels.classList.contains("collapsed");
      
      console.log('[PaneToggles] Sidebar state changed:', { wasCollapsed, isNowCollapsed });

      // Update icon direction
      const icon = sidebarToggle.querySelector(".collapse-icon");
      if (icon) {
        if (isNowCollapsed) {
        icon.textContent = "►";
      } else {
        icon.textContent = "◄";
        }
      }
    });
    console.log('[PaneToggles] Sidebar toggle event listener attached');
  } else {
    console.error('[PaneToggles] Sidebar toggle button not found');
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

  // Parse MPD - MPD always controls interactivity when present (REQ-EDITOR-018)
  let ast = null;
  const mpdText = mpdEditor.getValue();
  console.log('[Render] MPD text length:', mpdText.length);

  // If MPD text exists, it must be valid (no parse errors) to proceed
  // Even if it has no steps, valid MPD will control interactivity
  if (mpdText.trim()) {
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

        // MPD is valid - allow rendering even if no steps (REQ-EDITOR-018)
        // presentMermaid can handle empty/minimal MPD
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

    // Validate AST structure exists (but allow empty steps array)
    if (!ast || typeof ast !== 'object') {
    console.error('[Render] Invalid AST structure');
      showError("mpd-error", "DSL must have a valid structure");
    updateState({ renderStatus: 'error' });
    return;
    }

    // Ensure steps is an array (can be empty)
    if (!Array.isArray(ast.steps)) {
      ast.steps = [];
    }
  } else {
    // No MPD text - create minimal AST for presentMermaid
    // presentMermaid requires either ast or mpdText, so we'll pass empty mpdText
    console.log('[Render] No MPD text, will render without MPD interactivity');
    ast = { steps: [], bindings: [] };
  }

  try {
    // Stop any active playback
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
    }

    // Clean up previous controller and camera
    if (controller) {
      try {
        controller.destroy();
      } catch (e) {
        console.warn('[Render] Controller destroy error:', e);
      }
    }
    if (cameraHandle) {
      try {
        cameraHandle.destroy();
      } catch (e) {
        console.warn('[Render] Camera destroy error:', e);
      }
      cameraHandle = null;
    }

    console.log('[Render] Calling presentMermaid...');
    // Render new diagram using MPD - MPD always controls interactivity when present (REQ-EDITOR-018)
    // When MPD exists, it MUST define all interactivity regardless of rendering order
    // Create a wrapper for parseMpd that converts ParseResult to PresentationAst
    const parseMpdWrapper = (mpdTextInput) => {
      console.log('[parseMpdWrapper] Parsing MPD text, length:', mpdTextInput.length);
      const parseResult = parseMPD(mpdTextInput);
      console.log('[parseMpdWrapper] Parse result:', parseResult);
      if (!parseResult.ast) {
        console.warn('[parseMpdWrapper] No AST from parse, returning minimal AST');
        // Return minimal AST if parsing fails (but no errors)
        return { steps: [], bindings: [] };
      }
      const ast = mpdToAST(parseResult.ast);
      console.log('[parseMpdWrapper] Converted to AST:', ast);
      console.log('[parseMpdWrapper] AST steps:', ast.steps?.map(s => ({
        id: s.id,
        actionCount: s.actions?.length || 0,
        actions: s.actions?.map(a => ({ type: a.type, hasPayload: !!a.payload, payloadKeys: a.payload ? Object.keys(a.payload) : [] }))
      })));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1155',message:'parseMpdWrapper result',data:{stepCount:ast.steps?.length||0,steps:ast.steps?.map(s=>({id:s.id,actionCount:s.actions?.length||0,actions:s.actions?.map(a=>({type:a.type,hasPayload:!!a.payload,payloadKeys:a.payload?Object.keys(a.payload):[]}))}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return ast;
    };

    // Always pass mpdText if it exists - MPD controls interactivity when present (REQ-EDITOR-018)
    // If MPD text exists (even if minimal), it MUST define all interactivity
    // If MPD text is empty, pass the minimal AST we created
    console.log('[Render] AST being passed to presentMermaid:', JSON.stringify(ast, null, 2));
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1087',message:'AST passed to presentMermaid',data:{hasMpdText:!!mpdText.trim(),stepCount:ast.steps?.length||0,steps:ast.steps?.map(s=>({id:s.id,actionCount:s.actions?.length||0,actionTypes:s.actions?.map(a=>a.type)||[]}))||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const newController = await presentMermaid({
      mountEl,
      mermaidText,
      mpdText: mpdText.trim() || undefined, // Pass MPD text if present (even if minimal)
      ast: mpdText.trim() ? undefined : ast, // Pass AST only if no MPD text
      options: {
        parseMpd: parseMpdWrapper, // Use wrapper to convert ParseResult to PresentationAst
        hooks: {
          onStepChange: (state, step) => {
            // Update navigation buttons when step changes
            const steps = newController.getSteps?.() || [];
            if (steps.length > 0) {
              updateNavigationButtons(steps);
              updateActiveNavButton(step.id);
            }
            updateState({ currentStepIndex: state.stepIndex });
          },
          onActionError: (error, context) => {
            // Show error in editor
            if (context.step) {
              showError("mpd-error", `Action error in step "${context.step.id}": ${error.message}`);
            } else {
              showError("mpd-error", `Action error: ${error.message}`);
            }
          }
        }
      }
    });
    
    // Check controller state immediately after creation
    // Note: presentMermaid calls controller.init() internally, so the controller should already be initialized
    const initialState = newController.getState();
    console.log('[Render] Controller initial state after presentMermaid:', initialState);
    console.log('[Render] Expected step IDs from AST:', ast.steps?.map(s => s.id));
    
    // Use new accessor pattern to get steps
    let controllerStepIds = [];
    let controllerStepDetails = [];
    try {
      const controllerSteps = newController.getSteps?.() || [];
      if (controllerSteps && Array.isArray(controllerSteps)) {
        controllerStepIds = controllerSteps.map(s => s.id);
        controllerStepDetails = controllerSteps.map((s, i) => ({
          index: i,
          id: s.id,
          hasActions: !!s.actions,
          actionCount: s.actions?.length || 0,
          actions: s.actions?.map(a => ({ type: a.type, hasPayload: !!a.payload }))
        }));
        console.log('[Render] Controller step IDs (via getSteps):', controllerStepIds);
        console.log('[Render] Controller step details:', controllerStepDetails);
      } else {
        console.warn('[Render] Controller steps is not an array:', controllerSteps);
      }
    } catch (e) {
      console.warn('[Render] Could not get controller steps:', e);
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1179',message:'Controller created - initial state',data:{initialState,stepCount:initialState.stepCount,stepIndex:initialState.stepIndex,stepId:initialState.stepId,expectedStepIds:ast.steps?.map(s=>s.id),controllerStepIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Get camera handle for manual controls (zoom/pan buttons)
    // Use new accessor pattern to get camera from controller
    console.log('[Camera] Getting camera handle from controller...');
    try {
      const deps = newController.getDeps();
      cameraHandle = deps.camera;
      console.log('[Camera] Camera handle retrieved from controller:', cameraHandle);
      if (cameraHandle) {
        console.log('[Camera] Camera handle methods available:', {
          zoom: typeof cameraHandle.zoom,
          reset: typeof cameraHandle.reset,
          fitAll: typeof cameraHandle.fitAll
        });
      } else {
        console.warn('[Camera] Camera handle is null/undefined from controller');
      }
    } catch (e) {
      console.error('[Camera] ERROR: Could not get camera from controller:', e);
    }

    console.log('[Render] presentMermaid completed, controller created');

    // Check controller state before updating editor state
    const controllerStateAfterInit = newController.getState();
    console.log('[Render] Controller state after init (before updateState):', controllerStateAfterInit);

    // Update state with new controller and AST
    updateState({
      controller: newController,
      currentAst: ast,
      renderStatus: 'ready',
      mermaidValid: true,
      mpdValid: true,
      currentStepIndex: controllerStateAfterInit.stepIndex >= 0 ? controllerStateAfterInit.stepIndex : 0,
      isPlaying: false
    });
    
    // Verify state was updated correctly
    console.log('[Render] Editor state after updateState:', {
      hasController: !!editorState.controller,
      hasValidSteps: !!(editorState.currentAst?.steps && editorState.currentAst.steps.length > 0),
      isReady: editorState.renderStatus === 'ready',
      renderStatus: editorState.renderStatus
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1307',message:'State updated after render',data:{controllerState:controllerStateAfterInit,editorState:{hasController:!!editorState.controller,hasValidSteps:!!(editorState.currentAst?.steps&&editorState.currentAst.steps.length>0),isReady:editorState.renderStatus==='ready',renderStatus:editorState.renderStatus}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Update available dataIds
    updateAvailableDataIds(newController);

    // Update navigation buttons using controller's getSteps() method
    const steps = newController.getSteps?.() || [];
    if (steps.length > 0) {
      console.log('[Render] Updating navigation buttons with', steps.length, 'steps');
      console.log('[Render] Step IDs:', steps.map(s => s.id));
      updateNavigationButtons(steps);
    } else {
      console.log('[Render] No steps in MPD, clearing navigation buttons');
      updateNavigationButtons([]);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1342',message:'updateNavigationButtons called with empty array',data:{hasAst:!!ast,hasSteps:!!ast?.steps,stepCount:ast?.steps?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }

    // Setup camera controls
    setupCameraControls(newController);

    // Setup presentation controls
    console.log('[Render] Setting up presentation controls');
    setupPresentationControls(newController);

    // Update active button state (only if steps exist)
    if (ast && ast.steps && ast.steps.length > 0) {
    newController.on("stepchange", (state) => {
      console.log('[Render] Step changed to index:', state.stepIndex);
        console.log('[Render] Step change state:', state);
        
        // Check DOM state when stepchange fires
        const svg = document.querySelector('.finsteps-diagram svg');
        const domState = {
          viewBox: svg?.getAttribute('viewBox') || null,
          highlightedCount: document.querySelectorAll('.finsteps-highlight').length,
          overlayBubblesCount: document.querySelectorAll('.finsteps-bubble, [class*="bubble"]').length
        };
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1287',message:'stepchange event fired',data:{stepIndex:state.stepIndex,stepId:state.stepId,stepCount:state.stepCount,domState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      const currentStep = ast.steps[state.stepIndex];
      if (currentStep) {
          console.log('[Render] Current step actions:', currentStep.actions);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1287',message:'Current step details',data:{stepId:currentStep.id,actionCount:currentStep.actions?.length||0,actions:currentStep.actions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        updateActiveNavButton(currentStep.id);
        updateState({ currentStepIndex: state.stepIndex });
          
          // Check DOM again after a delay to see if actions executed
          setTimeout(() => {
            const svgAfter = document.querySelector('.finsteps-diagram svg');
            const domStateAfter = {
              viewBox: svgAfter?.getAttribute('viewBox') || null,
              highlightedCount: document.querySelectorAll('.finsteps-highlight').length,
              overlayBubblesCount: document.querySelectorAll('.finsteps-bubble, [class*="bubble"]').length,
              viewBoxChanged: domState.viewBox !== (svgAfter?.getAttribute('viewBox') || null),
              highlightsChanged: domState.highlightedCount !== document.querySelectorAll('.finsteps-highlight').length
            };
            console.log('[Render] DOM state after stepchange (delayed):', domStateAfter);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1287',message:'DOM state after stepchange delay',data:{stepId:currentStep.id,domStateAfter,viewBoxChanged:domStateAfter.viewBoxChanged,highlightsChanged:domStateAfter.highlightsChanged},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
          }, 700);
        } else {
          console.warn('[Render] No step found at index:', state.stepIndex);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1287',message:'No step found at index',data:{stepIndex:state.stepIndex,astStepCount:ast.steps.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
      }
    });

    // Go to first step to initialize the presentation
      try {
        console.log('[Render] Going to first step:', ast.steps[0].id);
        console.log('[Render] First step actions:', ast.steps[0].actions);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1289',message:'Calling goto for first step',data:{stepId:ast.steps[0].id,actionCount:ast.steps[0].actions?.length||0,actions:ast.steps[0].actions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        await newController.goto(ast.steps[0].id);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1289',message:'goto for first step completed',data:{stepId:ast.steps[0].id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      } catch (e) {
        console.warn('[Render] Could not goto first step:', e);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1289',message:'goto for first step failed',data:{stepId:ast.steps[0].id,error:e.message,stack:e.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
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
  console.log('[updateNavigationButtons] Called with steps:', steps);
  console.log('[updateNavigationButtons] Steps count:', steps?.length || 0);
  const navButtons = document.getElementById("nav-buttons");
  console.log('[updateNavigationButtons] navButtons element:', navButtons);
  if (!navButtons) {
    console.error('[updateNavigationButtons] nav-buttons element not found!');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1555',message:'nav-buttons element not found',data:{stepCount:steps?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return;
  }
  if (!steps || steps.length === 0) {
    console.log('[updateNavigationButtons] No steps, clearing buttons');
    navButtons.innerHTML = '<p class="empty-state">No steps defined</p>';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1555',message:'No steps, clearing buttons',data:{stepCount:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return;
  }

  const buttonHTML = steps.map(step =>
    `<button class="nav-btn" data-goto="${step.id}">${step.name || step.id}</button>`
  ).join("");
  console.log('[updateNavigationButtons] Creating', steps.length, 'buttons');
  console.log('[updateNavigationButtons] Button HTML:', buttonHTML);
  navButtons.innerHTML = buttonHTML;
  
  // Verify buttons were actually added to DOM
  const buttonsAfter = navButtons.querySelectorAll('.nav-btn');
  console.log('[updateNavigationButtons] Buttons in DOM after innerHTML:', buttonsAfter.length);
  console.log('[updateNavigationButtons] navButtons.innerHTML after setting:', navButtons.innerHTML.substring(0, 200));
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1555',message:'Navigation buttons created',data:{stepCount:steps.length,stepIds:steps.map(s=>s.id),buttonHTML,buttonsInDOM:buttonsAfter.length,innerHTMLPreview:navButtons.innerHTML.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // Check again after a delay to see if they're still there
  setTimeout(() => {
    const buttonsLater = navButtons.querySelectorAll('.nav-btn');
    const innerHTMLLater = navButtons.innerHTML;
    console.log('[updateNavigationButtons] Buttons in DOM after 500ms:', buttonsLater.length);
    console.log('[updateNavigationButtons] innerHTML after 500ms:', innerHTMLLater.substring(0, 200));
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1555',message:'Navigation buttons check after delay',data:{buttonsInDOM:buttonsLater.length,innerHTMLPreview:innerHTMLLater.substring(0,200),innerHTMLChanged:innerHTMLLater!==buttonHTML},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  }, 500);

  // Add click handlers
  navButtons.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const stepId = btn.dataset.goto;
      
      // Capture DOM state BEFORE navigation
      const svg = document.querySelector('.finsteps-diagram svg');
      const beforeState = {
        viewBox: svg?.getAttribute('viewBox') || null,
        highlightedElements: Array.from(document.querySelectorAll('.finsteps-highlight')).map(el => ({
          tag: el.tagName,
          dataId: el.getAttribute('data-id'),
          id: el.id,
          classes: Array.from(el.classList)
        })),
        overlayBubbles: Array.from(document.querySelectorAll('.finsteps-bubble, [class*="bubble"]')).length
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1443',message:'Navigation button clicked - BEFORE',data:{stepId,hasController:!!controller,beforeState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('[Nav] Button clicked, stepId:', stepId, 'controller:', controller);
      console.log('[Nav] DOM state BEFORE:', beforeState);
      
      if (controller) {
        console.log('[Nav] Calling controller.goto(', stepId, ')');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1446',message:'Calling controller.goto',data:{stepId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Check controller state before goto
        const controllerStateBefore = controller.getState();
        console.log('[Nav] Controller state BEFORE goto:', controllerStateBefore);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1529',message:'Controller state before goto',data:{stepId,controllerState:controllerStateBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        controller.goto(stepId).then(() => {
          console.log('[Nav] controller.goto completed for stepId:', stepId);
          
          // Check controller state after goto
          const controllerStateAfter = controller.getState();
          console.log('[Nav] Controller state AFTER goto:', controllerStateAfter);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1529',message:'Controller state after goto',data:{stepId,controllerState:controllerStateAfter,stepIndexChanged:controllerStateBefore.stepIndex!==controllerStateAfter.stepIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          
          // Capture DOM state AFTER navigation (wait a bit for animations)
          setTimeout(() => {
            const afterState = {
              viewBox: svg?.getAttribute('viewBox') || null,
              highlightedElements: Array.from(document.querySelectorAll('.finsteps-highlight')).map(el => ({
                tag: el.tagName,
                dataId: el.getAttribute('data-id'),
                id: el.id,
                classes: Array.from(el.classList)
              })),
              overlayBubbles: Array.from(document.querySelectorAll('.finsteps-bubble, [class*="bubble"]')).length,
              viewBoxChanged: beforeState.viewBox !== (svg?.getAttribute('viewBox') || null),
              highlightsChanged: JSON.stringify(beforeState.highlightedElements) !== JSON.stringify(Array.from(document.querySelectorAll('.finsteps-highlight')).map(el => ({
                tag: el.tagName,
                dataId: el.getAttribute('data-id'),
                id: el.id,
                classes: Array.from(el.classList)
              })))
            };
            
            console.log('[Nav] DOM state AFTER:', afterState);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1446',message:'controller.goto completed - AFTER DOM check',data:{stepId,afterState,viewBoxChanged:afterState.viewBoxChanged,highlightsChanged:afterState.highlightsChanged},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
          }, 600); // Wait 600ms for animations to complete
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1446',message:'controller.goto completed',data:{stepId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }).catch((err) => {
          console.error('[Nav] controller.goto failed:', err);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1446',message:'controller.goto error',data:{stepId,error:err.message,stack:err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        });
      } else {
        console.error('[Nav] No controller available!');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor.js:1446',message:'No controller available',data:{stepId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
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
  console.log('[Camera Setup] Starting setupCameraControls');
  console.log('[Camera Setup] controller:', controller);
  console.log('[Camera Setup] cameraHandle:', cameraHandle);
  console.log('[Camera Setup] cameraHandle type:', typeof cameraHandle);
  
  if (!controller) {
    console.error('[Camera Setup] ERROR: No controller provided');
    return;
  }
  
  if (!cameraHandle) {
    console.error('[Camera Setup] ERROR: No cameraHandle available');
    console.error('[Camera Setup] This means camera controls will not work!');
    return;
  }

  // Remove existing event listeners by cloning and replacing buttons
  // This prevents duplicate listeners when renderDiagram is called multiple times
  console.log('[Camera Setup] Searching for button elements...');
  console.log('[Camera Setup] document.getElementById("zoom-in"):', document.getElementById("zoom-in"));
  console.log('[Camera Setup] document.getElementById("zoom-out"):', document.getElementById("zoom-out"));
  console.log('[Camera Setup] document.getElementById("reset"):', document.getElementById("reset"));
  console.log('[Camera Setup] document.getElementById("fit-all"):', document.getElementById("fit-all"));
  
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const resetBtn = document.getElementById("reset");
  const fitAllBtn = document.getElementById("fit-all");

  console.log('[Camera Setup] Button elements found:', {
    zoomIn: !!zoomInBtn,
    zoomOut: !!zoomOutBtn,
    reset: !!resetBtn,
    fitAll: !!fitAllBtn
  });
  
  if (zoomInBtn) {
    console.log('[Camera Setup] zoomInBtn details:', {
      id: zoomInBtn.id,
      tagName: zoomInBtn.tagName,
      disabled: zoomInBtn.disabled,
      className: zoomInBtn.className,
      parentNode: zoomInBtn.parentNode?.tagName,
      onclick: zoomInBtn.onclick,
      hasEventListeners: zoomInBtn.onclick !== null
    });
  }

  // Clone buttons to remove all event listeners
  if (zoomInBtn) {
    console.log('[Camera Setup] Setting up zoom-in button');
    const newZoomIn = zoomInBtn.cloneNode(true);
    const parent = zoomInBtn.parentNode;
    console.log('[Camera Setup] zoomInBtn parent:', parent);
    if (parent) {
      parent.replaceChild(newZoomIn, zoomInBtn);
      console.log('[Camera Setup] zoomInBtn replaced with clone');
    }
    newZoomIn.addEventListener("click", (e) => {
      console.log('[Camera] ========== ZOOM IN CLICKED ==========');
      console.log('[Camera] Event:', e);
      console.log('[Camera] cameraHandle:', cameraHandle);
      console.log('[Camera] cameraHandle.zoom:', cameraHandle?.zoom);
      console.log('[Camera] Calling cameraHandle.zoom(1.2)...');
      try {
        const result = cameraHandle.zoom?.(1.2);
        console.log('[Camera] zoom(1.2) returned:', result);
      } catch (error) {
        console.error('[Camera] ERROR calling zoom(1.2):', error);
      }
    });
    console.log('[Camera Setup] zoom-in event listener attached');
  } else {
    console.error('[Camera Setup] zoom-in button NOT FOUND');
  }

  if (zoomOutBtn) {
    console.log('[Camera Setup] Setting up zoom-out button');
    const newZoomOut = zoomOutBtn.cloneNode(true);
    const parent = zoomOutBtn.parentNode;
    console.log('[Camera Setup] zoomOutBtn parent:', parent);
    if (parent) {
      parent.replaceChild(newZoomOut, zoomOutBtn);
      console.log('[Camera Setup] zoomOutBtn replaced with clone');
    }
    newZoomOut.addEventListener("click", (e) => {
      console.log('[Camera] ========== ZOOM OUT CLICKED ==========');
      console.log('[Camera] Event:', e);
      console.log('[Camera] cameraHandle:', cameraHandle);
      console.log('[Camera] cameraHandle.zoom:', cameraHandle?.zoom);
      console.log('[Camera] Calling cameraHandle.zoom(0.8)...');
      try {
        const result = cameraHandle.zoom?.(0.8);
        console.log('[Camera] zoom(0.8) returned:', result);
      } catch (error) {
        console.error('[Camera] ERROR calling zoom(0.8):', error);
      }
    });
    console.log('[Camera Setup] zoom-out event listener attached');
  } else {
    console.error('[Camera Setup] zoom-out button NOT FOUND');
  }

  if (resetBtn) {
    console.log('[Camera Setup] Setting up reset button');
    const newReset = resetBtn.cloneNode(true);
    const parent = resetBtn.parentNode;
    console.log('[Camera Setup] resetBtn parent:', parent);
    if (parent) {
      parent.replaceChild(newReset, resetBtn);
      console.log('[Camera Setup] resetBtn replaced with clone');
    }
    newReset.addEventListener("click", (e) => {
      console.log('[Camera] ========== RESET CLICKED ==========');
      console.log('[Camera] Event:', e);
      console.log('[Camera] cameraHandle:', cameraHandle);
      console.log('[Camera] cameraHandle.reset:', cameraHandle?.reset);
      console.log('[Camera] Calling cameraHandle.reset()...');
      try {
        const result = cameraHandle.reset();
        console.log('[Camera] reset() returned:', result);
      } catch (error) {
        console.error('[Camera] ERROR calling reset():', error);
      }
    });
    console.log('[Camera Setup] reset event listener attached');
  } else {
    console.error('[Camera Setup] reset button NOT FOUND');
  }

  if (fitAllBtn) {
    console.log('[Camera Setup] Setting up fit-all button');
    const newFitAll = fitAllBtn.cloneNode(true);
    const parent = fitAllBtn.parentNode;
    console.log('[Camera Setup] fitAllBtn parent:', parent);
    if (parent) {
      parent.replaceChild(newFitAll, fitAllBtn);
      console.log('[Camera Setup] fitAllBtn replaced with clone');
    }
    newFitAll.addEventListener("click", (e) => {
      console.log('[Camera] ========== FIT ALL CLICKED ==========');
      console.log('[Camera] Event:', e);
      console.log('[Camera] cameraHandle:', cameraHandle);
      console.log('[Camera] cameraHandle.fitAll:', cameraHandle?.fitAll);
      console.log('[Camera] Calling cameraHandle.fitAll()...');
      try {
        const result = cameraHandle.fitAll?.();
        console.log('[Camera] fitAll() returned:', result);
      } catch (error) {
        console.error('[Camera] ERROR calling fitAll():', error);
      }
    });
    console.log('[Camera Setup] fit-all event listener attached');
  } else {
    console.error('[Camera Setup] fit-all button NOT FOUND');
  }
  
  console.log('[Camera Setup] setupCameraControls completed');
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
  if (!errorEl) {
    console.error(`[Error] Element ${elementId} not found`);
    return;
  }
  errorEl.textContent = message;
  errorEl.classList.add("show");
}

function clearError(elementId) {
  const errorEl = document.getElementById(elementId);
  if (!errorEl) {
    return;
  }
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
