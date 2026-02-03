import { createBasicCameraHandle } from "./adapters/basicCamera.js";
import { createBasicOverlayHandle } from "./adapters/basicOverlay.js";
import { createFloatingControls, ControlsHandle } from "./adapters/floatingControls.js";
import { createMermaidDiagramAdapter } from "./adapters/mermaidDiagram.js";
import { MermaidController } from "./controller/controller.js";
import { MPFError } from "./errors.js";
import { PresentMermaidOptions, PresentationAst } from "./types.js";

const resolveAst = (options: PresentMermaidOptions): PresentationAst => {
  if (options.ast) {
    return options.ast;
  }
  if (options.mpdText && options.options?.parseMpd) {
    return options.options.parseMpd(options.mpdText);
  }
  throw new MPFError(
    "presentMermaid requires ast or mpdText with parseMpd",
    "MPF_INVALID_PRESENT_OPTIONS",
    {
      hasAst: !!options.ast,
      hasMpdText: !!options.mpdText,
      hasParseMpd: !!options.options?.parseMpd
    }
  );
};

export const presentMermaid = async (options: PresentMermaidOptions) => {
  const ast = resolveAst(options);
  const diagramAdapter = options.options?.diagram ?? createMermaidDiagramAdapter();
  const diagram = await diagramAdapter.render({
    mountEl: options.mountEl,
    mermaidText: options.mermaidText
  });
  const camera = options.options?.camera ?? createBasicCameraHandle(diagram);
  const overlay = options.options?.overlay ?? createBasicOverlayHandle();
  const controller = new MermaidController({
    diagram,
    camera,
    overlay,
    ast,
    actionHandlers: options.options?.actionHandlers,
    errorPolicy: options.options?.errorPolicy ?? "haltOnError",
    hooks: options.options?.hooks
  });
  await controller.init({ diagram });

  // Create floating controls if configured via JavaScript options
  // Note: DSL-based controls configuration would be extracted from AST here in the future
  if (options.options?.controls) {
    // Controls handle was provided, update its state
    options.options.controls.updateState(controller.getState());
  }

  return controller;
};

export * from "./types.js";
export * from "./adapters/basicCamera.js";
export * from "./adapters/basicOverlay.js";
export * from "./adapters/floatingControls.js";
export * from "./adapters/mermaidDiagram.js";
export * from "./mocks/mockHandles.js";
import { parseMPD } from "./parser.js";
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
export function validateMPD(mpdText: string): {
  valid: boolean;
  ast: ParseResult["ast"];
  errors: Diagnostic[];
  warnings: Diagnostic[];
} {
  const result: ParseResult = parseMPD(mpdText);
  const errors = result.diagnostics.filter((d) => d.severity === "error");
  const warnings = result.diagnostics.filter((d) => d.severity === "warning");
  const valid = result.ast !== null && errors.length === 0;

  return {
    valid,
    ast: result.ast,
    errors,
    warnings
  };
}
export type {
  ActionArg,
  ActionCallNode,
  AlignOption,
  ArrayExprNode,
  AssertStmtNode,
  BindingDeclNode,
  BindingRuleNode,
  BindingStmt,
  CallExprNode,
  CameraDeclNode,
  CameraItem,
  ConstDeclNode,
  ControlsDeclNode,
  ControlsItem,
  DeckItem,
  DeckNode,
  Diagnostic,
  DiagramAssetsDeclNode,
  DiagramDeclNode,
  DiagramItem,
  DoStmtNode,
  EdgeRef,
  EdgeTuple,
  EventSpecNode,
  Expr,
  FocusOptions,
  FocusStmtNode,
  LetStmtNode,
  LiteralExprNode,
  LockMode,
  MetaDeclNode,
  MetaEntry,
  MermaidConfigDeclNode,
  MermaidSourceDeclNode,
  NameValue,
  NavigationDeclNode,
  NavigationItem,
  NodeRef,
  ObjectEntryNode,
  ObjectExprNode,
  OverlayDeclNode,
  OverlayItem,
  ParseResult,
  PerformanceDeclNode,
  PluginDeclNode,
  ProgramNode,
  RuntimeDeclNode,
  RuntimeItem,
  SceneDeclNode,
  SceneItem,
  SelectorsDeclNode,
  SelectorsItem,
  SourcePosition,
  SourceSpan,
  StepDeclNode,
  StepStmt,
  StylesDeclNode,
  StylesItem,
  SubgraphRef,
  TargetExprNode,
  TargetExceptExpr,
  TargetGroupExpr,
  TargetIntersectExpr,
  TargetUnionExpr,
  UnaryExprNode,
  UnknownBlockNode,
  VarRefNode
} from "./ast.js";

// Re-export Reveal.js plugin for convenience
export { FinstepsRevealPlugin } from "./integrations/revealjs/index.js";
export type { FinstepsPluginOptions, RevealApi, RevealPlugin } from "./integrations/revealjs/index.js";

export default presentMermaid;
