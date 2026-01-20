# ADR 0007: MPD Space-Separated Action Syntax

**Date:** 2026-01-19

**Status:** Accepted

## Context

The MPD (Mermaid Presentation DSL) parser was failing to parse presentations with multiple steps when those steps contained action calls with complex arguments. Specifically:

1. **Import file issue**: When users imported presentations exported from the editor, only 1 step would be parsed despite the MPD containing 8 steps
2. **Editor generation issue**: The editor's "Generate Starter DSL" feature would create MPD with action calls like `camera reset()` and `overlay bubble(...)`, but the parser would fail to parse them
3. **Syntax mismatch**: The old MPD syntax used `do camera.reset()` (with `do` keyword and dot notation), but the new syntax dropped the `do` keyword and uses space-separated notation: `camera reset()`

### Example of failing MPD

```mpd
mpd 1.0

deck {
  scene default {
    step overview {
      camera reset()
      overlay bubble(target: {"dataId":"A"}, text: "Full view")
    }
    step a {
      camera fit(target: {"dataId":"A"}, padding: 60)
    }
  }
}
```

This MPD would only parse the first step (`overview`) and fail silently on subsequent steps.

## Root Causes

The parser had three distinct bugs that prevented it from parsing the new space-separated action syntax:

### 1. Missing support for bare action calls in `parseStepStmt()`

**Location:** `/src/parser.ts` line 818

**Issue:** The `parseStepStmt()` function only recognized specific keywords (`focus`, `do`, `let`, `assert`, `meta`) as valid statement starts. When it encountered an identifier or keyword that wasn't in this list (like `camera`), it returned `null`, causing the `parseBlock()` function to advance by one token and lose synchronization.

**Example:**
- Token stream: `camera reset ( )`
- `parseStepStmt()` sees `camera` (keyword), not in the allowed list
- Returns `null`
- `parseBlock()` advances by one token, consuming `camera`
- Next iteration sees `reset` and tries to parse from there, creating incomplete action

### 2. Action names not supporting space separation

**Location:** `/src/parser.ts` line 1038-1120

**Issue:** The `parseActionCall()` function used `parseQualifiedName()` which only parses dot-separated names (e.g., `camera.reset`). It didn't support space-separated names (e.g., `camera reset`).

**Example:**
- Old syntax: `do camera.reset()` → name = "camera.reset"
- New syntax: `camera reset()` → name = "reset" (missing "camera" prefix!)

### 3. Named arguments requiring identifiers

**Location:** `/src/parser.ts` line 1125

**Issue:** The `parseActionArg()` function only allowed identifiers as argument names with the check `if (this.peek().type === "identifier")`. However, many argument names are keywords in the MPD language (e.g., `target`, `text`, `padding`, `duration`), causing the parser to fail when encountering them.

**Example:**
- `overlay bubble(target: {...})` would fail because `target` is a keyword, not an identifier

### 4. Object keys requiring identifiers

**Location:** `/src/parser.ts` line 1342

**Issue:** The `parseObjectExpr()` function only accepted identifiers as object keys with `const key = this.consume("identifier")`. This prevented parsing JSON-style objects with quoted string keys like `{"dataId": "A"}`.

**Example:**
- `{"dataId": "A"}` would fail because `"dataId"` is a string, not an identifier

## Decision

We updated the parser to support the new space-separated action syntax while maintaining backward compatibility with the old dot-separated syntax:

### 1. Support bare action calls in step statements

**Changed:** `/src/parser.ts` line 816-833

Added support for parsing action calls that start with identifiers or keywords (except for the statement keywords that have their own parsers):

```typescript
// Support bare action calls without "do" keyword (new syntax)
// e.g., "camera reset()" instead of "do camera.reset()"
// Note: Action calls can start with keywords (like "camera") or identifiers
if (token.type === "identifier" || token.type === "keyword") {
  // Don't consume keywords that are step statement keywords
  if (token.type === "keyword" && (token.value === "focus" || token.value === "let" || token.value === "assert" || token.value === "meta")) {
    return null;
  }
  const action = this.parseActionCall();
  if (action) {
    return {
      type: "DoStmt",
      action,
      span: action.span
    };
  }
}
```

### 2. Parse space-separated action names

**Changed:** `/src/parser.ts` line 1038-1120

Updated `parseActionCall()` to parse both dot-separated (old) and space-separated (new) action names:

