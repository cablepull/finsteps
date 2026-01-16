import {
  ActionArg,
  ActionCallNode,
  AlignOption,
  ArrayExprNode,
  AssertStmtNode,
  BinaryExprNode,
  BindingDeclNode,
  BindingRuleNode,
  BindingStmt,
  CallExprNode,
  CameraDeclNode,
  CameraItem,
  ConstDeclNode,
  DeckItem,
  DeckNode,
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
} from "./ast";
import { Diagnostic } from "./ast";
import { Token, lexMPD } from "./lexer";

const SUPPORTED_VERSION = "1.0";

export function parseMPD(source: string): ParseResult {
  const lexed = lexMPD(source);
  const parser = new MPDParser(source, lexed.tokens, lexed.diagnostics);
  const ast = parser.parseProgram();
  const diagnostics = parser.diagnostics;
  if (ast) {
    diagnostics.push(...validateAST(ast));
  }
  return { ast, diagnostics };
}

class MPDParser {
  private index = 0;
  public diagnostics: Diagnostic[];

  constructor(
    private readonly source: string,
    private readonly tokens: Token[],
    diagnostics: Diagnostic[]
  ) {
    this.diagnostics = diagnostics.slice();
  }

  parseProgram(): ProgramNode | null {
    const start = this.peek();
    if (!this.consumeKeyword("mpd")) {
      return null;
    }
    const version = this.parseVersion();
    if (!version) {
      return null;
    }
    const body: DeckItem[] = [];
    if (this.matchKeyword("deck")) {
      const deck = this.parseDeck();
      if (deck) {
        body.push(deck);
      }
    } else {
      while (!this.isAtEnd()) {
        const item = this.parseTopLevelItem();
        if (!item) {
          break;
        }
        body.push(item);
      }
    }
    const end = this.previous();
    return {
      type: "Program",
      version: version.value,
      body,
      span: spanFrom(start, end)
    };
  }

  private parseDeck(): DeckNode | null {
    const start = this.consumeKeyword("deck");
    if (!start) {
      return null;
    }
    const name = this.parseOptionalName();
    const { items, end } = this.parseBlock(() => this.parseDeckItem());
    return {
      type: "Deck",
      name: name ?? undefined,
      items,
      span: spanFrom(start, end)
    };
  }

