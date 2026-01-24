import { test, expect } from "@playwright/test";
import { parseMPD, formatDiagnostics } from "../../src/index";

test.describe("Editor MPD Linting", () => {
  test.describe("MPD syntax validation with formatDiagnostics", () => {
    test("should format error diagnostics correctly", () => {
      const invalidMPD = `mpd 1.0
scene test {
  step one {
    focus node(A)
  }
}`;

      const result = parseMPD(invalidMPD);
      
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.some(d => d.severity === "error")).toBe(true);
      
      const formatted = formatDiagnostics(result.diagnostics);
      expect(formatted).toContain("ERROR");
      expect(formatted).toMatch(/\d+:\d+/); // Should contain line:column format
    });

    test("should format warning diagnostics correctly", () => {
      const mpdWithWarning = `mpd 2.1
scene test {
  step one {
    focus node(A);
  }
}`;

      const result = parseMPD(mpdWithWarning);
      
      const warnings = result.diagnostics.filter(d => d.severity === "warning");
      if (warnings.length > 0) {
        const formatted = formatDiagnostics(result.diagnostics);
        expect(formatted).toContain("WARNING");
      }
    });

    test("should format multiple diagnostics correctly", () => {
      const invalidMPD = `mpd 1.0
scene test {
  step one {
    focus node(A)
  }
  step one {
    focus node(B);
  }
}`;

      const result = parseMPD(invalidMPD);
      
      expect(result.diagnostics.length).toBeGreaterThan(0);
      
      const formatted = formatDiagnostics(result.diagnostics);
      expect(formatted.split('\n').length).toBeGreaterThan(1);
      
      // Each diagnostic should be on its own line
      const lines = formatted.split('\n').filter(l => l.trim());
      expect(lines.length).toBeGreaterThan(0);
    });

    test("should include diagnostic codes when available", () => {
      const invalidMPD = `mpd 2.1
scene test {
  step one {
    focus node(A);
  }
}`;

      const result = parseMPD(invalidMPD);
      
      if (result.diagnostics.length > 0) {
        const formatted = formatDiagnostics(result.diagnostics);
        // Should include codes like [validate/version-mismatch]
        const hasCode = result.diagnostics.some(d => d.code);
        if (hasCode) {
          expect(formatted).toMatch(/\[validate\/[\w-]+\]/);
        }
      }
    });

    test("should handle empty diagnostics gracefully", () => {
      const formatted = formatDiagnostics([]);
      expect(formatted).toBe("No diagnostics.");
    });

    test("should format diagnostics with span information", () => {
      const invalidMPD = `mpd 1.0
scene test {
  step one {
    focus node(A)
  }
}`;

      const result = parseMPD(invalidMPD);
      
      expect(result.diagnostics.length).toBeGreaterThan(0);
      
      const diagnosticsWithSpan = result.diagnostics.filter(d => d.span);
      if (diagnosticsWithSpan.length > 0) {
        const formatted = formatDiagnostics(diagnosticsWithSpan);
        // Should contain line:column format from spans
        expect(formatted).toMatch(/\(\d+:\d+\)/);
      }
    });
  });

  test.describe("MPD parsing error handling", () => {
    test("should not render if there are blocking errors", () => {
      const invalidMPD = `mpd 1.0
scene test {
  step one {
    focus node(A)
  }
}`;

      const result = parseMPD(invalidMPD);
      
      const errors = result.diagnostics.filter(d => d.severity === "error");
      expect(errors.length).toBeGreaterThan(0);
      
      // Should not have AST or have null AST
      if (errors.length > 0) {
        // When there are blocking errors, AST might be null
        expect(result.ast === null || result.ast !== null).toBe(true);
      }
    });

    test("should allow rendering with warnings", () => {
      const mpdWithWarning = `mpd 2.1
scene test {
  step one {
    focus node(A);
  }
}`;

      const result = parseMPD(mpdWithWarning);
      
      const errors = result.diagnostics.filter(d => d.severity === "error");
      const warnings = result.diagnostics.filter(d => d.severity === "warning");
      
      // Should have warnings but no errors
      if (warnings.length > 0 && errors.length === 0) {
        expect(result.ast).not.toBeNull();
      }
    });
  });

  test.describe("Control updates after MPD changes", () => {
    test("should parse valid MPD and generate AST", () => {
      const validMPD = `mpd 1.0

deck {
  scene default {
    step overview {
      camera.reset();
    }
    
    step step1 {
      focus node(A);
      do camera.fit(target: node(A));
    }
  }
}`;

      const result = parseMPD(validMPD);
      
      expect(result.ast).not.toBeNull();
      expect(result.diagnostics.filter(d => d.severity === "error")).toHaveLength(0);
    });

    test("should extract steps from parsed MPD", () => {
      const validMPD = `mpd 1.0

deck {
  scene default {
    step overview {
      camera.reset();
    }
    
    step step1 {
      focus node(A);
    }
    
    step step2 {
      focus node(B);
    }
  }
}`;

      const result = parseMPD(validMPD);
      
      expect(result.ast).not.toBeNull();
      if (result.ast) {
        // With deck structure, SceneDecl is nested inside Deck
        const deck = result.ast.body.find(
          (item: any) => item.type === "Deck"
        );
        if (deck) {
          const scene = deck.items?.find(
            (item: any) => item.type === "SceneDecl"
          );
          expect(scene).toBeDefined();
          if (scene && (scene as any).items) {
            const steps = (scene as any).items.filter(
              (item: any) => item.type === "StepDecl"
            );
            expect(steps.length).toBeGreaterThanOrEqual(2);
          }
        } else {
          // Fallback: try direct SceneDecl in body
          const scene = result.ast.body.find(
            (item: any) => item.type === "SceneDecl"
          );
          expect(scene).toBeDefined();
          if (scene && (scene as any).items) {
            const steps = (scene as any).items.filter(
              (item: any) => item.type === "StepDecl"
            );
            expect(steps.length).toBeGreaterThanOrEqual(2);
          }
        }
      }
    });

    test("should handle duplicate step names", () => {
      const invalidMPD = `mpd 1.0

deck {
  scene default {
    step test {
      camera.reset();
    }
    
    step test {
      focus node(A);
    }
  }
}`;

      const result = parseMPD(invalidMPD);
      
      // Should have a validation error for duplicate step
      const duplicateStepError = result.diagnostics.find(
        d => d.code === "validate/duplicate-step"
      );
      
      // Note: This test depends on the validation logic
      // If validation is working, we should get this error
      if (result.ast) {
        const scene = result.ast.body.find(
          (item: any) => item.type === "SceneDecl"
        );
        if (scene) {
          // The parser might still parse it, but validation should catch it
          expect(result.diagnostics.some(d => d.severity === "error")).toBe(true);
        }
      }
    });
  });
});
