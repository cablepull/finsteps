import { Diagnostic } from "./ast";

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  if (!diagnostics.length) {
    return "No diagnostics.";
  }
  return diagnostics
    .map((diag) => {
      const location = diag.span
        ? `(${diag.span.start.line}:${diag.span.start.column})`
        : "";
      const code = diag.code ? ` [${diag.code}]` : "";
      return `${diag.severity.toUpperCase()}: ${diag.message} ${location}${code}`.trim();
    })
    .join("\n");
}
