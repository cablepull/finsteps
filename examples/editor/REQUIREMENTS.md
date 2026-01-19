# Finsteps Editor Requirements

This document describes all requirements for the Finsteps Mermaid Live Editor example.

## Overview

The Finsteps Editor is a live editing environment that allows users to create Mermaid diagrams and define interactive presentations using the MPD (Mermaid Presentation DSL). It provides real-time validation, syntax highlighting, and a live preview with full presentation controls.

```mermaid
flowchart TD
    A[User Input] --> B[Mermaid Text Input]
    A --> C[DSL Text Input]
    B --> D[Validate Mermaid Syntax]
    C --> E[Validate DSL Syntax]
    D --> F{Both Valid?}
    E --> F
    F -->|Yes| G[Render Diagram]
    F -->|No| H[Display Errors]
    G --> I[Create Controller]
    I --> J[Update State]
    J --> K[Enable Controls]
    K --> L[Live Preview with Controls]
    L --> M[Navigation Controls]
    L --> N[Camera Controls]
    L --> O[Available Targets Panel]
```

## Requirements

### REQ-001: Layout and UI Structure

The editor MUST have a two-panel layout with a collapsible left sidebar for inputs and a main preview area on the right.

```mermaid
graph LR
    A[Left Sidebar] --> B[Mermaid Input Section]
    A --> C[DSL Input Section]
    A --> D[Collapse Toggle Button]
    E[Main Preview Area] --> F[Diagram Render Zone]
    E --> G[Available Targets Panel]
    E --> H[Navigation Sidebar]
    style A fill:#1e293b
    style E fill:#0f172a
```

**Requirements:**
- Left sidebar MUST be collapsible with animation (collapsing left-to-right)
- Sidebar MUST contain two input sections:
  - Mermaid Diagram Input Section
  - Presentation Framework Instructions (DSL) Input Section
- When collapsed, sidebar SHOULD show only toggle button
- Preview area MUST expand to fill available space when sidebar is collapsed
- All panels MUST support scrolling when content overflows
- Sidebar collapse MUST animate horizontally (left-to-right direction)

### REQ-002: Mermaid Diagram Input

The editor MUST provide a textarea for entering Mermaid diagram syntax.

```mermaid
sequenceDiagram
    User->>Editor: Enters Mermaid Text
    Editor->>Validator: Validate Syntax
    Validator-->>Editor: Validation Result
    alt Valid Syntax
        Editor->>Renderer: Render Diagram
        Renderer-->>Editor: SVG Diagram
    else Invalid Syntax
        Editor->>User: Display Error Message
    end
```

**Requirements:**
- Textarea MUST have syntax validation on input (debounced 300ms)
- Errors MUST be displayed with line numbers when validation fails
- Textarea MUST have a visual error state (CSS class `has-error`)
- Default example diagram MUST be provided on page load
- Validation MUST use Mermaid's `mermaid.parse()` function


### REQ-003: MPD DSL Input (Simplified)

The DSL Input Section MUST provide a single MPD editor for presentation framework instructions.

```mermaid
stateDiagram-v2
    [*] --> MPD: Editor Loaded
    MPD --> Validate: Content Changed
    Validate --> Valid: No Errors
    Validate --> Invalid: Has Errors
    Valid --> Render: Trigger Render
    Invalid --> Display: Show Errors
```

**Requirements:**
- Single MPD editor using CodeMirror
- Real-time syntax validation with error highlighting
- "Generate Presentation" button to auto-create presentation from diagram
- Help text explaining MPD editing
- Error messages displayed below editor

### REQ-007: Navigation Controls

The editor MUST provide navigation buttons for all defined steps.

```mermaid
flowchart LR
    A[DSL Parsed] --> B[Extract Steps]
    B --> C[Create Navigation Buttons]
    C --> D[User Clicks Button]
    D --> E[Controller.goto(stepId)]
    E --> F[Update Active Button]
    F --> G[Display Step]
```

**Requirements:**
- Navigation buttons MUST be generated from DSL steps
- Each button MUST be labeled with step name or id
- Clicking a button MUST navigate to that step
- Active step button MUST be visually highlighted
- Navigation MUST update when DSL is modified

### REQ-005: Camera Controls

