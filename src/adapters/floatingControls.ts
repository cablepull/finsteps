import { Controller, ControllerState, CameraHandle, ControlsHandle } from "../types.js";
// Note: Lucide icons can be integrated later using lucide-static or SVG path extraction
// For now, using Unicode symbols for framework-agnostic compatibility

// Re-export ControlsHandle for convenience
export type { ControlsHandle };

export interface FloatingControlsOptions {
  controller: Controller;
  camera?: CameraHandle;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "bottom-center";
  showPlayPause?: boolean;
  showPrevNext?: boolean;
  showZoomControls?: boolean;
  showStepIndicator?: boolean;
  autoHide?: boolean;
  offset?: { x: number; y: number };
}

// Icon creation helper - can be enhanced with Lucide icons later
// For now, using Unicode symbols in createIconButton

function createIconButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "finsteps-control-btn";
  button.setAttribute("aria-label", title);
  button.title = title;
  
  // Use Unicode symbols as fallback (can be replaced with Lucide SVG paths)
  const iconMap: Record<string, string> = {
    play: "▶",
    pause: "⏸",
    prev: "◀",
    next: "▶",
    zoomIn: "+",
    zoomOut: "−",
    fitAll: "⊞"
  };
  
  const iconText = iconMap[icon] || icon;
  button.innerHTML = `<span class="finsteps-control-icon">${iconText}</span>`;
  
  button.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: rgba(30, 41, 59, 0.9);
    color: #e2e8f0;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 16px;
    backdrop-filter: blur(8px);
  `;
  
  button.addEventListener("mouseenter", () => {
    button.style.background = "rgba(51, 65, 85, 0.95)";
    button.style.transform = "scale(1.1)";
  });
  
  button.addEventListener("mouseleave", () => {
    button.style.background = "rgba(30, 41, 59, 0.9)";
    button.style.transform = "scale(1)";
  });
  
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  
  return button;
}

export function createFloatingControls(options: FloatingControlsOptions): ControlsHandle {
  const {
    controller,
    camera,
    position = "bottom-right",
    showPlayPause = true,
    showPrevNext = true,
    showZoomControls = true,
    showStepIndicator = true,
    autoHide = false,
    offset = { x: 20, y: 20 }
  } = options;

  const container = document.createElement("div");
  container.className = "finsteps-floating-controls";
  container.style.cssText = `
    position: fixed;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  `;

  // Position the container
  const positionStyles: Record<string, Partial<CSSStyleDeclaration>> = {
    "bottom-right": { bottom: `${offset.y}px`, right: `${offset.x}px` },
    "bottom-left": { bottom: `${offset.y}px`, left: `${offset.x}px` },
    "top-right": { top: `${offset.y}px`, right: `${offset.x}px` },
    "top-left": { top: `${offset.y}px`, left: `${offset.x}px` },
    "bottom-center": { bottom: `${offset.y}px`, left: "50%", transform: "translateX(-50%)" }
  };

  Object.assign(container.style, positionStyles[position] || positionStyles["bottom-right"]);

  // Navigation group
  const navGroup = document.createElement("div");
  navGroup.className = "finsteps-control-group";
  navGroup.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;

  let isPlaying = false;
  let playbackInterval: ReturnType<typeof setInterval> | null = null;

  const stopPlayback = () => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
    }
    isPlaying = false;
    updatePlayPauseButton();
  };

  const startPlayback = () => {
    const steps = controller.getSteps?.() || [];
    if (steps.length === 0) return;

    isPlaying = true;
    updatePlayPauseButton();

    playbackInterval = setInterval(() => {
      const state = controller.getState();
      if (state.stepIndex < state.stepCount - 1) {
        controller.next().catch(() => stopPlayback());
      } else {
        stopPlayback();
      }
    }, 3000);
  };

  const playPauseBtn = showPlayPause ? createIconButton("play", "Play/Pause", () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }) : null;

  const updatePlayPauseButton = () => {
    if (!playPauseBtn) return;
    const iconSpan = playPauseBtn.querySelector(".finsteps-control-icon");
    if (iconSpan) {
      iconSpan.textContent = isPlaying ? "⏸" : "▶";
    }
    playPauseBtn.title = isPlaying ? "Pause" : "Play";
  };

  const prevBtn = showPrevNext ? createIconButton("prev", "Previous Step", () => {
    stopPlayback();
    controller.prev().catch(() => {});
  }) : null;

  const nextBtn = showPrevNext ? createIconButton("next", "Next Step", () => {
    stopPlayback();
    controller.next().catch(() => {});
  }) : null;

  if (prevBtn) navGroup.appendChild(prevBtn);
  if (playPauseBtn) navGroup.appendChild(playPauseBtn);
  if (nextBtn) navGroup.appendChild(nextBtn);

  // Step indicator
  const stepIndicator = showStepIndicator ? document.createElement("div") : null;
  if (stepIndicator) {
    stepIndicator.className = "finsteps-step-indicator";
    stepIndicator.style.cssText = `
      padding: 6px 12px;
      background: rgba(30, 41, 59, 0.9);
      border-radius: 8px;
      color: #94a3b8;
      font-size: 12px;
      font-family: monospace;
      text-align: center;
      min-width: 80px;
    `;
    navGroup.appendChild(stepIndicator);
  }

  container.appendChild(navGroup);

  // Zoom group
  if (showZoomControls && camera) {
    const zoomGroup = document.createElement("div");
    zoomGroup.className = "finsteps-control-group";
    zoomGroup.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      border-top: 1px solid rgba(51, 65, 85, 0.5);
      padding-top: 8px;
    `;

    const zoomOutBtn = createIconButton("zoomOut", "Zoom Out", () => {
      if (camera.zoom) {
        camera.zoom(0.8);
      }
    });

    const zoomInBtn = createIconButton("zoomIn", "Zoom In", () => {
      if (camera.zoom) {
        camera.zoom(1.2);
      }
    });

    const fitAllBtn = createIconButton("fitAll", "Fit All", () => {
      if (camera.fitAll) {
        camera.fitAll();
      }
    });

    zoomGroup.appendChild(zoomOutBtn);
    zoomGroup.appendChild(zoomInBtn);
    zoomGroup.appendChild(fitAllBtn);
    container.appendChild(zoomGroup);
  }

  // Append to body
  document.body.appendChild(container);

  // Update state function
  const updateState = (state: ControllerState) => {
    if (stepIndicator) {
      stepIndicator.textContent = `Step ${state.stepIndex + 1} / ${state.stepCount}`;
    }

    // Update button states
    if (prevBtn) {
      prevBtn.disabled = state.stepIndex <= 0;
      prevBtn.style.opacity = state.stepIndex <= 0 ? "0.5" : "1";
      prevBtn.style.cursor = state.stepIndex <= 0 ? "not-allowed" : "pointer";
    }

    if (nextBtn) {
      nextBtn.disabled = state.stepIndex >= state.stepCount - 1;
      nextBtn.style.opacity = state.stepIndex >= state.stepCount - 1 ? "0.5" : "1";
      nextBtn.style.cursor = state.stepIndex >= state.stepCount - 1 ? "not-allowed" : "pointer";
    }

    // Stop playback if we've reached the end
    if (isPlaying && state.stepIndex >= state.stepCount - 1) {
      stopPlayback();
    }
  };

  // Listen to controller state changes
  const unsubscribe = controller.on("stepchange", (payload: unknown) => {
    if (payload && typeof payload === "object" && "state" in payload) {
      updateState((payload as { state: ControllerState }).state);
    } else if (payload && typeof payload === "object" && "stepIndex" in payload) {
      updateState(payload as ControllerState);
    }
  });

  // Initial state update
  updateState(controller.getState());

  // Auto-hide functionality
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  if (autoHide) {
    const resetHideTimeout = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      container.style.opacity = "1";
      hideTimeout = setTimeout(() => {
        container.style.opacity = "0.3";
      }, 3000);
    };

    container.addEventListener("mouseenter", () => {
      container.style.opacity = "1";
      if (hideTimeout) clearTimeout(hideTimeout);
    });

    container.addEventListener("mouseleave", resetHideTimeout);
    resetHideTimeout();
  }

  return {
    show() {
      container.style.display = "flex";
    },
    hide() {
      container.style.display = "none";
    },
    updateState,
    destroy() {
      stopPlayback();
      unsubscribe();
      if (hideTimeout) clearTimeout(hideTimeout);
      container.remove();
    }
  };
}
