import { Controller, CameraHandle, ControlsHandle } from "../types.js";
export type { ControlsHandle };
export declare const SIZE_PRESETS: {
    readonly compact: {
        readonly button: 28;
        readonly fontSize: 12;
        readonly gap: 4;
        readonly padding: 6;
        readonly borderRadius: 6;
    };
    readonly normal: {
        readonly button: 40;
        readonly fontSize: 16;
        readonly gap: 8;
        readonly padding: 12;
        readonly borderRadius: 50;
    };
    readonly large: {
        readonly button: 52;
        readonly fontSize: 20;
        readonly gap: 12;
        readonly padding: 16;
        readonly borderRadius: 50;
    };
};
export type SizePreset = keyof typeof SIZE_PRESETS;
export declare const THEME_PRESETS: {
    readonly dark: {
        readonly containerBg: "rgba(15, 23, 42, 0.85)";
        readonly buttonBg: "rgba(30, 41, 59, 0.9)";
        readonly buttonHoverBg: "rgba(51, 65, 85, 0.95)";
        readonly buttonColor: "#e2e8f0";
        readonly indicatorColor: "#94a3b8";
        readonly borderColor: "rgba(51, 65, 85, 0.5)";
    };
    readonly light: {
        readonly containerBg: "rgba(255, 255, 255, 0.9)";
        readonly buttonBg: "rgba(241, 245, 249, 0.95)";
        readonly buttonHoverBg: "rgba(226, 232, 240, 1)";
        readonly buttonColor: "#334155";
        readonly indicatorColor: "#64748b";
        readonly borderColor: "rgba(203, 213, 225, 0.5)";
    };
};
export type ThemePreset = keyof typeof THEME_PRESETS | "auto";
export interface FloatingControlsOptions {
    controller: Controller;
    camera?: CameraHandle;
    position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "bottom-center";
    showPlayPause?: boolean;
    showPrevNext?: boolean;
    showZoomControls?: boolean;
    showStepIndicator?: boolean;
    autoHide?: boolean;
    offset?: {
        x: number;
        y: number;
    };
    size?: SizePreset;
    theme?: ThemePreset;
    playbackSpeed?: number;
    showReset?: boolean;
    orientation?: "horizontal" | "vertical";
}
export declare function createFloatingControls(options: FloatingControlsOptions): ControlsHandle;
//# sourceMappingURL=floatingControls.d.ts.map