The editor MUST provide camera control buttons for manual diagram navigation.

```mermaid
stateDiagram-v2
    [*] --> ZoomIn: Click Zoom In
    [*] --> ZoomOut: Click Zoom Out
    [*] --> Reset: Click Reset
    [*] --> FitAll: Click Fit All
    ZoomIn --> Diagram: camera.zoom(1.2)
    ZoomOut --> Diagram: camera.zoom(0.8)
    Reset --> Diagram: camera.reset()
    FitAll --> Diagram: camera.fitAll()
```

**Requirements:**
- "Zoom In" button MUST call `camera.zoom(1.2)`
- "Zoom Out" button MUST call `camera.zoom(0.8)`
- "Reset" button MUST call `camera.reset()`
- "Fit All" button MUST call `camera.fitAll()`
- Controls MUST be disabled when no diagram is rendered

### REQ-006: Presentation Playback Controls

The editor MUST provide playback controls for stepping through the presentation.

```mermaid
stateDiagram-v2
    [*] --> Stopped
    Stopped --> Playing: Click Play
    Playing --> Stopped: Click Pause
    Playing --> Playing: Auto-advance (3s)
    Playing --> Stopped: Reached End
    Stopped --> Previous: Click Previous
    Stopped --> Next: Click Next
    Previous --> Stopped: controller.goto(prevStep)
    Next --> Stopped: controller.goto(nextStep)
```

**Requirements:**
- "Play" button MUST auto-advance through steps every 3 seconds
- "Pause" button MUST stop auto-advancement
- "Previous" button MUST navigate to previous step
- "Next" button MUST navigate to next step
- Step indicator MUST show "Step X / Y"
- Playback MUST stop when reaching last step
- Manual navigation MUST stop playback

### REQ-007: DSL Generation

The editor MUST be able to generate a starter DSL from a rendered diagram.

```mermaid
flowchart TD
    A[User Clicks Generate] --> B[Extract data-id Elements]
    B --> C[Create Overview Step]
    C --> D[Create Step for Each Target]
    D --> E[Create Keyboard Bindings]
    E --> F[Convert to MPD]
    F --> G[Update MPD Editor]
    G --> H[Render Diagram]
```

**Requirements:**
- Generation MUST create an "overview" step with `camera.reset()`
- Generation MUST create a step for each targetable element
- Each target step MUST include:
  - `camera.fit()` with padding 60
  - `style.highlight()`
  - `overlay.bubble()` with descriptive text
- Generation MUST create keyboard bindings:
  - ArrowRight → `nav.next`
  - ArrowLeft → `nav.prev`
- Generation MUST create click bindings for navigation buttons
- Generated DSL MUST be converted to MPD format and inserted into editor

### REQ-005: Export Functionality

The editor MUST allow exporting the current Mermaid diagram and DSL.

```mermaid
flowchart LR
    A[User Clicks Export] --> B[Gather Mermaid Text]
    B --> C[Gather MPD Text]
    C --> D[Parse DSL to AST]
    D --> E[Create JSON Export]
    E --> F[Download as File]
```

**Requirements:**
- Export MUST include:
  - Mermaid diagram text
  - MPD DSL text
  - Parsed DSL AST (JSON format)
  - Version number
  - Export timestamp
- File MUST be downloaded as JSON with filename: `finsteps-presentation-{timestamp}.json`

### REQ-009: Import Functionality

The editor MUST allow importing previously exported presentations.

```mermaid
flowchart LR
    A[User Selects File] --> B[Read JSON File]
    B --> C{Has MPD?}
    C -->|Yes| D[Load MPD into Editor]
    C -->|No| E[Convert DSL AST to MPD]
    D --> F[Load Mermaid Text]
    E --> F
    F --> G[Render Diagram]
```

**Requirements:**
- Import MUST support files exported from REQ-005
- Import MUST load Mermaid text into Mermaid input
- Import MUST load MPD text into MPD editor (if available)
- Import MUST fallback to converting DSL AST to MPD if MPD not present
- Import MUST trigger diagram rendering after successful load
- Import errors MUST be displayed to user

### REQ-010: Error Handling and Display

The editor MUST display validation and runtime errors clearly to users.

