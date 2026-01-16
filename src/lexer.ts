import { Diagnostic, SourcePosition, SourceSpan } from "./ast";

export type TokenType =
  | "keyword"
  | "identifier"
  | "string"
  | "number"
  | "int"
  | "duration"
  | "percent"
  | "boolean"
  | "null"
  | "color"
  | "operator"
  | "punct"
  | "heredoc"
  | "eof";

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

const keywords = new Set([
  "mpd",
  "deck",
  "meta",
  "let",
  "use",
  "diagram",
  "mermaid",
  "config",
  "assets",
  "runtime",
  "camera",
  "overlay",
  "navigation",
  "performance",
  "selectors",
  "styles",
  "scene",
  "step",
  "as",
  "focus",
  "pad",
  "align",
  "lock",
  "id",
  "do",
  "assert",
  "else",
  "binding",
  "priority",
  "on",
  "target",
  "when",
  "node",
  "edge",
  "subgraph",
  "css",
  "text",
  "group",
  "union",
  "intersect",
  "except",
  "true",
  "false",
  "null",
  "or",
  "and",
  "viewport",
  "container",
  "svg",
  "engine",
  "options",
  "bounds",
  "strategy",
  "fallback",
  "classes",
  "spotlight",
  "theme",
  "keys",
  "wheelZoom",
  "dragPan",
  "tapToAdvance",
  "progressUI",
  "startAt",
  "click",
  "dblclick",
  "hover",
  "mouseenter",
  "mouseleave",
  "wheel",
  "scroll",
  "key",
  "timer",
  "custom",
  "any"
]);

const operators = new Set(["==", "!=", "<=", ">=", "<", ">", "+", "-", "*", "/", "%", "!"]);
const punctuators = new Set(["{", "}", "(", ")", "[", "]", ":", ";", ",", ".", "=", "$"]);

const numberPattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)/;
const intPattern = /^\d+/;
const identPattern = /^[A-Za-z_][A-Za-z0-9_-]*/;
const colorPattern = /^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?/;

function advancePosition(position: SourcePosition, text: string): SourcePosition {
  let { line, column, offset } = position;
  for (const char of text) {
    offset += 1;
    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column, offset };
}

function makeSpan(start: SourcePosition, end: SourcePosition): SourceSpan {
  return { start, end };
}

