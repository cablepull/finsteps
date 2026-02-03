import { MermaidController } from "./controller/controller.js";
import { PresentMermaidOptions } from "./types.js";
export declare const presentMermaid: (options: PresentMermaidOptions) => Promise<MermaidController>;
export * from "./types.js";
export * from "./adapters/basicCamera.js";
export * from "./adapters/basicOverlay.js";
export * from "./adapters/floatingControls.js";
export * from "./adapters/mermaidDiagram.js";
export * from "./mocks/mockHandles.js";
import type { ParseResult, Diagnostic } from "./ast.js";
export { parseMPD } from "./parser.js";
export { formatDiagnostics } from "./diagnostics.js";
export { ActionError, MPFError, ParseError } from "./errors.js";
/**
 * Validates MPD syntax and returns a simpler result structure.
 * This is a convenience wrapper around parseMPD() for easier validation.
 *
 * @param mpdText - The MPD source code to validate
 * @returns Validation result with valid flag, AST, errors, and warnings
 */
export declare function validateMPD(mpdText: string): {
    valid: boolean;
    ast: ParseResult["ast"];
    errors: Diagnostic[];
    warnings: Diagnostic[];
};
export type { ActionArg, ActionCallNode, AlignOption, ArrayExprNode, AssertStmtNode, BindingDeclNode, BindingRuleNode, BindingStmt, CallExprNode, CameraDeclNode, CameraItem, ConstDeclNode, ControlsDeclNode, ControlsItem, DeckItem, DeckNode, Diagnostic, DiagramAssetsDeclNode, DiagramDeclNode, DiagramItem, DoStmtNode, EdgeRef, EdgeTuple, EventSpecNode, Expr, FocusOptions, FocusStmtNode, LetStmtNode, LiteralExprNode, LockMode, MetaDeclNode, MetaEntry, MermaidConfigDeclNode, MermaidSourceDeclNode, NameValue, NavigationDeclNode, NavigationItem, NodeRef, ObjectEntryNode, ObjectExprNode, OverlayDeclNode, OverlayItem, ParseResult, PerformanceDeclNode, PluginDeclNode, ProgramNode, RuntimeDeclNode, RuntimeItem, SceneDeclNode, SceneItem, SelectorsDeclNode, SelectorsItem, SourcePosition, SourceSpan, StepDeclNode, StepStmt, StylesDeclNode, StylesItem, SubgraphRef, TargetExprNode, TargetExceptExpr, TargetGroupExpr, TargetIntersectExpr, TargetUnionExpr, UnaryExprNode, UnknownBlockNode, VarRefNode } from "./ast.js";
export { FinstepsRevealPlugin } from "./integrations/revealjs/index.js";
export type { FinstepsPluginOptions, RevealApi, RevealPlugin } from "./integrations/revealjs/index.js";
export default presentMermaid;
//# sourceMappingURL=index.d.ts.map