```mermaid
flowchart TD
    A[Error Occurs] --> B{Error Type?}
    B -->|Mermaid Syntax| C[Display in Mermaid Error Panel]
    B -->|MPD Syntax| D[Format Diagnostics]
    B -->|JSON Syntax| E[Display in DSL Error Panel]
    B -->|Render Error| F[Display in Mermaid Error Panel]
    C --> G[Highlight Error Line]
    D --> G
    E --> G
    F --> H[Show Error Message]
```

**Requirements:**
- Errors MUST be displayed in dedicated error panels
- Error panels MUST be collapsible/expandable
- MPD errors MUST use `formatDiagnostics()` for consistent formatting
- Error messages MUST include:
  - Error message text
  - Line number (when available)
  - Column number (when available)
  - Error code (for MPD diagnostics)
- Editor lines with errors MUST be visually highlighted
- Errors MUST clear when fixed

### REQ-012: Drag-to-Pan

The diagram MUST support drag-to-pan functionality by default.

```mermaid
sequenceDiagram
    participant User
    participant Diagram
    participant Camera
    
    User->>Diagram: Mouse Down
    Diagram->>Diagram: Store Start Position
    User->>Diagram: Mouse Move
    Diagram->>Diagram: Calculate Delta
    Diagram->>Camera: Update viewBox
    Camera->>Diagram: Pan Applied
    User->>Diagram: Mouse Up
```

**Requirements:**
- Drag-to-pan MUST be enabled by default on diagram SVG
- Panning MUST use mouse/touch drag gestures
- Panning MUST update SVG `viewBox` dynamically
- Panning direction MUST match drag direction (right drag = right pan)

### REQ-016: Sidebar Collapse

The left sidebar MUST be collapsible with smooth horizontal animation (collapsing left-to-right).

```mermaid
stateDiagram-v2
    [*] --> Expanded: Sidebar Expanded (40% width, left side)
    Expanded --> Collapsed: Click Toggle
    Collapsed --> Expanded: Click Toggle
    Expanded --> Collapsed: Animation (0.3s, left-to-right)
    Collapsed --> Expanded: Animation (0.3s, right-to-left)
```

**Requirements:**
- Toggle button MUST be visible in collapsed state
- Collapse animation MUST be smooth (0.3s transition) and horizontal
- Collapse MUST move from left to right (sidebar shrinks leftward)
- Icon MUST rotate to indicate state
- When collapsed, sidebar content MUST be hidden
- Preview area MUST expand to fill space when collapsed
- Toggle button MUST remain accessible when collapsed

### REQ-013: Real-time Updates

The diagram MUST update in real-time as users edit Mermaid or DSL text.

```mermaid
flowchart TD
    A[User Types] --> B[Input Event]
    B --> C[Debounce Timer]
    C --> D{Valid Input?}
    D -->|Yes| E[Clear Errors]
    D -->|No| F[Show Errors]
    E --> G[Trigger Render]
    F --> H[Block Render]
    G --> I[Update Diagram]
```

**Requirements:**
- Updates MUST be debounced to prevent excessive rendering
- Mermaid updates: 300ms debounce for validation, 500ms for rendering
- MPD updates: 300ms debounce for validation, 500ms for rendering
- Only valid inputs MUST trigger diagram rendering
- Invalid inputs MUST display errors but not block editing

### REQ-014: Initialization

The editor MUST initialize all components on page load.

```mermaid
sequenceDiagram
    participant Browser
    participant Editor
    participant Mermaid
    participant CodeMirror
    
    Browser->>Editor: Page Load
    Editor->>Mermaid: Initialize
    Editor->>CodeMirror: Init MPD Editor
    Editor->>Editor: Setup Event Listeners
    Editor->>Editor: Auto-generate Initial Presentation
    Editor->>Editor: Render Diagram
```

**Requirements:**
- Mermaid MUST be initialized with dark theme
- CodeMirror editors MUST be initialized with proper configuration
- Event listeners MUST be attached to all interactive elements
- Initial presentation MUST be auto-generated if Mermaid text exists
- Diagram MUST render after initialization completes

### REQ-015: Step Change Event Handling

The editor MUST update UI state when presentation steps change.