export function lexMPD(source: string): LexResult {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let position: SourcePosition = { offset: 0, line: 1, column: 1 };
  let index = 0;

  const pushToken = (type: TokenType, value: string, image: string, start: SourcePosition, end: SourcePosition, heredoc?: Token["heredoc"]): void => {
    tokens.push({ type, value, start, end, image, heredoc });
  };

  while (index < source.length) {
    const char = source[index];

    if (char === " " || char === "\t" || char === "\r" || char === "\n") {
      const match = /^[ \t\r\n]+/.exec(source.slice(index));
      if (match) {
        const image = match[0];
        const start = position;
        position = advancePosition(position, image);
        index += image.length;
        continue;
      }
    }

    if (char === "#" || (char === "/" && source[index + 1] === "/")) {
      const match = /^(#|\/\/)[^\n\r]*/.exec(source.slice(index));
      if (match) {
        const image = match[0];
        const start = position;
        position = advancePosition(position, image);
        index += image.length;
        continue;
      }
    }

    if (source.startsWith("<<<", index)) {
      const heredoc = scanHeredoc(source, index);
      if (heredoc) {
        const { image, tag, body } = heredoc;
        const start = position;
        const end = advancePosition(position, image);
        pushToken("heredoc", image, image, start, end, { tag, body });
        position = end;
        index += image.length;
        continue;
      }
    }

    if (char === '"' || char === "'") {
      const { image, value } = scanString(source, index, position, diagnostics);
      const start = position;
      const end = advancePosition(position, image);
      pushToken("string", value, image, start, end);
      position = end;
      index += image.length;
      continue;
    }

    if (char === "#") {
      const match = colorPattern.exec(source.slice(index));
      if (match) {
        const image = match[0];
        const start = position;
        const end = advancePosition(position, image);
        pushToken("color", image, image, start, end);
        position = end;
        index += image.length;
        continue;
      }
    }

    const numberMatch = numberPattern.exec(source.slice(index));
    if (numberMatch) {
      const image = numberMatch[0];
      const next = source.slice(index + image.length);
      const durationMatch = /^(ms|s|m)/.exec(next);
      if (durationMatch) {
        const full = image + durationMatch[0];
        const start = position;
        const end = advancePosition(position, full);
        pushToken("duration", full, full, start, end);
        position = end;
        index += full.length;
        continue;
      }
      if (next.startsWith("%")) {
        const full = `${image}%`;
        const start = position;
        const end = advancePosition(position, full);
        pushToken("percent", full, full, start, end);
        position = end;
        index += full.length;
        continue;
      }
      const start = position;
      const end = advancePosition(position, image);
      pushToken("number", image, image, start, end);
      position = end;
      index += image.length;
      continue;
    }

    const intMatch = intPattern.exec(source.slice(index));
    if (intMatch) {
      const image = intMatch[0];
      const start = position;
      const end = advancePosition(position, image);
      pushToken("int", image, image, start, end);
      position = end;
      index += image.length;
      continue;
    }

    const identMatch = identPattern.exec(source.slice(index));
    if (identMatch) {
      const image = identMatch[0];
      const start = position;
      const end = advancePosition(position, image);
      if (image === "true" || image === "false") {
        pushToken("boolean", image, image, start, end);
      } else if (image === "null") {
        pushToken("null", image, image, start, end);
      } else if (keywords.has(image)) {
        pushToken("keyword", image, image, start, end);
      } else {
        pushToken("identifier", image, image, start, end);
      }
      position = end;
      index += image.length;
      continue;
    }

    const twoChar = source.slice(index, index + 2);
    if (operators.has(twoChar)) {
      const start = position;
      const end = advancePosition(position, twoChar);
      pushToken("operator", twoChar, twoChar, start, end);
      position = end;
      index += twoChar.length;
      continue;
    }

    if (operators.has(char)) {
      const start = position;
      const end = advancePosition(position, char);
      pushToken("operator", char, char, start, end);
      position = end;
      index += 1;
      continue;
    }

    if (punctuators.has(char)) {
      const start = position;
      const end = advancePosition(position, char);
      pushToken("punct", char, char, start, end);
      position = end;
      index += 1;
      continue;
    }

    diagnostics.push({
      message: `Unexpected character '${char}'.`,
      severity: "error",
      span: makeSpan(position, advancePosition(position, char)),
      code: "lex/unexpected-character"
    });
    position = advancePosition(position, char);
    index += 1;
  }

  tokens.push({
    type: "eof",
    value: "<eof>",
    start: position,
    end: position,
    image: ""
  });

  return { tokens, diagnostics };
}

function scanString(
  source: string,
  startIndex: number,
  start: SourcePosition,
  diagnostics: Diagnostic[]
): { image: string; value: string } {
  const quote = source[startIndex];
  let index = startIndex + 1;
  let value = "";
  while (index < source.length) {
    const char = source[index];
    if (char === quote) {
      const image = source.slice(startIndex, index + 1);
      return { image, value };
    }
    if (char === "\\") {
      const next = source[index + 1];
      if (next === "n") {
        value += "\n";
        index += 2;
        continue;
      }
      if (next === "t") {
        value += "\t";
        index += 2;
        continue;
      }
      if (next === "r") {
        value += "\r";
        index += 2;
        continue;
      }
      if (next === quote) {
        value += quote;
        index += 2;
        continue;
      }
      value += next ?? "";
      index += 2;
      continue;
    }
    value += char;
    index += 1;
  }
  const image = source.slice(startIndex, index);
  diagnostics.push({
    message: "Unterminated string literal.",
    severity: "error",
    span: { start, end: advancePosition(start, image) },
    code: "lex/unterminated-string"
  });
  return { image, value };
}

function scanHeredoc(source: string, startIndex: number): { image: string; tag: string; body: string } | null {
  const identMatch = identPattern.exec(source.slice(startIndex + 3));
  if (!identMatch) {
    return null;
  }
  const tag = identMatch[0];
  const afterTagIndex = startIndex + 3 + tag.length;
  const lineBreak = source[afterTagIndex];
  if (lineBreak !== "\n") {
    return null;
  }
  const endMarker = `\n${tag}>>>`;
  const endIndex = source.indexOf(endMarker, afterTagIndex + 1);
  if (endIndex === -1) {
    return null;
  }
  const image = source.slice(startIndex, endIndex + endMarker.length);
  const body = source.slice(afterTagIndex + 1, endIndex);
  return { image, tag, body };
}
