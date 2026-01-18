// Visual DSL Builder Component
// This module provides a form-based UI for building the PresentationAst DSL

let visualState = {
  steps: []
};

// Initialize visual builder
export function initVisualBuilder(container, onUpdate) {
  const builderEl = container.querySelector("#visual-builder") || container;
  renderVisualBuilder(builderEl, onUpdate);
}

// Render the visual builder UI
function renderVisualBuilder(container, onUpdate) {
  if (!container.querySelector("#visual-builder")) {
    container.innerHTML = `
      <div id="visual-builder" class="visual-builder">
        <div class="builder-header">
          <h3>Steps</h3>
          <button class="btn-small" id="add-step-btn">+ Add Step</button>
        </div>
        <div id="steps-list" class="steps-list"></div>
      </div>
    `;
  }

  const builderEl = container.querySelector("#visual-builder") || container;
  const stepsList = builderEl.querySelector("#steps-list");
  if (stepsList) {
    renderStepsList(stepsList, onUpdate);
  }
  
  const addBtn = builderEl.querySelector("#add-step-btn");
  if (addBtn) {
    addBtn.onclick = null; // Remove old listeners
    addBtn.addEventListener("click", () => {
      addStep(onUpdate);
    });
  }
}

// Render the list of steps
function renderStepsList(container, onUpdate) {
  if (visualState.steps.length === 0) {
    container.innerHTML = '<p class="empty-state">No steps yet. Click "Add Step" to create one.</p>';
    return;
  }

  container.innerHTML = visualState.steps.map((step, index) => `
    <div class="step-item" data-step-index="${index}">
      <div class="step-header">
        <span class="step-title">Step ${index + 1}: ${step.id || "unnamed"}</span>
        <div>
          <button class="btn-small" onclick="window.visualBuilderMoveStep(${index}, -1)">↑</button>
          <button class="btn-small" onclick="window.visualBuilderMoveStep(${index}, 1)">↓</button>
          <button class="btn-small btn-danger" onclick="window.visualBuilderRemoveStep(${index})">×</button>
        </div>
      </div>
      <div class="step-form">
        <div class="form-group">
          <label>Step ID</label>
          <input type="text" class="step-id-input" data-index="${index}" value="${step.id || ""}" placeholder="e.g., overview">
        </div>
        <div class="form-group">
          <label>Step Name (optional)</label>
          <input type="text" class="step-name-input" data-index="${index}" value="${step.name || ""}" placeholder="e.g., Overview">
        </div>
        <div class="actions-section">
          <label>Actions</label>
          <div class="step-actions-list" data-step-index="${index}">
            ${renderActions(step.actions || [], index)}
          </div>
          <button class="btn-small" onclick="window.visualBuilderAddAction(${index})">+ Add Action</button>
        </div>
      </div>
    </div>
  `).join("");

  // Attach event listeners
  container.querySelectorAll(".step-id-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const index = parseInt(e.target.dataset.index);
      visualState.steps[index].id = e.target.value;
      onUpdate(visualStateToAST());
    });
  });

  container.querySelectorAll(".step-name-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const index = parseInt(e.target.dataset.index);
      visualState.steps[index].name = e.target.value;
      onUpdate(visualStateToAST());
    });
  });

  // Expose functions to window for onclick handlers
  window.visualBuilderMoveStep = (index, direction) => {
    if (index + direction < 0 || index + direction >= visualState.steps.length) return;
    const step = visualState.steps.splice(index, 1)[0];
    visualState.steps.splice(index + direction, 0, step);
    renderStepsList(container, onUpdate);
    onUpdate(visualStateToAST());
  };

  window.visualBuilderRemoveStep = (index) => {
    visualState.steps.splice(index, 1);
    renderStepsList(container, onUpdate);
    onUpdate(visualStateToAST());
  };

  window.visualBuilderAddAction = (stepIndex) => {
    if (!visualState.steps[stepIndex].actions) {
      visualState.steps[stepIndex].actions = [];
    }
    visualState.steps[stepIndex].actions.push({
      type: "camera.fit",
      payload: {}
    });
    renderStepsList(container, onUpdate);
    onUpdate(visualStateToAST());
  };

  window.visualBuilderRemoveAction = (stepIndex, actionIndex) => {
    visualState.steps[stepIndex].actions.splice(actionIndex, 1);
    renderStepsList(container, onUpdate);
    onUpdate(visualStateToAST());
  };

  window.visualBuilderUpdateAction = (stepIndex, actionIndex, field, value) => {
    const action = visualState.steps[stepIndex].actions[actionIndex];
    if (field === "type") {
      action.type = value;
      // Reset payload when type changes
      action.payload = {};
    } else if (field.startsWith("payload.")) {
      const payloadField = field.replace("payload.", "");
      if (!action.payload) action.payload = {};
      // Handle nested payload fields like "target.dataId"
      if (payloadField.includes(".")) {
        const parts = payloadField.split(".");
        let obj = action.payload;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!obj[parts[i]]) obj[parts[i]] = {};
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
      } else {
        action.payload[payloadField] = value;
      }
    }
    renderStepsList(container, onUpdate);
    onUpdate(visualStateToAST());
  };
}