```mermaid
flowchart LR
    A[Controller] -->|stepchange event| B[Editor Listener]
    B --> C[Update Active Nav Button]
    B --> D[Update Step Indicator]
    B --> E[Update Current Step Index]
```

**Requirements:**
- Editor MUST listen to `controller.on("stepchange")` events
- Active navigation button MUST update on step change
- Step indicator display MUST update on step change
- Current step index MUST be tracked for playback controls

### REQ-016: Reactive State Tracking

The editor MUST track application state reactively and update the UI accordingly.

```mermaid
stateDiagram-v2
    [*] --> Idle: Initial State
    Idle --> Editing: User Edits Input
    Editing --> Validating: Debounce Timer
    Validating --> Valid: Both Inputs Valid
    Validating --> Invalid: Input Errors
    Valid --> Rendering: Render Diagram
    Rendering --> Ready: Controller Created
    Ready --> Presentation: Controls Enabled
    Invalid --> Idle: Display Errors
    Presentation --> Ready: Step Change
    Ready --> Presentation: User Interaction
```

**Requirements:**
- Editor MUST maintain a centralized state object tracking:
  - Mermaid text content and validity
  - DSL text content and validity
  - Current diagram controller instance
  - Current step index
  - Rendering status (idle, rendering, ready, error)
  - Available targets from diagram
- State changes MUST trigger UI updates reactively
- All UI components MUST reflect current state accurately
- State MUST be updated before triggering UI updates
- Invalid state MUST prevent presentation controls from being enabled
- Valid state MUST enable presentation controls automatically

**Implementation:**
- State object: [`examples/editor/editor.js:27-54`](https://github.com/cablepull/finsteps/blob/4b5997cf80c5128503a412de6aace2d597b39c48/examples/editor/editor.js#L27-L54)
- State update function: [`examples/editor/editor.js:74-95`](https://github.com/cablepull/finsteps/blob/4b5997cf80c5128503a412de6aace2d597b39c48/examples/editor/editor.js#L74-L95)
- State tracking in render: [`examples/editor/editor.js:1042-1050`](https://github.com/cablepull/finsteps/blob/4b5997cf80c5128503a412de6aace2d597b39c48/examples/editor/editor.js#L1042-L1050)


### REQ-017: Control Enablement Based on State

The editor MUST enable/disable controls based on the current application state.

```mermaid
flowchart TD
    A[State Change] --> B{State Valid?}
    B -->|Yes| C[Enable Presentation Controls]
    B -->|No| D[Disable Presentation Controls]
    C --> E[Navigation Buttons Enabled]
    C --> F[Playback Controls Enabled]
    C --> G[Camera Controls Enabled]
    D --> H[Controls Disabled with Visual Feedback]
```

**Requirements:**
- Navigation buttons MUST be enabled only when:
  - Diagram is successfully rendered
  - Controller instance exists
  - DSL contains valid steps
- Playback controls MUST be enabled only when:
  - Navigation buttons are enabled
  - At least one step is defined
- Camera controls MUST be enabled only when:
  - Diagram is successfully rendered
  - Controller instance exists
- Export button MUST be enabled when:
  - At least Mermaid text or DSL text is present
- Import button MUST always be enabled
- Disabled controls MUST provide visual feedback (grayed out, cursor not-allowed)
- Control state MUST update immediately when state changes

**Implementation:**
- Control enablement function: [`examples/editor/editor.js:100-157`](https://github.com/cablepull/finsteps/blob/4b5997cf80c5128503a412de6aace2d597b39c48/examples/editor/editor.js#L100-L157)
- Control state initialization: [`examples/editor/editor.js:254`](https://github.com/cablepull/finsteps/blob/4b5997cf80c5128503a412de6aace2d597b39c48/examples/editor/editor.js#L254)
- Navigation button updates trigger control state: [`examples/editor/editor.js:1244`](https://github.com/cablepull/finsteps/blob/4b5997cf80c5128503a412de6aace2d597b39c48/examples/editor/editor.js#L1244)


## Implementation Notes

- The editor uses CodeMirror 5 for syntax highlighting
- Mermaid v10 is used for diagram rendering
- The Finsteps framework provides `presentMermaid`, `parseMPD`, and `formatDiagnostics`
- All async operations MUST handle errors gracefully
- The editor MUST work in modern browsers (ES6+ support required)
