import type { Controller } from "../../types.js";
import type { RevealApi } from "./types.js";
export interface FragmentSyncOptions {
    reveal: RevealApi;
    slideElement: HTMLElement;
    controller: Controller;
}
export interface FragmentSyncHandle {
    destroy(): void;
}
/**
 * Set up synchronization between Reveal.js fragments and finsteps steps.
 *
 * Fragments with data-finsteps-step="N" will advance the diagram to step N
 * when the fragment becomes visible.
 *
 * Example:
 * ```html
 * <div data-finsteps>
 *   <pre class="finsteps-mermaid">...</pre>
 *   <span class="fragment" data-finsteps-step="1"></span>
 *   <span class="fragment" data-finsteps-step="2"></span>
 * </div>
 * ```
 */
export declare function setupFragmentSync(options: FragmentSyncOptions): FragmentSyncHandle;
//# sourceMappingURL=fragmentSync.d.ts.map