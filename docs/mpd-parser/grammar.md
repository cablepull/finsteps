# MPD Grammar Summary

This document provides implementation details for the MPD parser. For a complete grammar reference with examples, see the [main grammar documentation](../grammar.md). The formal EBNF grammar is available in [../ebnf/mpd.ebnf](../ebnf/mpd.ebnf).

This package implements the MPD DSL described in `docs/ebnf/mpd.ebnf` with a focus on the core constructs that drive diagrams, runtime settings, scenes, and bindings. The parser recognizes:

- **Program header**: `mpd <version>`
- **Top-level blocks**:
  - `deck { ... }`
  - `diagram <id> { mermaid <<<TAG ... TAG>>>; config { ... }; assets { ... }; }`
  - `runtime { camera { ... } overlay { ... } navigation { ... } performance { ... }; }`
  - `selectors { strategy: ...; fallback: [...]; node: {...}; edge: {...}; subgraph: {...}; }`
  - `styles { classes: {...}; spotlight: {...}; theme: <name>; }`
  - `scene <name> (diagram <id>)? { step <name> { ... } }`
  - `binding <name>? (priority <int>;)? { on <event> ... { ... } }`
  - `meta { key: value, ... }`
  - `let <name> = <expr>;`
  - `use <plugin> { ... };`

## Expressions

Expressions support logical, equality, relational, additive, and multiplicative operators plus literals, arrays, objects, variable references, function calls, and target expressions.

## Target Expressions

Target expressions map logical selectors to diagram elements:

- `node(<ref>)`
- `edge(<ref>)`
- `subgraph(<ref>)`
- `css(".selector")`
- `id("element-id")`
- `text("label")`
- `group(...)`, `union(...)`, `intersect(...)`, `except(a, b)`

## Diagnostics

Diagnostics cover:

- Syntax errors (unexpected tokens, missing delimiters)
- Unknown blocks (parsed but flagged as warnings)
- Malformed target expressions (e.g., `edge(A, *)`)
- Duplicate step names in a scene
- Version mismatch warnings

## Related Documentation

- [Grammar Documentation](../grammar.md) - Complete grammar reference with examples
- [EBNF Grammar](../ebnf/mpd.ebnf) - Formal grammar specification
- [JSON Schema](../schema/mpd.json) - Machine-readable ParseResult schema
- [Parser Compatibility Contract](compatibility-contract.md) - AST structure documentation
