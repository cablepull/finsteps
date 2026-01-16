# MPD Parser Compatibility Contract

This document defines the stable AST schema returned by `parseMPD`.

## Parse Result

```ts
interface ParseResult {
  ast: ProgramNode | null;
  diagnostics: Diagnostic[];
}
```

- `ast` is `null` when parsing fails fatally.
- `diagnostics` includes syntax and semantic diagnostics with spans.

## AST Overview

All nodes include a `type` discriminator and a `span` with start/end offsets and line/column positions.

```ts
interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

interface SourceSpan {
  start: SourcePosition;
  end: SourcePosition;
}
```

### Program

```ts
interface ProgramNode {
  type: "Program";
  version: string;
  body: TopLevelItem[];
  span: SourceSpan;
}
```

### Top-level Items

`TopLevelItem` includes:

- `Deck`
- `DiagramDecl`
- `RuntimeDecl`
- `SelectorsDecl`
- `StylesDecl`
- `ConstDecl`
- `SceneDecl`
- `BindingDecl`
- `PluginDecl`
- `MetaDecl`
- `UnknownBlock`

### Scene + Step

```ts
interface SceneDeclNode {
  type: "SceneDecl";
  name: NameValue;
  diagram?: NameValue;
  items: SceneItem[];
  span: SourceSpan;
}

interface StepDeclNode {
  type: "StepDecl";
  name: NameValue;
  alias?: string;
  statements: StepStmt[];
  span: SourceSpan;
}
```

### Expressions

The expression tree includes literals, variables, objects, arrays, unary/binary expressions, function calls, and target expressions.

### Diagnostics

```ts
interface Diagnostic {
  message: string;
  severity: "error" | "warning";
  span?: SourceSpan;
  code?: string;
}
```

### Stability

- Node `type` strings are stable.
- Existing node fields are stable; new optional fields may be added.
- Diagnostic codes are stable for existing validation paths.
