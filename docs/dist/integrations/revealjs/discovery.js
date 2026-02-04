/**
 * Discover all finsteps diagrams within a container
 */
export function discoverDiagrams(container) {
    const diagrams = [];
    const finstepsElements = container.querySelectorAll("[data-finsteps]");
    finstepsElements.forEach((element) => {
        const discovered = parseDiagramElement(element);
        if (discovered) {
            diagrams.push(discovered);
        }
    });
    return diagrams;
}
/**
 * Parse a single diagram element and extract configuration
 */
function parseDiagramElement(element) {
    // Find mermaid content
    const mermaidElement = element.querySelector(".finsteps-mermaid, pre.mermaid, .mermaid");
    if (!mermaidElement) {
        console.warn("[finsteps] No mermaid element found in", element);
        return null;
    }
    const mermaidText = mermaidElement.textContent?.trim();
    if (!mermaidText) {
        console.warn("[finsteps] Empty mermaid text in", element);
        return null;
    }
    // Find AST/steps configuration
    const ast = parseAstConfig(element);
    if (!ast) {
        console.warn("[finsteps] No valid AST configuration found in", element);
        return null;
    }
    // Parse controls options from data attributes
    const controlsPosition = parseControlsPosition(element.dataset.finstepsControls);
    const controlsSize = parseControlsSize(element.dataset.finstepsControlsSize);
    const controlsTheme = parseControlsTheme(element.dataset.finstepsControlsTheme);
    return {
        element,
        mermaidElement,
        mermaidText,
        ast,
        controlsPosition,
        controlsSize,
        controlsTheme
    };
}
/**
 * Parse AST configuration from script tag or data attribute
 */
function parseAstConfig(element) {
    // Try script tag first
    const scriptTag = element.querySelector('script[type="application/finsteps+json"], script[type="application/json"]');
    if (scriptTag?.textContent) {
        try {
            const parsed = JSON.parse(scriptTag.textContent);
            // Support both { steps: [...] } and { ast: { steps: [...] } }
            if (parsed.steps && Array.isArray(parsed.steps)) {
                return { steps: parsed.steps, bindings: parsed.bindings };
            }
            if (parsed.ast?.steps && Array.isArray(parsed.ast.steps)) {
                return parsed.ast;
            }
        }
        catch (e) {
            console.warn("[finsteps] Failed to parse AST from script tag:", e);
        }
    }
    // Try data-finsteps-ast attribute
    const astAttr = element.dataset.finstepsAst;
    if (astAttr) {
        try {
            const parsed = JSON.parse(astAttr);
            if (parsed.steps && Array.isArray(parsed.steps)) {
                return { steps: parsed.steps, bindings: parsed.bindings };
            }
        }
        catch (e) {
            console.warn("[finsteps] Failed to parse AST from data attribute:", e);
        }
    }
    return null;
}
function parseControlsPosition(value) {
    const valid = ["bottom-right", "bottom-left", "top-right", "top-left", "bottom-center"];
    return valid.includes(value || "") ? value : undefined;
}
function parseControlsSize(value) {
    const valid = ["compact", "normal", "large"];
    return valid.includes(value || "") ? value : undefined;
}
function parseControlsTheme(value) {
    const valid = ["dark", "light", "auto"];
    return valid.includes(value || "") ? value : undefined;
}
//# sourceMappingURL=discovery.js.map