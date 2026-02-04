import type { PresentationAst } from "../../types.js";
import type { FloatingControlsOptions } from "../../adapters/floatingControls.js";
export interface DiscoveredDiagram {
    element: HTMLElement;
    mermaidElement: HTMLElement;
    mermaidText: string;
    ast: PresentationAst;
    controlsPosition?: FloatingControlsOptions["position"];
    controlsSize?: "compact" | "normal" | "large";
    controlsTheme?: "dark" | "light" | "auto";
}
/**
 * Discover all finsteps diagrams within a container
 */
export declare function discoverDiagrams(container: HTMLElement): DiscoveredDiagram[];
//# sourceMappingURL=discovery.d.ts.map