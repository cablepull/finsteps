/**
 * Generates actionable suggestions for error codes
 */
function generateSuggestions(code, context) {
    switch (code) {
        case "MPF_INVALID_PRESENT_OPTIONS":
            return [
                'Ensure you provide either "ast" or both "mpdText" and "options.parseMpd"',
                'Example: presentMermaid({ mermaidText, mpdText, mountEl, options: { parseMpd } })',
                'See API documentation: https://github.com/cablepull/finsteps#cdn-usage-jsdelivr'
            ];
        case "MPF_MERMAID_UNAVAILABLE":
            return [
                'Load Mermaid.js before importing Finsteps',
                'Add <script src="https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.min.js"></script> in your HTML',
                'Ensure mermaid.initialize() is called before presentMermaid()'
            ];
        case "MPF_MERMAID_RENDER_FAILED":
            return [
                'Check your Mermaid diagram syntax is valid',
                'Test your diagram at https://mermaid.live/',
                'Verify the mermaidText is a valid string and not empty'
            ];
        case "MPF_OVERLAY_DESTROYED":
            return [
                'Do not call overlay methods after controller.destroy()',
                'Check that the controller is still active before showing overlays',
                'Ensure lifecycle hooks are not accessing destroyed overlays'
            ];
        case "MPF_OVERLAY_TARGET_MISSING":
            const targetInfo = context?.target ? ` Target: ${JSON.stringify(context.target)}` : '';
            return [
                `Verify the target element exists in the diagram${targetInfo}`,
                'Check that dataId, selector, or id matches an element in the rendered SVG',
                'Use the live editor to see available data-id values: https://cablepull.github.io/finsteps/examples/editor/'
            ];
        case "MPF_ACTION_UNKNOWN":
            const actionType = context?.actionType ? ` Action: ${context.actionType}` : '';
            return [
                `Check that the action type is spelled correctly${actionType}`,
                'Common actions: camera.fit, camera.reset, overlay.bubble, style.highlight, nav.next, nav.prev',
                'See grammar documentation: https://cablepull.github.io/finsteps/grammar.html'
            ];
        case "MPF_ACTION_INVALID_ARGS":
            return [
                'Verify the action payload structure matches the expected format',
                'Check required fields (e.g., camera.fit requires "target" in payload)',
                'Review action documentation in grammar: https://cablepull.github.io/finsteps/grammar.html'
            ];
        case "MPF_PARSE_ERROR":
            return [
                'Use formatDiagnostics(result.diagnostics) to see detailed parse errors',
                'Check your MPD syntax against the EBNF grammar: https://cablepull.github.io/finsteps/ebnf/mpd.ebnf',
                'Validate MPD with parseMPD() before passing to presentMermaid()'
            ];
        default:
            return [];
    }
}
export class MPFError extends Error {
    constructor(message, code, context) {
        super(message);
        this.name = "MPFError";
        this.code = code;
        this.context = context;
        this.suggestions = generateSuggestions(code, context);
    }
}
export class ParseError extends MPFError {
    constructor(message, code = "MPF_PARSE_ERROR") {
        super(message, code);
        this.name = "ParseError";
    }
}
export class ActionError extends MPFError {
    constructor(message, code = "MPF_ACTION_INVALID_ARGS", context) {
        super(message, code, context);
        this.name = "ActionError";
    }
}
//# sourceMappingURL=errors.js.map