export type MPFErrorCode = "MPF_INVALID_PRESENT_OPTIONS" | "MPF_MERMAID_UNAVAILABLE" | "MPF_MERMAID_RENDER_FAILED" | "MPF_OVERLAY_DESTROYED" | "MPF_OVERLAY_TARGET_MISSING" | "MPF_ACTION_UNKNOWN" | "MPF_ACTION_INVALID_ARGS" | "MPF_PARSE_ERROR";
export declare class MPFError extends Error {
    readonly code: MPFErrorCode;
    constructor(message: string, code: MPFErrorCode);
}
export declare class ParseError extends MPFError {
    constructor(message: string, code?: MPFErrorCode);
}
export declare class ActionError extends MPFError {
    constructor(message: string, code?: MPFErrorCode);
}
//# sourceMappingURL=errors.d.ts.map