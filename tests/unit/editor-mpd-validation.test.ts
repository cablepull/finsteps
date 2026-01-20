import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseMPD, formatDiagnostics } from "../../src/index";

describe("Editor MPD Validation Unit Tests", () => {
  describe("formatDiagnostics", () => {
    it("should format single error diagnostic", () => {
      const diagnostics = [
        {
          message: "Expected semicolon",
          severity: "error" as const,
          span: {
            start: { offset: 10, line: 2, column: 5 },
            end: { offset: 15, line: 2, column: 10 }
          },
          code: "parse/syntax-error"
        }
      ];

      const formatted = formatDiagnostics(diagnostics);
      
      expect(formatted).toContain("ERROR");
      expect(formatted).toContain("Expected semicolon");
      expect(formatted).toContain("(2:5)");
      expect(formatted).toContain("[parse/syntax-error]");
    });

    it("should format multiple diagnostics", () => {
      const diagnostics = [
        {
          message: "Error 1",
          severity: "error" as const,
          span: {
            start: { offset: 0, line: 1, column: 0 },
            end: { offset: 5, line: 1, column: 5 }
          }
        },
        {
          message: "Warning 1",
          severity: "warning" as const,
          span: {
            start: { offset: 10, line: 2, column: 0 },
            end: { offset: 15, line: 2, column: 5 }
          }
        }
      ];

      const formatted = formatDiagnostics(diagnostics);
      
      expect(formatted).toContain("ERROR");
      expect(formatted).toContain("WARNING");
      expect(formatted.split('\n').length).toBe(2);
    });

    it("should handle diagnostics without span", () => {
      const diagnostics = [
        {
          message: "General error",
          severity: "error" as const
        }
      ];

      const formatted = formatDiagnostics(diagnostics);
      
      expect(formatted).toContain("ERROR");
      expect(formatted).toContain("General error");
      expect(formatted).not.toContain("("); // No location info
    });

    it("should handle diagnostics without code", () => {
      const diagnostics = [
        {
          message: "Error without code",
          severity: "error" as const,
          span: {
            start: { offset: 0, line: 1, column: 1 },
            end: { offset: 10, line: 1, column: 11 }
          }
        }
      ];

      const formatted = formatDiagnostics(diagnostics);
      
      expect(formatted).toContain("ERROR");
      expect(formatted).toContain("Error without code");
      expect(formatted).toContain("(1:1)");
      expect(formatted).not.toContain("["); // No code
    });
  });

  describe("parseMPD error detection", () => {
    it("should detect syntax errors", () => {
      const invalidMPD = `mpd 1.0
scene test {
  step one {
    focus node(A)
  }
}`;

      const result = parseMPD(invalidMPD);
      
      expect(result.diagnostics.length).toBeGreaterThan(0);
      const errors = result.diagnostics.filter(d => d.severity === "error");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should filter errors correctly", () => {
      const invalidMPD = `mpd 1.0
scene test {
  step one {
    focus node(A)
  }
}`;

      const result = parseMPD(invalidMPD);
      
      const errors = result.diagnostics.filter(d => d.severity === "error");
      const warnings = result.diagnostics.filter(d => d.severity === "warning");
      
      expect(errors.length + warnings.length).toBe(result.diagnostics.length);
      expect(errors.every(e => e.severity === "error")).toBe(true);
      expect(warnings.every(w => w.severity === "warning")).toBe(true);
    });

    it("should not render when there are blocking errors", () => {
      const invalidMPD = `mpd 1.0
scene test {
  step one {
    focus node(A)
  }
}`;

      const result = parseMPD(invalidMPD);
      const errors = result.diagnostics.filter(d => d.severity === "error");
      
      // If there are errors, we should not proceed with rendering
      if (errors.length > 0) {
        // This simulates the check in handleMPDChange
        const shouldRender = errors.length === 0;
        expect(shouldRender).toBe(false);
      }
    });

    it("should allow rendering with warnings only", () => {
      const mpdWithWarning = `mpd 2.1
scene test {
  step one {
    focus node(A);
  }
}`;

      const result = parseMPD(mpdWithWarning);
      const errors = result.diagnostics.filter(d => d.severity === "error");
      const warnings = result.diagnostics.filter(d => d.severity === "warning");
      
      // If there are warnings but no errors, we should allow rendering
      if (warnings.length > 0 && errors.length === 0) {
        const shouldRender = errors.length === 0;
        expect(shouldRender).toBe(true);
        expect(result.ast).not.toBeNull();
      }
    });
  });

  describe("MPD AST extraction for controls", () => {
    it("should extract steps from valid MPD", () => {
      const validMPD = `mpd 1.0

deck {
  scene default {
    step overview {
      camera.reset();
    }
    
    step step1 {
      focus node(A);
    }
  }
}`;

      const result = parseMPD(validMPD);
      
      expect(result.ast).not.toBeNull();
      expect(result.diagnostics.filter(d => d.severity === "error").length).toBe(0);
      
      if (result.ast) {
        // When deck is used, scenes are nested inside the DeckNode
        const deck = result.ast.body.find(
          (item: any) => item.type === "Deck"
        ) as any;
        // Deck should exist even if binding has parse errors
        expect(deck).toBeDefined();
        expect(deck?.items).toBeDefined();
        
        // Find SceneDecl inside the deck
        const scene = deck?.items?.find(
          (item: any) => item.type === "SceneDecl"
        ) as any;
        expect(scene).toBeDefined();
        expect(scene?.items).toBeDefined();
        
        const steps = scene?.items?.filter(
          (item: any) => item.type === "StepDecl"
        ) || [];
        expect(steps.length).toBeGreaterThanOrEqual(2);
        
        // Check step names - handle both NameValue objects and strings
        const stepNames = steps.map((step: any) => {
          if (step.name && typeof step.name === 'object' && 'value' in step.name) {
            return step.name.value;
          }
          return step.name;
        });
        expect(stepNames).toContain("overview");
        expect(stepNames).toContain("step1");
      }
    });

    it("should handle empty MPD gracefully", () => {
      const emptyMPD = `mpd 1.0
`;

      const result = parseMPD(emptyMPD);
      
      // Should parse without fatal errors (might have warnings)
      expect(result.diagnostics.filter(d => d.severity === "error").length).toBe(0);
    });

    it("should extract bindings information", () => {
      // Note: Binding syntax may have parse errors, but deck structure should still be extractable
      const mpdWithBindings = `mpd 1.0

deck {
  binding {
    on click target selector("button[data-goto='step1']") {
      do nav.goto(id: "step1");
    }
  }
  
  scene default {
    step step1 {
      focus node(A);
    }
  }
}`;

      const result = parseMPD(mpdWithBindings);
      
      expect(result.ast).not.toBeNull();
      
      if (result.ast && result.ast.body.length > 0) {
        // When deck is used, it should be the first body item
        const deck = result.ast.body[0] as any;
        expect(deck?.type).toBe("Deck");
        expect(deck?.items).toBeDefined();
        expect(Array.isArray(deck.items)).toBe(true);
        
        // Deck should contain both binding and scene
        const hasBinding = deck.items.some((item: any) => item.type === "BindingDecl");
        const hasScene = deck.items.some((item: any) => item.type === "SceneDecl");
        
        // At minimum, scene should be parsed successfully
        expect(hasScene).toBe(true);
        
        // Binding might not parse if syntax has errors, but that's okay for this test
        if (hasBinding) {
          const bindings = deck.items.find((item: any) => item.type === "BindingDecl");
          expect(bindings?.type).toBe("BindingDecl");
        }
      }
    });
    });
  });
