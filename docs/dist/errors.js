export class MPFError extends Error {
    constructor(message, code) {
        super(message);
        this.name = "MPFError";
        this.code = code;
    }
}
export class ParseError extends MPFError {
    constructor(message, code = "MPF_PARSE_ERROR") {
        super(message, code);
        this.name = "ParseError";
    }
}
export class ActionError extends MPFError {
    constructor(message, code = "MPF_ACTION_INVALID_ARGS") {
        super(message, code);
        this.name = "ActionError";
    }
}
//# sourceMappingURL=errors.js.map