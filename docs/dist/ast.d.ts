export type Severity = "error" | "warning";
export interface SourcePosition {
    offset: number;
    line: number;
    column: number;
}
export interface SourceSpan {
    start: SourcePosition;
    end: SourcePosition;
}
export interface NodeBase {
    type: string;
    span: SourceSpan;
}
export interface ProgramNode extends NodeBase {
    type: "Program";
    version: string;
    body: TopLevelItem[];
}
export type TopLevelItem = DeckNode | DiagramDeclNode | RuntimeDeclNode | SelectorsDeclNode | StylesDeclNode | ConstDeclNode | SceneDeclNode | BindingDeclNode | PluginDeclNode | MetaDeclNode | UnknownBlockNode;
export interface UnknownBlockNode extends NodeBase {
    type: "UnknownBlock";
    name: string;
    content: string;
}
export interface DeckNode extends NodeBase {
    type: "Deck";
    name?: NameValue;
    items: DeckItem[];
}
export type DeckItem = MetaDeclNode | DiagramDeclNode | RuntimeDeclNode | SelectorsDeclNode | StylesDeclNode | ConstDeclNode | SceneDeclNode | BindingDeclNode | PluginDeclNode | UnknownBlockNode;
export interface MetaDeclNode extends NodeBase {
    type: "MetaDecl";
    entries: MetaEntry[];
}
export interface MetaEntry extends NodeBase {
    type: "MetaEntry";
    key: string;
    value: Expr;
}
export interface ConstDeclNode extends NodeBase {
    type: "ConstDecl";
    name: string;
    value: Expr;
}
export interface PluginDeclNode extends NodeBase {
    type: "PluginDecl";
    ref: NameValue;
    options?: ObjectExprNode;
}
export interface DiagramDeclNode extends NodeBase {
    type: "DiagramDecl";
    id: NameValue;
    items: DiagramItem[];
}
export type DiagramItem = MermaidSourceDeclNode | MermaidConfigDeclNode | DiagramAssetsDeclNode | MetaDeclNode;
export interface MermaidSourceDeclNode extends NodeBase {
    type: "MermaidSourceDecl";
    source: string;
    tag: string;
}
export interface MermaidConfigDeclNode extends NodeBase {
    type: "MermaidConfigDecl";
    config: ObjectExprNode;
}
export interface DiagramAssetsDeclNode extends NodeBase {
    type: "DiagramAssetsDecl";
    assets: ObjectExprNode;
}
export interface RuntimeDeclNode extends NodeBase {
    type: "RuntimeDecl";
    items: RuntimeItem[];
}
export type RuntimeItem = CameraDeclNode | OverlayDeclNode | NavigationDeclNode | ControlsDeclNode | PerformanceDeclNode | MetaDeclNode;
export interface CameraDeclNode extends NodeBase {
    type: "CameraDecl";
    items: CameraItem[];
}
export type CameraItem = {
    type: "CameraEngine";
    span: SourceSpan;
    name: NameValue;
} | {
    type: "CameraOptions";
    span: SourceSpan;
    options: ObjectExprNode;
} | {
    type: "CameraBounds";
    span: SourceSpan;
    bounds: "viewport" | "container" | "svg";
};
export interface OverlayDeclNode extends NodeBase {
    type: "OverlayDecl";
    items: OverlayItem[];
}
export type OverlayItem = {
    type: "OverlayEngine";
    span: SourceSpan;
    name: NameValue;
} | {
    type: "OverlayOptions";
    span: SourceSpan;
    options: ObjectExprNode;
};
export interface NavigationDeclNode extends NodeBase {
    type: "NavigationDecl";
    items: NavigationItem[];
}
export type NavigationItem = {
    type: "NavigationKeys";
    span: SourceSpan;
    options: ObjectExprNode;
} | {
    type: "NavigationWheelZoom";
    span: SourceSpan;
    value: boolean;
} | {
    type: "NavigationDragPan";
    span: SourceSpan;
    value: boolean;
} | {
    type: "NavigationTapToAdvance";
    span: SourceSpan;
    value: boolean;
} | {
    type: "NavigationProgressUI";
    span: SourceSpan;
    value: boolean;
} | {
    type: "NavigationStartAt";
    span: SourceSpan;
    value: number | string;
};
export interface ControlsDeclNode extends NodeBase {
    type: "ControlsDecl";
    items: ControlsItem[];
}
export type ControlsItem = {
    type: "ControlsMode";
    span: SourceSpan;
    mode: NameValue;
} | {
    type: "ControlsPosition";
    span: SourceSpan;
    position: NameValue;
} | {
    type: "ControlsShowPlayPause";
    span: SourceSpan;
    value: boolean;
} | {
    type: "ControlsShowPrevNext";
    span: SourceSpan;
    value: boolean;
} | {
    type: "ControlsShowZoomControls";
    span: SourceSpan;
    value: boolean;
} | {
    type: "ControlsShowStepIndicator";
    span: SourceSpan;
    value: boolean;
} | {
    type: "ControlsAutoHide";
    span: SourceSpan;
    value: boolean;
} | {
    type: "ControlsOffset";
    span: SourceSpan;
    offset: ObjectExprNode;
};
export interface PerformanceDeclNode extends NodeBase {
    type: "PerformanceDecl";
    options: ObjectExprNode;
}
export interface SelectorsDeclNode extends NodeBase {
    type: "SelectorsDecl";
    items: SelectorsItem[];
}
export type SelectorsItem = {
    type: "SelectorsStrategy";
    span: SourceSpan;
    strategy: "mermaid-node-id" | "mermaid-data-id" | "css" | "hybrid";
} | {
    type: "SelectorsFallback";
    span: SourceSpan;
    fallback: ArrayExprNode;
} | {
    type: "SelectorsNode";
    span: SourceSpan;
    spec: ObjectExprNode;
} | {
    type: "SelectorsEdge";
    span: SourceSpan;
    spec: ObjectExprNode;
} | {
    type: "SelectorsSubgraph";
    span: SourceSpan;
    spec: ObjectExprNode;
} | MetaDeclNode;
export interface StylesDeclNode extends NodeBase {
    type: "StylesDecl";
    items: StylesItem[];
}
export type StylesItem = {
    type: "StylesClasses";
    span: SourceSpan;
    classes: ObjectExprNode;
} | {
    type: "StylesSpotlight";
    span: SourceSpan;
    spotlight: ObjectExprNode;
} | {
    type: "StylesTheme";
    span: SourceSpan;
    theme: NameValue;
} | MetaDeclNode;
export interface SceneDeclNode extends NodeBase {
    type: "SceneDecl";
    name: NameValue;
    diagram?: NameValue;
    items: SceneItem[];
}
export type SceneItem = StepDeclNode | BindingDeclNode | MetaDeclNode | ConstDeclNode;
export interface StepDeclNode extends NodeBase {
    type: "StepDecl";
    name: NameValue;
    alias?: string;
    statements: StepStmt[];
}
export type StepStmt = FocusStmtNode | DoStmtNode | LetStmtNode | AssertStmtNode | MetaDeclNode;
export interface FocusStmtNode extends NodeBase {
    type: "FocusStmt";
    target: TargetExprNode;
    options: FocusOptions;
}
export interface FocusOptions {
    pad?: number;
    align?: AlignOption;
    lock?: LockMode;
    id?: string;
}
export type AlignOption = "center" | "start" | "end" | "top" | "bottom" | "left" | "right";
export type LockMode = "none" | "x" | "y" | "xy";
export interface DoStmtNode extends NodeBase {
    type: "DoStmt";
    action: ActionCallNode;
}
export interface LetStmtNode extends NodeBase {
    type: "LetStmt";
    name: string;
    value: Expr;
}
export interface AssertStmtNode extends NodeBase {
    type: "AssertStmt";
    condition: Expr;
    message?: string;
}
export interface BindingDeclNode extends NodeBase {
    type: "BindingDecl";
    name?: NameValue;
    priority?: number;
    rules: BindingRuleNode[];
}
export interface BindingRuleNode extends NodeBase {
    type: "BindingRule";
    event: EventSpecNode;
    target?: TargetExprNode | "any";
    when?: Expr;
    statements: BindingStmt[];
}
export type BindingStmt = DoStmtNode | LetStmtNode | AssertStmtNode;
export interface EventSpecNode extends NodeBase {
    type: "EventSpec";
    kind: "click" | "dblclick" | "hover" | "mouseenter" | "mouseleave" | "wheel" | "scroll" | "key" | "timer" | "custom";
    value?: string | number;
}
export interface ActionCallNode extends NodeBase {
    type: "ActionCall";
    name: string;
    args: ActionArg[];
}
export interface ActionArg extends NodeBase {
    type: "ActionArg";
    key?: string;
    value: Expr;
}
export type Expr = LiteralExprNode | VarRefNode | ObjectExprNode | ArrayExprNode | CallExprNode | TargetExprNode | UnaryExprNode | BinaryExprNode;
export interface LiteralExprNode extends NodeBase {
    type: "Literal";
    literalType: "number" | "int" | "duration" | "percent" | "boolean" | "null" | "string" | "color";
    value: number | boolean | null | string;
    raw: string;
}
export interface VarRefNode extends NodeBase {
    type: "VarRef";
    path: string[];
}
export interface ObjectExprNode extends NodeBase {
    type: "ObjectExpr";
    entries: ObjectEntryNode[];
}
export interface ObjectEntryNode extends NodeBase {
    type: "ObjectEntry";
    key: string;
    value: Expr;
}
export interface ArrayExprNode extends NodeBase {
    type: "ArrayExpr";
    items: Expr[];
}
export interface CallExprNode extends NodeBase {
    type: "CallExpr";
    name: string;
    args: ActionArg[];
}
export interface UnaryExprNode extends NodeBase {
    type: "UnaryExpr";
    operator: "!" | "-";
    argument: Expr;
}
export interface BinaryExprNode extends NodeBase {
    type: "BinaryExpr";
    operator: "or" | "and" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "+" | "-" | "*" | "/" | "%";
    left: Expr;
    right: Expr;
}
export type TargetExprNode = TargetNodeExpr | TargetEdgeExpr | TargetSubgraphExpr | TargetCssExpr | TargetIdExpr | TargetTextExpr | TargetGroupExpr | TargetUnionExpr | TargetIntersectExpr | TargetExceptExpr;
export interface TargetNodeExpr extends NodeBase {
    type: "TargetNode";
    ref: NodeRef;
}
export interface TargetEdgeExpr extends NodeBase {
    type: "TargetEdge";
    ref: EdgeRef;
}
export interface TargetSubgraphExpr extends NodeBase {
    type: "TargetSubgraph";
    ref: SubgraphRef;
}
export interface TargetCssExpr extends NodeBase {
    type: "TargetCss";
    selector: string;
}
export interface TargetIdExpr extends NodeBase {
    type: "TargetId";
    id: string;
}
export interface TargetTextExpr extends NodeBase {
    type: "TargetText";
    text: string;
}
export interface TargetGroupExpr extends NodeBase {
    type: "TargetGroup";
    targets: TargetExprNode[];
}
export interface TargetUnionExpr extends NodeBase {
    type: "TargetUnion";
    targets: TargetExprNode[];
}
export interface TargetIntersectExpr extends NodeBase {
    type: "TargetIntersect";
    targets: TargetExprNode[];
}
export interface TargetExceptExpr extends NodeBase {
    type: "TargetExcept";
    left: TargetExprNode;
    right: TargetExprNode;
}
export type NodeRef = "*" | NameValue;
export type EdgeRef = NameValue | EdgeTuple;
export type SubgraphRef = "*" | NameValue;
export interface EdgeTuple {
    from: NodeRef;
    to: NodeRef;
}
export type NameValue = {
    type: "Name";
    value: string;
    kind: "identifier" | "string";
    span: SourceSpan;
};
export interface Diagnostic {
    message: string;
    severity: Severity;
    span?: SourceSpan;
    code?: string;
}
export interface ParseResult {
    ast: ProgramNode | null;
    diagnostics: Diagnostic[];
}
//# sourceMappingURL=ast.d.ts.map