```typescript
// Parse first part (required)
const firstPart = this.consumeNamePart();
if (!firstPart) {
  return null;
}
nameParts.push(firstPart.value);

// Parse additional parts separated by dots or spaces
while (!this.isAtEnd()) {
  // Handle dot-separated names (old syntax: camera.reset)
  if (this.matchPunct(".")) {
    this.consumePunct(".");
    const part = this.consumeNamePart();
    if (part) {
      nameParts.push(part.value);
    }
    continue;
  }

  // Handle space-separated names (new syntax: camera reset)
  const token = this.peek();
  if (token.type === "identifier" || token.type === "keyword") {
    const nextToken = this.peekNext();
    // If next token is "(", this is the last part of the name
    if (nextToken.type === "punct" && nextToken.value === "(") {
      const part = this.consumeNamePart();
      if (part) {
        nameParts.push(part.value);
      }
      break;
    }
    // Otherwise, continue consuming name parts
    const part = this.consumeNamePart();
    if (part) {
      nameParts.push(part.value);
    }
    continue;
  }

  break;
}

// Join parts with spaces for new syntax
return {
  type: "ActionCall",
  name: nameParts.join(" "),
  args,
  span: spanFrom(start, this.previous())
};
```

### 3. Allow keywords as argument names

**Changed:** `/src/parser.ts` line 1123-1135

Updated `parseActionArg()` to accept both identifiers and keywords as argument names:

```typescript
// Allow both identifiers and keywords as argument names (e.g., target:, text:, padding:)
const token = this.peek();
if ((token.type === "identifier" || token.type === "keyword") && this.peekNext().type === "punct" && this.peekNext().value === ":") {
  // Consume the key (identifier or keyword)
  const key = this.advance();
  this.consumePunct(":");
  const value = this.parseExpr();
  return {
    type: "ActionArg",
    key: key?.value,
    value: value ?? this.emptyLiteral(start),
    span: spanFrom(start, this.previous())
  };
}
```

### 4. Allow string and keyword keys in objects

**Changed:** `/src/parser.ts` line 1337-1361

Updated `parseObjectExpr()` to accept identifiers, keywords, and quoted strings as object keys:

```typescript
// Allow both identifiers and strings as object keys (for JSON compatibility)
const token = this.peek();
const key = (token.type === "identifier" || token.type === "keyword") ? this.advance() : this.consume("string");
if (!key) {
  break;
}
this.consumePunct(":");
const value = this.parseExpr();
// For string keys, remove the quotes
const keyValue = key.type === "string" ? key.value.slice(1, -1) : key.value;
entries.push({
  type: "ObjectEntry",
  key: keyValue,
  value: value ?? this.emptyLiteral(key),
  span: spanFrom(key, this.previous())
});
```

## Consequences

### Positive

1. **Backward Compatibility**: The parser still supports the old dot-separated syntax with `do` keyword:
   - `do camera.reset()` continues to work
   - `do camera.fit(pad: 10)` continues to work

2. **Forward Compatibility**: The parser now supports the new space-separated syntax:
   - `camera reset()` works
   - `camera fit(target: {"dataId":"A"}, padding: 60)` works
   - `overlay bubble(target: {"dataId":"A"}, text: "Full view")` works

3. **Editor Integration**: The editor's generated MPD now parses correctly, allowing users to:
   - Generate starter DSL from Mermaid diagrams
   - Export presentations
   - Import previously exported presentations
   - Navigate through all presentation steps

4. **JSON Compatibility**: Object literals now support both MPD-style (`{theme: "dark"}`) and JSON-style (`{"dataId": "A"}`) syntax

5. **Error Recovery**: The parser no longer silently fails when encountering unknown tokens in step bodies. While the `parseBlock()` function's error recovery (`else { this.advance(); }`) remains, the expanded syntax support means fewer cases trigger this fallback.

### Negative

1. **Ambiguity**: Space-separated action names could theoretically conflict with future keywords. For example, if `camera` and `reset` were both keywords and we later wanted to add a `reset` keyword at the statement level, there could be ambiguity. However, this is unlikely given the current MPD grammar design.

2. **Parser Complexity**: The `parseActionCall()` function is now more complex, handling both dot-separated and space-separated names. This increases cognitive load when maintaining the parser.

3. **Test Maintenance**: The snapshot test for the parser needed to be updated to reflect the correct AST structure. The old snapshot was actually capturing incorrect parsing (empty object entries), so this is ultimately a positive change, but it does require test updates.

## Alternatives Considered

1. **Add better error recovery to `parseBlock()`**: Instead of fixing the syntax support, we could have improved the error recovery mechanism in `parseBlock()` to skip to the next statement boundary. However, this would have been a workaround rather than fixing the root cause.

2. **Require `do` keyword for all actions**: We could have enforced the old syntax and required the `do` keyword for all action calls. This would have been simpler but would break the editor's generated MPD and require updating all examples and documentation.

3. **Use a different separator**: We could have used a different separator instead of spaces (e.g., `::`  like `camera::reset()`). However, spaces are more natural and align with other DSL syntaxes.

## Implementation Notes

- All unit tests pass with the updated parser
- The parser snapshot test was updated to reflect the correct AST structure
- Import/export functionality in the editor now works correctly with multi-step presentations
- No breaking changes to the MPD language specification

## Related

- Issue reported by user: "Here is an import. I can not step through the diagram when loading the file."
- Editor code at `examples/editor/editor.js` line 496-497 that converts dot notation to space notation
- Parser test at `tests/parser.test.ts` showing old `do camera.fit()` syntax still works
