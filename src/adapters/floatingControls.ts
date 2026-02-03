import { Controller, ControllerState, CameraHandle, ControlsHandle } from "../types.js";
// Note: Lucide icons can be integrated later using lucide-static or SVG path extraction
// For now, using Unicode symbols for framework-agnostic compatibility

// Re-export ControlsHandle for convenience
export type { ControlsHandle };

// Size presets
export const SIZE_PRESETS = {
  compact: { button: 28, fontSize: 12, gap: 4, padding: 6, borderRadius: 6 },
  normal:  { button: 40, fontSize: 16, gap: 8, padding: 12, borderRadius: 50 },
  large:   { button: 52, fontSize: 20, gap: 12, padding: 16, borderRadius: 50 }
} as const;

export type SizePreset = keyof typeof SIZE_PRESETS;

// Theme presets
export const THEME_PRESETS = {
  dark: {
    containerBg: "rgba(15, 23, 42, 0.85)",
    buttonBg: "rgba(30, 41, 59, 0.9)",
    buttonHoverBg: "rgba(51, 65, 85, 0.95)",
    buttonColor: "#e2e8f0",
    indicatorColor: "#94a3b8",
    borderColor: "rgba(51, 65, 85, 0.5)"
  },
  light: {
    containerBg: "rgba(255, 255, 255, 0.9)",
    buttonBg: "rgba(241, 245, 249, 0.95)",
    buttonHoverBg: "rgba(226, 232, 240, 1)",
    buttonColor: "#334155",
    indicatorColor: "#64748b",
    borderColor: "rgba(203, 213, 225, 0.5)"
  }
} as const;

export type ThemePreset = keyof typeof THEME_PRESETS | "auto";

function getEffectiveTheme(theme: ThemePreset): keyof typeof THEME_PRESETS {
  if (theme === "auto") {
    // Check for system preference
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  }
  return theme;
}

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
  // New options
  size?: SizePreset;
  theme?: ThemePreset;
  playbackSpeed?: number;
  showReset?: boolean;
  orientation?: "horizontal" | "vertical";
}

// Icon creation helper - can be enhanced with Lucide icons later
// For now, using Unicode symbols in createIconButton

interface ButtonStyleConfig {
  size: typeof SIZE_PRESETS[SizePreset];
  theme: typeof THEME_PRESETS[keyof typeof THEME_PRESETS];
}

function createIconButton(
  icon: string,
  title: string,
  onClick: () => void,
  config: ButtonStyleConfig
): HTMLButtonElement {
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
    fitAll: "⊞",
    reset: "↺"
  };

  const iconText = iconMap[icon] || icon;
  button.innerHTML = `<span class="finsteps-control-icon">${iconText}</span>`;

  const { size, theme } = config;

  button.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${size.button}px;
    height: ${size.button}px;
    border: none;
    border-radius: ${size.borderRadius}px;
    background: ${theme.buttonBg};
    color: ${theme.buttonColor};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: ${size.fontSize}px;
    backdrop-filter: blur(8px);
  `;

  button.addEventListener("mouseenter", () => {
    button.style.background = theme.buttonHoverBg;
    button.style.transform = "scale(1.1)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.background = theme.buttonBg;
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
    offset = { x: 20, y: 20 },
    size = "normal",
    theme = "dark",
    playbackSpeed = 3000,
    showReset = false,
    orientation = "vertical"
  } = options;

  const sizePreset = SIZE_PRESETS[size];
  const effectiveTheme = getEffectiveTheme(theme);
  const themePreset = THEME_PRESETS[effectiveTheme];
  const styleConfig: ButtonStyleConfig = { size: sizePreset, theme: themePreset };
  const isHorizontal = orientation === "horizontal";

  const container = document.createElement("div");
  container.className = "finsteps-floating-controls";
  container.style.cssText = `
    position: fixed;
    z-index: 10000;
    display: flex;
    flex-direction: ${isHorizontal ? "row" : "column"};
    gap: ${sizePreset.gap}px;
    padding: ${sizePreset.padding}px;
    background: ${themePreset.containerBg};
    backdrop-filter: blur(12px);
    border-radius: ${size === "compact" ? "8px" : "16px"};
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
    gap: ${sizePreset.gap}px;
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
    }, playbackSpeed);
  };

  const playPauseBtn = showPlayPause ? createIconButton("play", "Play/Pause", () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, styleConfig) : null;

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
  }, styleConfig) : null;

  const nextBtn = showPrevNext ? createIconButton("next", "Next Step", () => {
    stopPlayback();
    controller.next().catch(() => {});
  }, styleConfig) : null;

  const resetBtn = showReset ? createIconButton("reset", "Reset", () => {
    stopPlayback();
    controller.reset().catch(() => {});
  }, styleConfig) : null;

  if (prevBtn) navGroup.appendChild(prevBtn);
  if (playPauseBtn) navGroup.appendChild(playPauseBtn);
  if (nextBtn) navGroup.appendChild(nextBtn);
  if (resetBtn) navGroup.appendChild(resetBtn);

  // Step indicator
  const stepIndicator = showStepIndicator ? document.createElement("div") : null;
  if (stepIndicator) {
    stepIndicator.className = "finsteps-step-indicator";
    const indicatorFontSize = size === "compact" ? 10 : (size === "large" ? 14 : 12);
    const indicatorPadding = size === "compact" ? "4px 8px" : "6px 12px";
    const indicatorMinWidth = size === "compact" ? "40px" : "80px";
    stepIndicator.style.cssText = `
      padding: ${indicatorPadding};
      background: ${themePreset.buttonBg};
      border-radius: ${size === "compact" ? "4px" : "8px"};
      color: ${themePreset.indicatorColor};
      font-size: ${indicatorFontSize}px;
      font-family: monospace;
      text-align: center;
      min-width: ${indicatorMinWidth};
    `;
    navGroup.appendChild(stepIndicator);
  }

  container.appendChild(navGroup);

  // Zoom group
  if (showZoomControls && camera) {
    const zoomGroup = document.createElement("div");
    zoomGroup.className = "finsteps-control-group";
    const borderStyle = isHorizontal
      ? `border-left: 1px solid ${themePreset.borderColor}; padding-left: ${sizePreset.gap}px;`
      : `border-top: 1px solid ${themePreset.borderColor}; padding-top: ${sizePreset.gap}px;`;
    zoomGroup.style.cssText = `
      display: flex;
      gap: ${sizePreset.gap}px;
      align-items: center;
      ${borderStyle}
    `;

    const zoomOutBtn = createIconButton("zoomOut", "Zoom Out", () => {
      if (camera.zoom) {
        camera.zoom(0.8);
      }
    }, styleConfig);

    const zoomInBtn = createIconButton("zoomIn", "Zoom In", () => {
      if (camera.zoom) {
        camera.zoom(1.2);
      }
    }, styleConfig);

    const fitAllBtn = createIconButton("fitAll", "Fit All", () => {
      if (camera.fitAll) {
        camera.fitAll();
      }
    }, styleConfig);

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
      // Compact size uses shorter format "2/5", normal/large uses "Step 2 / 5"
      stepIndicator.textContent = size === "compact"
        ? `${state.stepIndex + 1}/${state.stepCount}`
        : `Step ${state.stepIndex + 1} / ${state.stepCount}`;
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
