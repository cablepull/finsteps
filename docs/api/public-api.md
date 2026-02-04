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
- `options.controls`: custom ControlsHandle (or use `createFloatingControls()`).
- `options.actionHandlers`: additional action handlers.
- `options.errorPolicy`: default error policy (`haltOnError` or `continueOnError`).
- `options.hooks`: lifecycle hooks for editor integration:
  - `onInit(controller)`: Called after controller initialization
  - `onStepChange(state, step)`: Called when step changes
  - `onActionStart(action, step)`: Called when an action starts executing
  - `onActionComplete(action, result)`: Called when an action completes
  - `onError(error, context)`: Called when an action error occurs

## Controller

Methods:
- `next()`
- `prev()`
- `goto(stepIndex | stepId)`
- `reset()`
- `destroy()`
- `getState()` - Returns current controller state including stepIndex, stepId, stepCount, and optional errorState
- `setState(partial)` - Updates controller state (currently supports stepIndex and stepId)
- `getDeps()` - Returns read-only access to { diagram, camera, overlay } dependencies
- `getSteps()` - Returns a copy of the steps array
- `getCurrentStep()` - Returns the current step definition or null
- `getExecutionContext()` - Returns current execution context (currentAction, currentStep, previousStep)
- `updateAst(newAst, options?)` - Updates the controller's AST dynamically
  - `options.preserveState` - If true, tries to maintain current step after AST update
- `retry()` - Retries the last failed step/action
- `clearError()` - Clears error state

Events:
- `on("stepchange" | "actionerror" | "error" | "render" | "actionstart" | "actioncomplete" | "astchange", handler)`
  - `actionerror` is the preferred event name for action failures; `error` remains as a legacy alias.
  - `stepchange` payload includes: `{ state, previousState, step, previousStep }`
  - `actionerror` payload includes: `{ error, step, action, context }`
  - `actionstart` payload includes: `{ action, step, context }`
  - `actioncomplete` payload includes: `{ action, result: { success, error? }, step, context }`
  - `astchange` payload includes: `{ previousState, newState, previousSteps, newSteps }`

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

### ControlsHandle
- `show()` - Show the controls UI
- `hide()` - Hide the controls UI
- `updateState(state)` - Update controls based on controller state
- `destroy()` - Remove controls and clean up resources

Controls can be created using `createFloatingControls()`:

```javascript
import { createFloatingControls } from 'finsteps';

const controls = createFloatingControls({
  controller,        // Controller instance (required)
  camera,            // CameraHandle for zoom controls (optional)
  position: 'bottom-right',  // Position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center'
  showPlayPause: true,       // Show play/pause button (default: true)
  showPrevNext: true,       // Show prev/next buttons (default: true)
  showZoomControls: true,   // Show zoom controls (default: true)
  showStepIndicator: true,  // Show step counter (default: true)
  autoHide: false,          // Auto-hide after inactivity (default: false)
  offset: { x: 20, y: 20 }  // Offset from position edge (default: { x: 20, y: 20 })
});
```

## Semantic Versioning Discipline

- Backwards compatible additions: minor version.
- Breaking changes in public interfaces or behavior: major version.
- Bug fixes and non-breaking internal changes: patch version.

## AI Model Management (Optional)

Finsteps includes an optional AI model management system for multi-provider AI integration:

### Exports

```typescript
import { 
  modelManager,           // Singleton model manager instance
  type ModelConfig,       // Model configuration interface
  type ModelChatRequest,  // Chat request interface
  type ModelChatResponse, // Chat response interface
  type ModelManager,      // Model manager interface
  type ModelProvider      // Supported provider types
} from 'finsteps';
```

### ModelManager API

- `getAvailableModels(): ModelConfig[]` - Get all enabled models
- `getModel(id: string): ModelConfig | undefined` - Get specific model
- `addModel(model: ModelConfig): void` - Add new model configuration
- `removeModel(id: string): void` - Remove model
- `setDefaultModel(modelId: string): void` - Set default model
- `chat(request: ModelChatRequest): Promise<ModelChatResponse>` - Send chat request
- `detectOllamaModels(): Promise<string[]>` - Detect available Ollama models
- `pullOllamaModel(model: string): Promise<void>` - Pull model from Ollama

### Pre-Configured Models

- **GPT-4** (OpenAI) - ID: `gpt-4`
- **Claude 3 Sonnet** (Anthropic) - ID: `claude-3-sonnet`
- **Qwen3 Coder 30B** (Ollama) - ID: `qwen3-coder-30b` *(local)*

### Example Usage

```typescript
import { modelManager } from 'finsteps';

// List available models
const models = modelManager.getAvailableModels();

// Chat with local qwen3-coder:30b
const response = await modelManager.chat({
  model: 'qwen3-coder-30b',
  messages: [
    { role: 'user', content: 'Write MPD code for a flowchart' }
  ],
  options: { maxTokens: 500, temperature: 0.7 }
});

console.log(response.choices[0].message.content);
```

See [AI Model Documentation](../ai-models.md) for complete setup and provider configuration.

## Related Documentation

- [JSON Schema](../schema/api.json) - Machine-readable PresentationAst schema
- [MPD Grammar](../grammar.md) - Complete MPD grammar reference
- [MPD Parser Compatibility Contract](../mpd-parser/compatibility-contract.md) - ParseResult AST structure
- [AI Model Documentation](../ai-models.md) - Multi-provider AI integration guide
