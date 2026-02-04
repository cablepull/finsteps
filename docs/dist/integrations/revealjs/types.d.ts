import type { FloatingControlsOptions, SizePreset, ThemePreset } from "../../adapters/floatingControls.js";
import type { Controller } from "../../types.js";
/**
 * Reveal.js API types (minimal subset needed for the plugin)
 */
export interface RevealApi {
    on(event: string, callback: (event: RevealEvent) => void): void;
    off(event: string, callback: (event: RevealEvent) => void): void;
    getSlides(): HTMLElement[];
    getCurrentSlide(): HTMLElement;
    getIndices(): {
        h: number;
        v: number;
        f?: number;
    };
    getSlidePastCount(): number;
    isReady(): boolean;
}
export interface RevealEvent {
    currentSlide: HTMLElement;
    previousSlide?: HTMLElement;
    indexh: number;
    indexv: number;
    fragment?: HTMLElement;
}
export interface RevealPlugin {
    id: string;
    init(reveal: RevealApi): Promise<void> | void;
    destroy?(): void;
}
/**
 * Finsteps Reveal.js plugin options
 */
export interface FinstepsPluginOptions {
    /** Default position for floating controls */
    defaultControlsPosition?: FloatingControlsOptions["position"];
    /** Default size preset for controls */
    defaultControlsSize?: SizePreset;
    /** Default theme for controls */
    defaultControlsTheme?: ThemePreset;
    /** Whether to show controls (default: true) */
    showControls?: boolean;
    /** Sync diagram steps with Reveal.js fragments (default: false) */
    syncWithFragments?: boolean;
    /** Reset diagram to first step on slide change (default: true) */
    resetOnSlideChange?: boolean;
}
/**
 * Internal diagram instance tracking
 */
export interface DiagramInstance {
    element: HTMLElement;
    controller: Controller;
    controlsHandle?: import("../../types.js").ControlsHandle;
}
//# sourceMappingURL=types.d.ts.map