  private parseTopLevelItem(): DeckItem | null {
    if (this.isAtEnd()) {
      return null;
    }
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "diagram":
          return this.parseDiagramDecl();
        case "runtime":
          return this.parseRuntimeDecl();
        case "selectors":
          return this.parseSelectorsDecl();
        case "styles":
          return this.parseStylesDecl();
        case "let":
          return this.parseConstDecl();
        case "scene":
          return this.parseSceneDecl();
        case "binding":
          return this.parseBindingDecl();
        case "use":
          return this.parsePluginDecl();
        case "meta":
          return this.parseMetaDecl();
        default:
          break;
      }
    }
    if (token.type === "identifier") {
      return this.parseUnknownBlock();
    }
    this.error(token, "top-level declaration");
    return null;
  }

  private parseDeckItem(): DeckItem | null {
    if (this.isAtEnd()) {
      return null;
    }
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "diagram":
          return this.parseDiagramDecl();
        case "runtime":
          return this.parseRuntimeDecl();
        case "selectors":
          return this.parseSelectorsDecl();
        case "styles":
          return this.parseStylesDecl();
        case "let":
          return this.parseConstDecl();
        case "scene":
          return this.parseSceneDecl();
        case "binding":
          return this.parseBindingDecl();
        case "use":
          return this.parsePluginDecl();
        case "meta":
          return this.parseMetaDecl();
        default:
          break;
      }
    }
    if (token.type === "identifier") {
      return this.parseUnknownBlock();
    }
    return null;
  }

  private parseUnknownBlock(): UnknownBlockNode | null {
    const nameToken = this.consume("identifier");
    if (!nameToken) {
      return null;
    }
    const brace = this.consumePunct("{");
    if (!brace) {
      return null;
    }
    let depth = 1;
    while (!this.isAtEnd() && depth > 0) {
      const token = this.peek();
      if (token.type === "punct" && token.value === "{") {
        depth += 1;
      } else if (token.type === "punct" && token.value === "}") {
        depth -= 1;
      }
      this.advance();
    }
    const end = this.previous();
    const content = this.source.slice(brace.start.offset, end.end.offset);
    return {
      type: "UnknownBlock",
      name: nameToken.value,
      content,
      span: spanFrom(nameToken, end)
    };
  }

  private parseMetaDecl(): MetaDeclNode | null {
    const start = this.consumeKeyword("meta");
    if (!start) {
      return null;
    }
    const items: MetaEntry[] = [];
    this.consumePunct("{");
    while (!this.isAtEnd() && !this.matchPunct("}")) {
      const entry = this.parseMetaEntry();
      if (entry) {
        items.push(entry);
      }
      if (this.matchPunct(",")) {
        this.consumePunct(",");
      }
    }
    const end = this.consumePunct("}") ?? this.previous();
    return {
      type: "MetaDecl",
      entries: items,
      span: spanFrom(start, end)
    };
  }

  private parseMetaEntry(): MetaEntry | null {
    const key = this.consume("identifier");
    if (!key) {
      return null;
    }
    this.consumePunct(":");
    const value = this.parseExpr();
    if (!value) {
      return null;
    }
    return {
      type: "MetaEntry",
      key: key.value,
      value,
      span: spanFrom(key, this.previous())
    };
  }

  private parseConstDecl(): ConstDeclNode | null {
    const start = this.consumeKeyword("let");
    if (!start) {
      return null;
    }
    const name = this.consume("identifier");
    if (!name) {
      return null;
    }
    this.consumePunct("=");
    const value = this.parseExpr();
    this.consumePunct(";");
    return {
      type: "ConstDecl",
      name: name.value,
      value: value ?? this.emptyLiteral(name),
      span: spanFrom(start, this.previous())
    };
  }

  private parsePluginDecl(): PluginDeclNode | null {
    const start = this.consumeKeyword("use");
    if (!start) {
      return null;
    }
    const ref = this.parseName();
    let options: ObjectExprNode | undefined;
    if (this.peek().type === "punct" && this.peek().value === "{") {
      options = this.parseObjectExpr();
    }
    this.consumePunct(";");
    return {
      type: "PluginDecl",
      ref,
      options,
      span: spanFrom(start, this.previous())
    };
  }

  private parseDiagramDecl(): DiagramDeclNode | null {
    const start = this.consumeKeyword("diagram");
    if (!start) {
      return null;
    }
    const id = this.parseName();
    const { items, end } = this.parseBlock(() => this.parseDiagramItem());
    return {
      type: "DiagramDecl",
      id,
      items: items.filter((item): item is DiagramItem => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseDiagramItem(): DiagramItem | null {
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "mermaid":
          return this.parseMermaidSourceDecl();
        case "config":
          return this.parseMermaidConfigDecl();
        case "assets":
          return this.parseDiagramAssetsDecl();
        case "meta":
          return this.parseMetaDecl();
        default:
          break;
      }
    }
    return null;
  }

  private parseMermaidSourceDecl(): MermaidSourceDeclNode | null {
    const start = this.consumeKeyword("mermaid");
    if (!start) {
      return null;
    }
    const heredocToken = this.consume("heredoc");
    if (!heredocToken || !heredocToken.heredoc) {
      return null;
    }
    this.consumePunct(";");
    return {
      type: "MermaidSourceDecl",
      source: heredocToken.heredoc.body,
      tag: heredocToken.heredoc.tag,
      span: spanFrom(start, this.previous())
    };
  }

  private parseMermaidConfigDecl(): MermaidConfigDeclNode | null {
    const start = this.consumeKeyword("config");
    if (!start) {
      return null;
    }
    const config = this.parseObjectExpr();
    this.consumePunct(";");
    return {
      type: "MermaidConfigDecl",
      config,
      span: spanFrom(start, this.previous())
    };
  }

  private parseDiagramAssetsDecl(): DiagramAssetsDeclNode | null {
    const start = this.consumeKeyword("assets");
    if (!start) {
      return null;
    }
    const assets = this.parseObjectExpr();
    this.consumePunct(";");
    return {
      type: "DiagramAssetsDecl",
      assets,
      span: spanFrom(start, this.previous())
    };
  }

  private parseRuntimeDecl(): RuntimeDeclNode | null {
    const start = this.consumeKeyword("runtime");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseRuntimeItem());
    return {
      type: "RuntimeDecl",
      items: items.filter((item): item is RuntimeItem => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseRuntimeItem(): RuntimeItem | null {
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "camera":
          return this.parseCameraDecl();
        case "overlay":
          return this.parseOverlayDecl();
        case "navigation":
          return this.parseNavigationDecl();
        case "performance":
          return this.parsePerformanceDecl();
        case "meta":
          return this.parseMetaDecl();
        default:
          break;
      }
    }
    return null;
  }

  private parseCameraDecl(): CameraDeclNode | null {
    const start = this.consumeKeyword("camera");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseCameraItem());
    return {
      type: "CameraDecl",
      items: items.filter((item): item is CameraItem => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseCameraItem(): CameraItem | null {
    if (this.matchKeyword("engine")) {
      const start = this.consumeKeyword("engine");
      this.consumePunct(":");
      const name = this.parseName();
      this.consumePunct(";");
      return {
        type: "CameraEngine",
        name,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("options")) {
      const start = this.consumeKeyword("options");
      this.consumePunct(":");
      const options = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "CameraOptions",
        options,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("bounds")) {
      const start = this.consumeKeyword("bounds");
      this.consumePunct(":");
      const boundsToken = this.consume("keyword");
      const bounds = (boundsToken?.value ?? "viewport") as "viewport" | "container" | "svg";
      this.consumePunct(";");
      return {
        type: "CameraBounds",
        bounds,
        span: spanFrom(start!, this.previous())
      };
    }
    return null;
  }

  private parseOverlayDecl(): OverlayDeclNode | null {
    const start = this.consumeKeyword("overlay");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseOverlayItem());
    return {
      type: "OverlayDecl",
      items: items.filter((item): item is OverlayItem => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseOverlayItem(): OverlayItem | null {
    if (this.matchKeyword("engine")) {
      const start = this.consumeKeyword("engine");
      this.consumePunct(":");
      const name = this.parseName();
      this.consumePunct(";");
      return {
        type: "OverlayEngine",
        name,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("options")) {
      const start = this.consumeKeyword("options");
      this.consumePunct(":");
      const options = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "OverlayOptions",
        options,
        span: spanFrom(start!, this.previous())
      };
    }
    return null;
  }

  private parseNavigationDecl(): NavigationDeclNode | null {
    const start = this.consumeKeyword("navigation");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseNavigationItem());
    return {
      type: "NavigationDecl",
      items: items.filter((item): item is NavigationItem => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseNavigationItem(): NavigationItem | null {
    if (this.matchKeyword("keys")) {
      const start = this.consumeKeyword("keys");
      this.consumePunct(":");
      const options = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "NavigationKeys",
        options,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("wheelZoom")) {
      const start = this.consumeKeyword("wheelZoom");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "NavigationWheelZoom",
        value,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("dragPan")) {
      const start = this.consumeKeyword("dragPan");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "NavigationDragPan",
        value,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("tapToAdvance")) {
      const start = this.consumeKeyword("tapToAdvance");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "NavigationTapToAdvance",
        value,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("progressUI")) {
      const start = this.consumeKeyword("progressUI");
      this.consumePunct(":");
      const value = this.parseBoolean();
      this.consumePunct(";");
      return {
        type: "NavigationProgressUI",
        value,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("startAt")) {
      const start = this.consumeKeyword("startAt");
      this.consumePunct(":");
      const valueToken = this.peek();
      let value: number | string = 0;
      if (valueToken.type === "int" || valueToken.type === "number") {
        this.advance();
        value = Number(valueToken.value);
      } else if (valueToken.type === "string") {
        this.advance();
        value = valueToken.value;
      } else {
        this.error(valueToken, "number or string");
      }
      this.consumePunct(";");
      return {
        type: "NavigationStartAt",
        value,
        span: spanFrom(start!, this.previous())
      };
    }
    return null;
  }

  private parsePerformanceDecl(): PerformanceDeclNode | null {
    const start = this.consumeKeyword("performance");
    if (!start) {
      return null;
    }
    const options = this.parseObjectExpr();
    this.consumePunct(";");
    return {
      type: "PerformanceDecl",
      options,
      span: spanFrom(start, this.previous())
    };
  }

  private parseSelectorsDecl(): SelectorsDeclNode | null {
    const start = this.consumeKeyword("selectors");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseSelectorsItem());
    return {
      type: "SelectorsDecl",
      items: items.filter((item): item is SelectorsItem => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseSelectorsItem(): SelectorsItem | null {
    if (this.matchKeyword("strategy")) {
      const start = this.consumeKeyword("strategy");
      this.consumePunct(":");
      const strategyToken = this.consume("keyword");
      const strategy = (strategyToken?.value ?? "css") as SelectorsItem["strategy"];
      this.consumePunct(";");
      return {
        type: "SelectorsStrategy",
        strategy,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("fallback")) {
      const start = this.consumeKeyword("fallback");
      this.consumePunct(":");
      const fallback = this.parseArrayExpr();
      this.consumePunct(";");
      return {
        type: "SelectorsFallback",
        fallback,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("node")) {
      const start = this.consumeKeyword("node");
      this.consumePunct(":");
      const spec = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "SelectorsNode",
        spec,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("edge")) {
      const start = this.consumeKeyword("edge");
      this.consumePunct(":");
      const spec = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "SelectorsEdge",
        spec,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("subgraph")) {
      const start = this.consumeKeyword("subgraph");
      this.consumePunct(":");
      const spec = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "SelectorsSubgraph",
        spec,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("meta")) {
      return this.parseMetaDecl();
    }
    return null;
  }

  private parseStylesDecl(): StylesDeclNode | null {
    const start = this.consumeKeyword("styles");
    if (!start) {
      return null;
    }
    const { items, end } = this.parseBlock(() => this.parseStylesItem());
    return {
      type: "StylesDecl",
      items: items.filter((item): item is StylesItem => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseStylesItem(): StylesItem | null {
    if (this.matchKeyword("classes")) {
      const start = this.consumeKeyword("classes");
      this.consumePunct(":");
      const classes = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "StylesClasses",
        classes,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("spotlight")) {
      const start = this.consumeKeyword("spotlight");
      this.consumePunct(":");
      const spotlight = this.parseObjectExpr();
      this.consumePunct(";");
      return {
        type: "StylesSpotlight",
        spotlight,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("theme")) {
      const start = this.consumeKeyword("theme");
      this.consumePunct(":");
      const theme = this.parseName();
      this.consumePunct(";");
      return {
        type: "StylesTheme",
        theme,
        span: spanFrom(start!, this.previous())
      };
    }
    if (this.matchKeyword("meta")) {
      return this.parseMetaDecl();
    }
    return null;
  }

  private parseSceneDecl(): SceneDeclNode | null {
    const start = this.consumeKeyword("scene");
    if (!start) {
      return null;
    }
    const name = this.parseName();
    let diagram: NameValue | undefined;
    if (this.matchKeyword("diagram")) {
      this.consumeKeyword("diagram");
      diagram = this.parseName();
    }
    const { items, end } = this.parseBlock(() => this.parseSceneItem());
    return {
      type: "SceneDecl",
      name,
      diagram,
      items: items.filter((item): item is SceneItem => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseSceneItem(): SceneItem | null {
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "step":
          return this.parseStepDecl();
        case "binding":
          return this.parseBindingDecl();
        case "meta":
          return this.parseMetaDecl();
        case "let":
          return this.parseConstDecl();
        default:
          break;
      }
    }
    return null;
  }

  private parseStepDecl(): StepDeclNode | null {
    const start = this.consumeKeyword("step");
    if (!start) {
      return null;
    }
    const name = this.parseName();
    let alias: string | undefined;
    if (this.matchKeyword("as")) {
      this.consumeKeyword("as");
      const ident = this.consume("identifier");
      alias = ident?.value;
    }
    const { items, end } = this.parseBlock(() => this.parseStepStmt());
    return {
      type: "StepDecl",
      name,
      alias,
      statements: items.filter((item): item is StepStmt => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseStepStmt(): StepStmt | null {
    const token = this.peek();
    if (token.type === "keyword") {
      switch (token.value) {
        case "focus":
          return this.parseFocusStmt();
        case "do":
          return this.parseDoStmt();
        case "let":
          return this.parseLetStmt();
        case "assert":
          return this.parseAssertStmt();
        case "meta":
          return this.parseMetaDecl();
        default:
          break;
      }
    }
    return null;
  }

  private parseFocusStmt(): FocusStmtNode | null {
    const start = this.consumeKeyword("focus");
    if (!start) {
      return null;
    }
    const target = this.parseTargetExpr();
    const options: FocusOptions = {};
    while (true) {
      if (this.matchKeyword("pad")) {
        this.consumeKeyword("pad");
        const value = this.parseNumber();
        options.pad = value;
        continue;
      }
      if (this.matchKeyword("align")) {
        this.consumeKeyword("align");
        const alignToken = this.consume("keyword");
        options.align = (alignToken?.value ?? "center") as AlignOption;
        continue;
      }
      if (this.matchKeyword("lock")) {
        this.consumeKeyword("lock");
        const lockToken = this.consume("keyword");
        options.lock = (lockToken?.value ?? "none") as LockMode;
        continue;
      }
      if (this.matchKeyword("id")) {
        this.consumeKeyword("id");
        const ident = this.consume("identifier");
        if (ident) {
          options.id = ident.value;
        }
        continue;
      }
      break;
    }
    this.consumePunct(";");
    return {
      type: "FocusStmt",
      target: target ?? this.emptyTarget(start),
      options,
      span: spanFrom(start, this.previous())
    };
  }

  private parseDoStmt(): DoStmtNode | null {
    const start = this.consumeKeyword("do");
    if (!start) {
      return null;
    }
    const action = this.parseActionCall();
    this.consumePunct(";");
    return {
      type: "DoStmt",
      action: action ?? this.emptyAction(start),
      span: spanFrom(start, this.previous())
    };
  }

  private parseLetStmt(): LetStmtNode | null {
    const start = this.consumeKeyword("let");
    if (!start) {
      return null;
    }
    const name = this.consume("identifier");
    this.consumePunct("=");
    const value = this.parseExpr();
    this.consumePunct(";");
    return {
      type: "LetStmt",
      name: name?.value ?? "",
      value: value ?? this.emptyLiteral(start),
      span: spanFrom(start, this.previous())
    };
  }

  private parseAssertStmt(): AssertStmtNode | null {
    const start = this.consumeKeyword("assert");
    if (!start) {
      return null;
    }
    const condition = this.parseExpr();
    let message: string | undefined;
    if (this.matchKeyword("else")) {
      this.consumeKeyword("else");
      const messageToken = this.consume("string");
      message = messageToken?.value;
    }
    this.consumePunct(";");
    return {
      type: "AssertStmt",
      condition: condition ?? this.emptyLiteral(start),
      message,
      span: spanFrom(start, this.previous())
    };
  }

  private parseBindingDecl(): BindingDeclNode | null {
    const start = this.consumeKeyword("binding");
    if (!start) {
      return null;
    }
    let name: NameValue | undefined;
    if (this.peek().type === "identifier" || this.peek().type === "string") {
      name = this.parseName();
    }
    let priority: number | undefined;
    if (this.matchKeyword("priority")) {
      this.consumeKeyword("priority");
      const value = this.consume("int");
      priority = value ? Number(value.value) : undefined;
      this.consumePunct(";");
    }
    const { items, end } = this.parseBlock(() => this.parseBindingRule());
    return {
      type: "BindingDecl",
      name,
      priority,
      rules: items.filter((item): item is BindingRuleNode => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseBindingRule(): BindingRuleNode | null {
    const start = this.consumeKeyword("on");
    if (!start) {
      return null;
    }
    const event = this.parseEventSpec();
    let target: TargetExprNode | "any" | undefined;
    if (this.matchKeyword("target")) {
      this.consumeKeyword("target");
      if (this.matchKeyword("any")) {
        this.consumeKeyword("any");
        target = "any";
      } else {
        target = this.parseTargetExpr() ?? undefined;
      }
    }
    let when: Expr | undefined;
    if (this.matchKeyword("when")) {
      this.consumeKeyword("when");
      when = this.parseExpr() ?? undefined;
    }
    const { items, end } = this.parseBlock(() => this.parseBindingStmt());
    return {
      type: "BindingRule",
      event: event ?? this.emptyEvent(start),
      target,
      when,
      statements: items.filter((item): item is BindingStmt => item !== null),
      span: spanFrom(start, end)
    };
  }

  private parseBindingStmt(): BindingStmt | null {
    if (this.matchKeyword("do")) {
      return this.parseDoStmt();
    }
    if (this.matchKeyword("let")) {
      return this.parseLetStmt();
    }
    if (this.matchKeyword("assert")) {
      return this.parseAssertStmt();
    }
    return null;
  }

  private parseEventSpec(): EventSpecNode | null {
    const token = this.consume("keyword");
    if (!token) {
      return null;
    }
    if (token.value === "key") {
      const keyToken = this.consume("string");
      return {
        type: "EventSpec",
        kind: "key",
        value: keyToken?.value,
        span: spanFrom(token, this.previous())
      };
    }
    if (token.value === "timer") {
      const durationToken = this.consume("duration");
      return {
        type: "EventSpec",
        kind: "timer",
        value: durationToken ? parseDuration(durationToken.value) : undefined,
        span: spanFrom(token, this.previous())
      };
    }
    if (token.value === "custom") {
      const name = this.parseName();
      return {
        type: "EventSpec",
        kind: "custom",
        value: name.value,
        span: spanFrom(token, this.previous())
      };
    }
    return {
      type: "EventSpec",
      kind: token.value as EventSpecNode["kind"],
      span: spanFrom(token, token)
    };
  }

  private parseActionCall(): ActionCallNode | null {
    const start = this.peek();
    const name = this.parseQualifiedName();
    this.consumePunct("(");
    const args: ActionArg[] = [];
    if (!this.matchPunct(")")) {
      do {
        const arg = this.parseActionArg();
        if (arg) {
          args.push(arg);
        }
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct(")");
    return {
      type: "ActionCall",
      name,
      args,
      span: spanFrom(start, this.previous())
    };
  }

  private parseActionArg(): ActionArg | null {
    const start = this.peek();
    if (this.peek().type === "identifier" && this.peekNext().type === "punct" && this.peekNext().value === ":") {
      const key = this.consume("identifier");
      this.consumePunct(":");
      const value = this.parseExpr();
      return {
        type: "ActionArg",
        key: key?.value,
        value: value ?? this.emptyLiteral(start),
        span: spanFrom(start, this.previous())
      };
    }
    const value = this.parseExpr();
    return {
      type: "ActionArg",
      value: value ?? this.emptyLiteral(start),
      span: spanFrom(start, this.previous())
    };
  }

  private parseExpr(): Expr | null {
    return this.parseOrExpr();
  }

  private parseOrExpr(): Expr | null {
    let expr = this.parseAndExpr();
    while (this.matchKeyword("or")) {
      const operator = this.consumeKeyword("or")!;
      const right = this.parseAndExpr();
      expr = {
        type: "BinaryExpr",
        operator: "or",
        left: expr ?? this.emptyLiteral(operator),
        right: right ?? this.emptyLiteral(operator),
        span: spanFrom(operator, this.previous())
      };
    }
    return expr;
  }

  private parseAndExpr(): Expr | null {
    let expr = this.parseEqExpr();
    while (this.matchKeyword("and")) {
      const operator = this.consumeKeyword("and")!;
      const right = this.parseEqExpr();
      expr = {
        type: "BinaryExpr",
        operator: "and",
        left: expr ?? this.emptyLiteral(operator),
        right: right ?? this.emptyLiteral(operator),
        span: spanFrom(operator, this.previous())
      };
    }
    return expr;
  }

  private parseEqExpr(): Expr | null {
    let expr = this.parseRelExpr();
    while (this.matchOperator("==") || this.matchOperator("!=")) {
      const op = this.consume("operator")!;
      const right = this.parseRelExpr();
      expr = {
        type: "BinaryExpr",
        operator: op.value as BinaryExprNode["operator"],
        left: expr ?? this.emptyLiteral(op),
        right: right ?? this.emptyLiteral(op),
        span: spanFrom(op, this.previous())
      };
    }
    return expr;
  }

  private parseRelExpr(): Expr | null {
    let expr = this.parseAddExpr();
    while (this.matchOperator("<") || this.matchOperator("<=") || this.matchOperator(">") || this.matchOperator(">=")) {
      const op = this.consume("operator")!;
      const right = this.parseAddExpr();
      expr = {
        type: "BinaryExpr",
        operator: op.value as BinaryExprNode["operator"],
        left: expr ?? this.emptyLiteral(op),
        right: right ?? this.emptyLiteral(op),
        span: spanFrom(op, this.previous())
      };
    }
    return expr;
  }

  private parseAddExpr(): Expr | null {
    let expr = this.parseMulExpr();
    while (this.matchOperator("+") || this.matchOperator("-")) {
      const op = this.consume("operator")!;
      const right = this.parseMulExpr();
      expr = {
        type: "BinaryExpr",
        operator: op.value as BinaryExprNode["operator"],
        left: expr ?? this.emptyLiteral(op),
        right: right ?? this.emptyLiteral(op),
        span: spanFrom(op, this.previous())
      };
    }
    return expr;
  }

  private parseMulExpr(): Expr | null {
    let expr = this.parseUnaryExpr();
    while (this.matchOperator("*") || this.matchOperator("/") || this.matchOperator("%")) {
      const op = this.consume("operator")!;
      const right = this.parseUnaryExpr();
      expr = {
        type: "BinaryExpr",
        operator: op.value as BinaryExprNode["operator"],
        left: expr ?? this.emptyLiteral(op),
        right: right ?? this.emptyLiteral(op),
        span: spanFrom(op, this.previous())
      };
    }
    return expr;
  }

  private parseUnaryExpr(): Expr | null {
    if (this.matchOperator("!") || this.matchOperator("-")) {
      const operator = this.consume("operator")!;
      const argument = this.parseUnaryExpr();
      return {
        type: "UnaryExpr",
        operator: operator.value as UnaryExprNode["operator"],
        argument: argument ?? this.emptyLiteral(operator),
        span: spanFrom(operator, this.previous())
      };
    }
    return this.parsePrimaryExpr();
  }

  private parsePrimaryExpr(): Expr | null {
    const token = this.peek();
    if (token.type === "number" || token.type === "int" || token.type === "duration" || token.type === "percent" || token.type === "boolean" || token.type === "null" || token.type === "string" || token.type === "color") {
      this.advance();
      return this.literalFromToken(token);
    }
    if (token.type === "punct" && token.value === "{") {
      return this.parseObjectExpr();
    }
    if (token.type === "punct" && token.value === "[") {
      return this.parseArrayExpr();
    }
    if (token.type === "punct" && token.value === "(") {
      const start = this.consumePunct("(")!;
      const expr = this.parseExpr();
      this.consumePunct(")");
      return expr ? { ...expr, span: spanFrom(start, this.previous()) } : null;
    }
    if (token.type === "punct" && token.value === "$") {
      return this.parseVarRef();
    }
    if (this.isTargetKeyword(token)) {
      return this.parseTargetExpr();
    }
    if (token.type === "identifier") {
      return this.parseCallExpr();
    }
    return null;
  }

  private parseVarRef(): VarRefNode | null {
    const start = this.consumePunct("$");
    const path: string[] = [];
    const root = this.consume("identifier");
    if (root) {
      path.push(root.value);
    }
    while (this.matchPunct(".")) {
      this.consumePunct(".");
      const segment = this.consume("identifier");
      if (segment) {
        path.push(segment.value);
      }
    }
    return {
      type: "VarRef",
      path,
      span: spanFrom(start!, this.previous())
    };
  }

  private parseCallExpr(): CallExprNode | null {
    const start = this.peek();
    const name = this.consume("identifier");
    if (!name) {
      return null;
    }
    this.consumePunct("(");
    const args: ActionArg[] = [];
    if (!this.matchPunct(")")) {
      do {
        const arg = this.parseActionArg();
        if (arg) {
          args.push(arg);
        }
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct(")");
    return {
      type: "CallExpr",
      name: name.value,
      args,
      span: spanFrom(start, this.previous())
    };
  }

  private parseObjectExpr(): ObjectExprNode {
    const start = this.consumePunct("{")!;
    const entries: ObjectEntryNode[] = [];
    if (!this.matchPunct("}")) {
      do {
        const key = this.consume("identifier");
        if (!key) {
          break;
        }
        this.consumePunct(":");
        const value = this.parseExpr();
        entries.push({
          type: "ObjectEntry",
          key: key.value,
          value: value ?? this.emptyLiteral(key),
          span: spanFrom(key, this.previous())
        });
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct("}");
    return {
      type: "ObjectExpr",
      entries,
      span: spanFrom(start, this.previous())
    };
  }

  private parseArrayExpr(): ArrayExprNode {
    const start = this.consumePunct("[")!;
    const items: Expr[] = [];
    if (!this.matchPunct("]")) {
      do {
        const value = this.parseExpr();
        if (value) {
          items.push(value);
        }
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct("]");
    return {
      type: "ArrayExpr",
      items,
      span: spanFrom(start, this.previous())
    };
  }

  private parseTargetExpr(): TargetExprNode | null {
    const next = this.peek();
    if (!this.isTargetKeyword(next)) {
      this.error(next, "target expression");
      return null;
    }
    const token = this.consume("keyword");
    if (!token) {
      return null;
    }
    switch (token.value) {
      case "node":
        return this.parseTargetUnary(token, "TargetNode", () => this.parseNodeRef());
      case "edge":
        return this.parseTargetUnary(token, "TargetEdge", () => this.parseEdgeRef());
      case "subgraph":
        return this.parseTargetUnary(token, "TargetSubgraph", () => this.parseSubgraphRef());
      case "css":
        return this.parseTargetString(token, "TargetCss", "selector");
      case "id":
        return this.parseTargetString(token, "TargetId", "id");
      case "text":
        return this.parseTargetString(token, "TargetText", "text");
      case "group":
        return this.parseTargetList(token, "TargetGroup");
      case "union":
        return this.parseTargetList(token, "TargetUnion");
      case "intersect":
        return this.parseTargetList(token, "TargetIntersect");
      case "except":
        return this.parseTargetExcept(token);
      default:
        return null;
    }
  }

  private parseTargetUnary(
    start: Token,
    type: TargetExprNode["type"],
    parser: () => NodeRef | EdgeRef | SubgraphRef
  ): TargetExprNode {
    this.consumePunct("(");
    const ref = parser();
    this.consumePunct(")");
    return {
      type,
      ref,
      span: spanFrom(start, this.previous())
    } as TargetExprNode;
  }

  private parseTargetString(start: Token, type: TargetExprNode["type"], field: "selector" | "id" | "text"): TargetExprNode {
    this.consumePunct("(");
    const value = this.consume("string");
    this.consumePunct(")");
    return {
      type,
      [field]: value?.value ?? "",
      span: spanFrom(start, this.previous())
    } as TargetExprNode;
  }

  private parseTargetList(start: Token, type: TargetExprNode["type"]): TargetExprNode {
    this.consumePunct("(");
    const targets: TargetExprNode[] = [];
    if (!this.matchPunct(")")) {
      do {
        const target = this.parseTargetExpr();
        if (target) {
          targets.push(target);
        }
      } while (this.matchPunct(",") && this.advance());
    }
    this.consumePunct(")");
    const node: TargetGroupExpr | TargetUnionExpr | TargetIntersectExpr = {
      type: type as TargetGroupExpr["type"],
      targets,
      span: spanFrom(start, this.previous())
    };
    return node;
  }

  private parseTargetExcept(start: Token): TargetExceptExpr {
    this.consumePunct("(");
    const left = this.parseTargetExpr();
    this.consumePunct(",");
    const right = this.parseTargetExpr();
    this.consumePunct(")");
    return {
      type: "TargetExcept",
      left: left ?? this.emptyTarget(start),
      right: right ?? this.emptyTarget(start),
      span: spanFrom(start, this.previous())
    };
  }

  private parseNodeRef(): NodeRef {
    if (this.matchOperator("*")) {
      this.consume("operator");
      return "*";
    }
    if (this.peek().type === "string") {
      const str = this.consume("string");
      return this.makeName(str!);
    }
    const ident = this.consume("identifier");
    return ident ? this.makeName(ident) : "*";
  }

  private parseEdgeRef(): EdgeRef {
    const firstToken = this.peek();
    const from = this.parseNodeRef();
    if (this.matchPunct(",")) {
      this.consumePunct(",");
      const to = this.parseNodeRef();
      return { from, to } as EdgeTuple;
    }
    if (from === "*") {
      return {
        type: "Name",
        value: "*",
        kind: "identifier",
        span: spanFrom(firstToken, this.previous())
      };
    }
    return from as NameValue;
  }

  private parseSubgraphRef(): SubgraphRef {
    if (this.matchOperator("*")) {
      this.consume("operator");
      return "*";
    }
    if (this.peek().type === "string") {
      const str = this.consume("string");
      return this.makeName(str!);
    }
    const ident = this.consume("identifier");
    return ident ? this.makeName(ident) : "*";
  }

  private parseQualifiedName(): string {
    const parts: string[] = [];
    const first = this.consumeNamePart();
    if (first) {
      parts.push(first.value);
    }
    while (this.matchPunct(".")) {
      this.consumePunct(".");
      const next = this.consumeNamePart();
      if (next) {
        parts.push(next.value);
      }
    }
    return parts.join(".");
  }

  private consumeNamePart(): Token | null {
    const token = this.peek();
    if (token.type === "identifier" || token.type === "keyword") {
      return this.advance();
    }
    this.error(token, "identifier");
    return null;
  }

  private parseName(): NameValue {
    const token = this.peek();
    if (token.type === "string") {
      this.advance();
      return {
        type: "Name",
        value: token.value,
        kind: "string",
        span: spanFrom(token, token)
      };
    }
    const ident = this.consume("identifier");
    return {
      type: "Name",
      value: ident?.value ?? "",
      kind: "identifier",
      span: spanFrom(ident ?? token, this.previous())
    };
  }

  private parseOptionalName(): NameValue | null {
    const token = this.peek();
    if (token.type === "identifier" || token.type === "string") {
      return this.parseName();
    }
    return null;
  }

  private parseNumber(): number {
    const token = this.consume("number") ?? this.consume("int");
    return token ? Number(token.value) : 0;
  }

  private parseBoolean(): boolean {
    const token = this.consume("boolean");
    return token ? token.value === "true" : false;
  }

  private parseVersion(): { value: string; end: Token } | null {
    const start = this.consume("number") ?? this.consume("int");
    if (!start) {
      return null;
    }
    const parts = [start.value];
    while (this.matchPunct(".")) {
      this.consumePunct(".");
      const part = this.consume("number") ?? this.consume("int");
      if (!part) {
        break;
      }
      parts.push(part.value);
    }
    return { value: parts.join("."), end: this.previous() };
  }

  private parseBlock<T>(parser: () => T | null): { items: T[]; end: Token } {
    const items: T[] = [];
    const start = this.consumePunct("{");
    while (!this.isAtEnd() && !this.matchPunct("}")) {
      const item = parser();
      if (item) {
        items.push(item);
      } else {
        this.advance();
      }
    }
    const end = this.consumePunct("}") ?? this.previous();
    return { items, end: end ?? start! };
  }

  private literalFromToken(token: Token): LiteralExprNode {
    const raw = token.value;
    if (token.type === "boolean") {
      return {
        type: "Literal",
        literalType: "boolean",
        value: token.value === "true",
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "null") {
      return {
        type: "Literal",
        literalType: "null",
        value: null,
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "string") {
      return {
        type: "Literal",
        literalType: "string",
        value: token.value,
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "color") {
      return {
        type: "Literal",
        literalType: "color",
        value: token.value,
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "duration") {
      return {
        type: "Literal",
        literalType: "duration",
        value: parseDuration(token.value),
        raw,
        span: spanFrom(token, token)
      };
    }
    if (token.type === "percent") {
      return {
        type: "Literal",
        literalType: "percent",
        value: Number(token.value.replace("%", "")),
        raw,
        span: spanFrom(token, token)
      };
    }
    return {
      type: "Literal",
      literalType: token.type === "int" ? "int" : "number",
      value: Number(token.value),
      raw,
      span: spanFrom(token, token)
    };
  }

  private emptyLiteral(token: Token): LiteralExprNode {
    return {
      type: "Literal",
      literalType: "null",
      value: null,
      raw: "null",
      span: spanFrom(token, token)
    };
  }

  private emptyTarget(token: Token): TargetExprNode {
    return {
      type: "TargetNode",
      ref: "*",
      span: spanFrom(token, token)
    };
  }

  private emptyAction(token: Token): ActionCallNode {
    return {
      type: "ActionCall",
      name: "",
      args: [],
      span: spanFrom(token, token)
    };
  }

  private emptyEvent(token: Token): EventSpecNode {
    return {
      type: "EventSpec",
      kind: "click",
      span: spanFrom(token, token)
    };
  }

  private makeName(token: Token): NameValue {
    return {
      type: "Name",
      value: token.value,
      kind: token.type === "string" ? "string" : "identifier",
      span: spanFrom(token, token)
    };
  }

  private isTargetKeyword(token: Token): boolean {
    return token.type === "keyword" && ["node", "edge", "subgraph", "css", "id", "text", "group", "union", "intersect", "except"].includes(token.value);
  }

  private matchKeyword(value: string): boolean {
    const token = this.peek();
    return token.type === "keyword" && token.value === value;
  }

  private matchOperator(value: string): boolean {
    const token = this.peek();
    return token.type === "operator" && token.value === value;
  }

  private matchPunct(value: string): boolean {
    const token = this.peek();
    return token.type === "punct" && token.value === value;
  }

  private consumeKeyword(value: string): Token | null {
    const token = this.peek();
    if (token.type === "keyword" && token.value === value) {
      return this.advance();
    }
    this.error(token, `keyword '${value}'`);
    return null;
  }

  private consumePunct(value: string): Token | null {
    const token = this.peek();
    if (token.type === "punct" && token.value === value) {
      return this.advance();
    }
    this.error(token, `symbol '${value}'`);
    return null;
  }

  private consume(type: Token["type"]): Token | null {
    const token = this.peek();
    if (token.type === type) {
      return this.advance();
    }
    this.error(token, type);
    return null;
  }

  private error(token: Token, expected: string): void {
    if (token.type === "eof") {
      this.diagnostics.push({
        message: `Unexpected end of input, expected ${expected}.`,
        severity: "error",
        span: spanFrom(token, token),
        code: "parse/unexpected-eof"
      });
      return;
    }
    this.diagnostics.push({
      message: `Unexpected '${token.image || token.value}', expected ${expected}.`,
      severity: "error",
      span: spanFrom(token, token),
      code: "parse/unexpected-token"
    });
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.index += 1;
    }
    return this.tokens[this.index - 1];
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private peekNext(): Token {
    return this.tokens[this.index + 1];
  }

  private previous(): Token {
    return this.tokens[Math.max(0, this.index - 1)];
  }

  private isAtEnd(): boolean {
    return this.peek().type === "eof";
  }
}

function spanFrom(start: Token, end: Token): SourceSpan {
  return {
    start: start.start,
    end: end.end
  };
}

function parseDuration(value: string): number {
  if (value.endsWith("ms")) {
    return Number(value.replace("ms", ""));
  }
  if (value.endsWith("s")) {
    return Number(value.replace("s", "")) * 1000;
  }
  if (value.endsWith("m")) {
    return Number(value.replace("m", "")) * 60000;
  }
  return Number(value);
}

function validateAST(ast: ProgramNode): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (ast.version !== SUPPORTED_VERSION && ast.version !== "1") {
    diagnostics.push({
      message: `MPD version '${ast.version}' differs from supported version ${SUPPORTED_VERSION}.`,
      severity: "warning",
      span: ast.span,
      code: "validate/version-mismatch"
    });
  }

  for (const item of ast.body) {
    if (item.type === "SceneDecl") {
      const seen = new Set<string>();
      for (const stmt of item.items) {
        if (stmt.type === "StepDecl") {
          const name = stmt.name.value;
          if (seen.has(name)) {
            diagnostics.push({
              message: `Duplicate step name '${name}' in scene '${item.name.value}'.`,
              severity: "error",
              span: stmt.span,
              code: "validate/duplicate-step"
            });
          } else {
            seen.add(name);
          }
        }
      }
    }
    if (item.type === "UnknownBlock") {
      diagnostics.push({
        message: `Unknown block '${item.name}'.`,
        severity: "warning",
        span: item.span,
        code: "validate/unknown-block"
      });
    }
  }

  const visitExpr = (expr: Expr): void => {
    switch (expr.type) {
      case "TargetEdge": {
        const ref = expr.ref as EdgeTuple;
        if (typeof ref === "object" && (ref.from === "*" || ref.to === "*")) {
          diagnostics.push({
            message: "Edge target cannot use '*' in edge tuple.",
            severity: "error",
            span: expr.span,
            code: "validate/malformed-target"
          });
        }
        break;
      }
      case "TargetCss":
      case "TargetId":
      case "TargetText": {
        const value = (expr as { selector?: string; id?: string; text?: string }).selector ?? (expr as { id?: string }).id ?? (expr as { text?: string }).text ?? "";
        if (!value) {
          diagnostics.push({
            message: "Target string cannot be empty.",
            severity: "error",
            span: expr.span,
            code: "validate/malformed-target"
          });
        }
        break;
      }
      case "TargetGroup":
      case "TargetUnion":
      case "TargetIntersect":
        expr.targets.forEach(visitExpr);
        break;
      case "TargetExcept":
        visitExpr(expr.left);
        visitExpr(expr.right);
        break;
      case "BinaryExpr":
        visitExpr(expr.left);
        visitExpr(expr.right);
        break;
      case "UnaryExpr":
        visitExpr(expr.argument);
        break;
      case "ObjectExpr":
        expr.entries.forEach((entry) => visitExpr(entry.value));
        break;
      case "ArrayExpr":
        expr.items.forEach(visitExpr);
        break;
      case "CallExpr":
        expr.args.forEach((arg) => visitExpr(arg.value));
        break;
      case "Literal":
      case "VarRef":
      case "TargetNode":
      case "TargetSubgraph":
        break;
      default:
        break;
    }
  };

  const visitNode = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }
    const typed = node as { type?: string };
    switch (typed.type) {
      case "StepDecl": {
        const step = node as StepDeclNode;
        step.statements.forEach(visitNode);
        break;
      }
      case "FocusStmt":
        visitExpr((node as FocusStmtNode).target);
        break;
      case "LetStmt":
        visitExpr((node as LetStmtNode).value);
        break;
      case "AssertStmt":
        visitExpr((node as AssertStmtNode).condition);
        break;
      case "DoStmt":
        (node as DoStmtNode).action.args.forEach((arg) => visitExpr(arg.value));
        break;
      case "BindingDecl":
        (node as BindingDeclNode).rules.forEach(visitNode);
        break;
      case "BindingRule": {
        const rule = node as BindingRuleNode;
        if (rule.when) {
          visitExpr(rule.when);
        }
        rule.statements.forEach(visitNode);
        break;
      }
      case "ConstDecl":
        visitExpr((node as ConstDeclNode).value);
        break;
      case "MetaDecl":
        (node as MetaDeclNode).entries.forEach((entry) => visitExpr(entry.value));
        break;
      default:
        break;
    }
  };

  ast.body.forEach(visitNode);

  return diagnostics;
}
