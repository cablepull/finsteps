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
export function setupFragmentSync(options) {
    const { reveal, slideElement, controller } = options;
    // Find all fragments with finsteps step markers
    const fragments = slideElement.querySelectorAll("[data-finsteps-step]");
    if (fragments.length === 0) {
        return { destroy: () => { } };
    }
    // Build a map of fragment index to step
    const fragmentStepMap = new Map();
    fragments.forEach((fragment, index) => {
        const stepAttr = fragment.dataset.finstepsStep;
        if (stepAttr) {
            const stepNum = parseInt(stepAttr, 10);
            if (!isNaN(stepNum)) {
                fragmentStepMap.set(index, stepNum);
            }
        }
    });
    const handleFragmentShown = (event) => {
        if (!event.fragment)
            return;
        // Check if this fragment is in our slide
        if (!slideElement.contains(event.fragment))
            return;
        const stepAttr = event.fragment.dataset.finstepsStep;
        if (stepAttr) {
            const stepIndex = parseInt(stepAttr, 10);
            if (!isNaN(stepIndex)) {
                // Go to the specified step (0-indexed)
                controller.goto(stepIndex).catch(() => { });
            }
        }
    };
    const handleFragmentHidden = (event) => {
        if (!event.fragment)
            return;
        // Check if this fragment is in our slide
        if (!slideElement.contains(event.fragment))
            return;
        const stepAttr = event.fragment.dataset.finstepsStep;
        if (stepAttr) {
            const stepIndex = parseInt(stepAttr, 10);
            if (!isNaN(stepIndex) && stepIndex > 0) {
                // Go to previous step
                controller.goto(stepIndex - 1).catch(() => { });
            }
        }
    };
    reveal.on("fragmentshown", handleFragmentShown);
    reveal.on("fragmenthidden", handleFragmentHidden);
    return {
        destroy() {
            reveal.off("fragmentshown", handleFragmentShown);
            reveal.off("fragmenthidden", handleFragmentHidden);
        }
    };
}
//# sourceMappingURL=fragmentSync.js.map