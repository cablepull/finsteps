import { describe, expect, it } from "vitest";
import { parseMPD } from "../src/index";

const sample = `mpd 1.0

meta { title: "Demo", }

use "svg-pan-zoom" { enabled: true };

mystery { foo: 1 }

diagram main {
  mermaid <<<SRC
graph TD
  A --> B
SRC>>>;
  config { theme: "dark" };
}

scene "Intro" diagram main {
  step "Start" as start {
    focus node(A) pad 8 align center lock none;
    do camera.fit(pad: 10);
    let count = 2;
    assert count > 1 else "too low";
  }
}
`;

describe("parseMPD", () => {
  it("parses a program into an AST snapshot", () => {
    const result = parseMPD(sample);
    expect(result.ast).toMatchSnapshot();
  });

  it("reports syntax errors with spans", () => {
    const result = parseMPD("mpd 1.0 scene s { step one { focus node(A) } }");
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].message).toContain("expected symbol ';'");
    expect(result.diagnostics[0].span?.start.line).toBe(1);
  });

  it("reports semantic diagnostics", () => {
    const source = `mpd 2.1
scene main {
  step "one" { focus edge(A, *); }
  step "one" { focus text(""); }
}
`;
    const result = parseMPD(source);
    const codes = result.diagnostics.map((diag) => diag.code);
    expect(codes).toContain("validate/version-mismatch");
    expect(codes).toContain("validate/duplicate-step");
    expect(codes).toContain("validate/malformed-target");
  });

  it("parses 500 lines under 50ms", () => {
    const steps = Array.from({ length: 500 }, (_, index) => `  step s${index} { focus node(A); }`).join("\n");
    const source = `mpd 1.0
scene demo {
${steps}
}
`;
    // Use Date.now() instead of performance.now() for jsdom compatibility
    const start = Date.now();
    const result = parseMPD(source);
    const duration = Date.now() - start;
    expect(result.diagnostics.filter((diag) => diag.severity === "error").length).toBe(0);
    expect(duration).toBeLessThan(50);
  });
});