// Render actions for a step
function renderActions(actions, stepIndex) {
  if (!actions || actions.length === 0) {
    return '<p class="empty-state">No actions yet. Click "Add Action" to create one.</p>';
  }

  return actions.map((action, actionIndex) => `
    <div class="action-item">
      <div class="action-header">
        <span>Action ${actionIndex + 1}</span>
        <button class="btn-small btn-danger" onclick="window.visualBuilderRemoveAction(${stepIndex}, ${actionIndex})">×</button>
      </div>
      <div class="form-group">
        <label>Action Type</label>
        <select class="action-type-select" data-step-index="${stepIndex}" data-action-index="${actionIndex}" onchange="window.visualBuilderUpdateAction(${stepIndex}, ${actionIndex}, 'type', this.value)">
          <option value="camera.fit" ${action.type === "camera.fit" ? "selected" : ""}>camera.fit</option>
          <option value="camera.reset" ${action.type === "camera.reset" ? "selected" : ""}>camera.reset</option>
          <option value="style.highlight" ${action.type === "style.highlight" ? "selected" : ""}>style.highlight</option>
          <option value="style.clear" ${action.type === "style.clear" ? "selected" : ""}>style.clear</option>
          <option value="overlay.bubble" ${action.type === "overlay.bubble" ? "selected" : ""}>overlay.bubble</option>
          <option value="overlay.hide" ${action.type === "overlay.hide" ? "selected" : ""}>overlay.hide</option>
        </select>
      </div>
      ${renderActionPayload(action, stepIndex, actionIndex)}
    </div>
  `).join("");
}

// Render action payload fields based on action type
function renderActionPayload(action, stepIndex, actionIndex) {
  const type = action.type;
  const payload = action.payload || {};

  switch (type) {
    case "camera.fit":
      return `
        <div class="form-group">
          <label>Target dataId</label>
          <input type="text" class="action-payload-input" 
            data-step-index="${stepIndex}" 
            data-action-index="${actionIndex}" 
            data-field="payload.target.dataId"
            value="${payload.target?.dataId || ""}"
            placeholder="e.g., node1"
            onchange="window.visualBuilderUpdateAction(${stepIndex}, ${actionIndex}, 'payload.target.dataId', this.value)">
        </div>
        <div class="form-group">
          <label>Padding</label>
          <input type="number" class="action-payload-input" 
            data-step-index="${stepIndex}" 
            data-action-index="${actionIndex}" 
            data-field="payload.padding"
            value="${payload.padding || 60}"
            onchange="window.visualBuilderUpdateAction(${stepIndex}, ${actionIndex}, 'payload.padding', parseInt(this.value))">
        </div>
        <div class="form-group">
          <label>Duration (ms)</label>
          <input type="number" class="action-payload-input" 
            data-step-index="${stepIndex}" 
            data-action-index="${actionIndex}" 
            data-field="payload.duration"
            value="${payload.duration || 500}"
            onchange="window.visualBuilderUpdateAction(${stepIndex}, ${actionIndex}, 'payload.duration', parseInt(this.value))">
        </div>
        <div class="form-group">
          <label>Easing</label>
          <select class="action-payload-input" 
            data-step-index="${stepIndex}" 
            data-action-index="${actionIndex}" 
            data-field="payload.easing"
            onchange="window.visualBuilderUpdateAction(${stepIndex}, ${actionIndex}, 'payload.easing', this.value)">
            <option value="linear" ${payload.easing === "linear" ? "selected" : ""}>linear</option>
            <option value="easeIn" ${payload.easing === "easeIn" ? "selected" : ""}>easeIn</option>
            <option value="easeOut" ${payload.easing === "easeOut" ? "selected" : ""}>easeOut</option>
            <option value="easeInOut" ${payload.easing === "easeInOut" ? "selected" : ""}>easeInOut</option>
            <option value="cubicOut" ${payload.easing === "cubicOut" ? "selected" : ""}>cubicOut</option>
          </select>
        </div>
      `;

    case "style.highlight":
    case "style.clear":
      return `
        <div class="form-group">
          <label>Target dataId</label>
          <input type="text" class="action-payload-input" 
            data-step-index="${stepIndex}" 
            data-action-index="${actionIndex}" 
            data-field="payload.target.dataId"
            value="${payload.target?.dataId || ""}"
            placeholder="e.g., node1"
            onchange="window.visualBuilderUpdateAction(${stepIndex}, ${actionIndex}, 'payload.target.dataId', this.value)">
        </div>
      `;

    case "overlay.bubble":
      return `
        <div class="form-group">
          <label>Target dataId</label>
          <input type="text" class="action-payload-input" 
            data-step-index="${stepIndex}" 
            data-action-index="${actionIndex}" 
            data-field="payload.target.dataId"
            value="${payload.target?.dataId || ""}"
            placeholder="e.g., node1"
            onchange="window.visualBuilderUpdateAction(${stepIndex}, ${actionIndex}, 'payload.target.dataId', this.value)">
        </div>
        <div class="form-group">
          <label>Bubble Text</label>
          <textarea class="action-payload-input" 
            data-step-index="${stepIndex}" 
            data-action-index="${actionIndex}" 
            data-field="payload.text"
            placeholder="Enter bubble text..."
            onchange="window.visualBuilderUpdateAction(${stepIndex}, ${actionIndex}, 'payload.text', this.value)">${payload.text || ""}</textarea>
        </div>
      `;

    default:
      return "";
  }
}

// Add a new step
function addStep(onUpdate) {
  visualState.steps.push({
    id: `step-${visualState.steps.length + 1}`,
    actions: []
  });
  const container = document.querySelector("#steps-list");
  renderStepsList(container, onUpdate);
  onUpdate(visualStateToAST());
}

// Convert visual state to AST format
function visualStateToAST() {
  return {
    steps: visualState.steps.map(step => ({
      id: step.id,
      name: step.name,
      actions: step.actions || []
    })),
    bindings: []
  };
}

// Load AST into visual state
export function loadASTIntoVisual(ast) {
  visualState = {
    steps: (ast.steps || []).map(step => ({
      id: step.id,
      name: step.name,
      actions: step.actions || []
    }))
  };
}

// Get current visual state as AST
export function getVisualStateAsAST() {
  return visualStateToAST();
}
