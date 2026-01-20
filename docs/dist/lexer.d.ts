import { Diagnostic, SourcePosition } from "./ast.js";
export type TokenType = "keyword" | "identifier" | "string" | "number" | "int" | "duration" | "percent" | "boolean" | "null" | "color" | "operator" | "punct" | "heredoc" | "eof";
export interface Token {
    type: TokenType;
    value: string;
    start: SourcePosition;
    end: SourcePosition;
    image: string;
    heredoc?: {
        tag: string;
        body: string;
    };
}
export interface LexResult {
    tokens: Token[];
    diagnostics: Diagnostic[];
}
export declare function lexMPD(source: string): LexResult;
//# sourceMappingURL=lexer.d.ts.map