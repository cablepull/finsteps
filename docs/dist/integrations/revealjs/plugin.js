import { presentMermaid } from "../../index.js";
import { createFloatingControls } from "../../adapters/floatingControls.js";
import { discoverDiagrams } from "./discovery.js";
import { setupFragmentSync } from "./fragmentSync.js";
/**
 * Create a Finsteps plugin for Reveal.js
 *
 * @example
 * ```js
 * import Reveal from "reveal.js";
 * import { FinstepsRevealPlugin } from "finsteps/revealjs";
 *
 * Reveal.initialize({
 *   plugins: [FinstepsRevealPlugin({ showControls: true })]
 * });
 * ```
 */
export function FinstepsRevealPlugin(options = {}) {
    const { defaultControlsPosition = "bottom-right", defaultControlsSize = "compact", defaultControlsTheme = "auto", showControls = true, syncWithFragments = false, resetOnSlideChange = true } = options;
    const instances = new Map();
    const fragmentSyncHandles = new Map();
    let reveal = null;
    let currentSlide = null;
    /**
     * Initialize a single diagram
     */
    async function initializeDiagram(discovered) {
        try {
            // Create a mount element for the diagram if the mermaid element is a <pre>
            const mountEl = discovered.mermaidElement;
            const controller = await presentMermaid({
                mountEl,
                mermaidText: discovered.mermaidText,
                ast: discovered.ast
            });
            let controlsHandle;
            if (showControls) {
                controlsHandle = createFloatingControls({
                    controller,
                    position: discovered.controlsPosition ?? defaultControlsPosition,
                    size: discovered.controlsSize ?? defaultControlsSize,
                    theme: discovered.controlsTheme ?? defaultControlsTheme,
                    showZoomControls: false,
                    showReset: true,
                    offset: { x: 10, y: 10 }
                });
                // Hide controls initially if not on current slide
                if (reveal && reveal.getCurrentSlide() !== getSlideForElement(discovered.element)) {
                    controlsHandle.hide();
                }
            }
            return {
                element: discovered.element,
                controller,
                controlsHandle
            };
        }
        catch (error) {
            console.error("[finsteps] Failed to initialize diagram:", error);
            return null;
        }
    }
    /**
     * Get the slide element containing a given element
     */
    function getSlideForElement(element) {
        return element.closest("section");
    }
    /**
     * Clear overlays for a diagram
     */
    function clearOverlaysForDiagram(instance) {
        const deps = instance.controller.getDeps?.();
        if (deps?.overlay?.clear) {
            deps.overlay.clear();
        }
        else if (deps?.overlay?.hideBubble) {
            // Fallback: hide default bubble
            deps.overlay.hideBubble();
        }
    }
    /**
     * Handle slide change events
     */
    function handleSlideChanged(event) {
        const { currentSlide: newSlide, previousSlide } = event;
        currentSlide = newSlide;
        // Hide controls and clear overlays for previous slide's diagrams
        if (previousSlide) {
            for (const [element, instance] of instances) {
                if (previousSlide.contains(element)) {
                    instance.controlsHandle?.hide();
                    clearOverlaysForDiagram(instance);
                }
            }
        }
        // Show controls and optionally reset for current slide's diagrams
        for (const [element, instance] of instances) {
            if (newSlide.contains(element)) {
                instance.controlsHandle?.show();
                if (resetOnSlideChange) {
                    instance.controller.reset().catch(() => { });
                }
            }
        }
    }
    /**
     * Set up fragment sync for diagrams on a slide
     */
    function setupFragmentSyncForSlide(slide) {
        if (!syncWithFragments || !reveal)
            return;
        for (const [element, instance] of instances) {
            if (slide.contains(element)) {
                // Check if already set up
                if (fragmentSyncHandles.has(element))
                    continue;
                const handle = setupFragmentSync({
                    reveal,
                    slideElement: slide,
                    controller: instance.controller
                });
                fragmentSyncHandles.set(element, handle);
            }
        }
    }
    return {
        id: "finsteps",
        async init(revealApi) {
            reveal = revealApi;
            // Discover all diagrams in the presentation
            const slidesContainer = document.querySelector(".reveal .slides");
            if (!slidesContainer) {
                console.warn("[finsteps] No Reveal.js slides container found");
                return;
            }
            const discovered = discoverDiagrams(slidesContainer);
            // Initialize all discovered diagrams
            for (const diagram of discovered) {
                const instance = await initializeDiagram(diagram);
                if (instance) {
                    instances.set(diagram.element, instance);
                }
            }
            // Set up slide change handler
            reveal.on("slidechanged", handleSlideChanged);
            // Set up fragment sync if enabled
            if (syncWithFragments) {
                reveal.on("slidechanged", (event) => {
                    setupFragmentSyncForSlide(event.currentSlide);
                });
                // Set up for initial slide
                const initialSlide = reveal.getCurrentSlide();
                if (initialSlide) {
                    setupFragmentSyncForSlide(initialSlide);
                }
            }
            // Show controls for initial slide, clear overlays for non-current slides
            currentSlide = reveal.getCurrentSlide();
            if (currentSlide) {
                for (const [element, instance] of instances) {
                    if (currentSlide.contains(element)) {
                        instance.controlsHandle?.show();
                    }
                    else {
                        // Clear any overlay bubbles from diagrams not on current slide
                        clearOverlaysForDiagram(instance);
                    }
                }
            }
        },
        destroy() {
            // Clean up fragment sync handles
            for (const handle of fragmentSyncHandles.values()) {
                handle.destroy();
            }
            fragmentSyncHandles.clear();
            // Clean up diagram instances
            for (const instance of instances.values()) {
                instance.controlsHandle?.destroy();
                instance.controller.destroy();
            }
            instances.clear();
            reveal = null;
            currentSlide = null;
        }
    };
}
//# sourceMappingURL=plugin.js.map