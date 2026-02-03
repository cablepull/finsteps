import type { PresentationAst } from "../../types.js";
import type { FloatingControlsOptions } from "../../adapters/floatingControls.js";

export interface DiscoveredDiagram {
  element: HTMLElement;
  mermaidElement: HTMLElement;
  mermaidText: string;
  ast: PresentationAst;
  controlsPosition?: FloatingControlsOptions["position"];
  controlsSize?: "compact" | "normal" | "large";
  controlsTheme?: "dark" | "light" | "auto";
}

/**
 * Discover all finsteps diagrams within a container
 */
export function discoverDiagrams(container: HTMLElement): DiscoveredDiagram[] {
  const diagrams: DiscoveredDiagram[] = [];
  const finstepsElements = container.querySelectorAll<HTMLElement>("[data-finsteps]");

  finstepsElements.forEach((element) => {
    const discovered = parseDiagramElement(element);
    if (discovered) {
      diagrams.push(discovered);
    }
  });

  return diagrams;
}

/**
 * Parse a single diagram element and extract configuration
 */
function parseDiagramElement(element: HTMLElement): DiscoveredDiagram | null {
  // Find mermaid content
  const mermaidElement = element.querySelector<HTMLElement>(".finsteps-mermaid, pre.mermaid, .mermaid");
  if (!mermaidElement) {
    console.warn("[finsteps] No mermaid element found in", element);
    return null;
  }

  const mermaidText = mermaidElement.textContent?.trim();
  if (!mermaidText) {
    console.warn("[finsteps] Empty mermaid text in", element);
    return null;
  }

  // Find AST/steps configuration
  const ast = parseAstConfig(element);
  if (!ast) {
    console.warn("[finsteps] No valid AST configuration found in", element);
    return null;
  }

  // Parse controls options from data attributes
  const controlsPosition = parseControlsPosition(element.dataset.finstepsControls);
  const controlsSize = parseControlsSize(element.dataset.finstepsControlsSize);
  const controlsTheme = parseControlsTheme(element.dataset.finstepsControlsTheme);

  return {
    element,
    mermaidElement,
    mermaidText,
    ast,
    controlsPosition,
    controlsSize,
    controlsTheme
  };
}

/**
 * Parse AST configuration from script tag or data attribute
 */
function parseAstConfig(element: HTMLElement): PresentationAst | null {
  // Try script tag first
  const scriptTag = element.querySelector<HTMLScriptElement>(
    'script[type="application/finsteps+json"], script[type="application/json"]'
  );

  if (scriptTag?.textContent) {
    try {
      const parsed = JSON.parse(scriptTag.textContent);
      // Support both { steps: [...] } and { ast: { steps: [...] } }
      if (parsed.steps && Array.isArray(parsed.steps)) {
        return { steps: parsed.steps, bindings: parsed.bindings };
      }
      if (parsed.ast?.steps && Array.isArray(parsed.ast.steps)) {
        return parsed.ast;
      }
    } catch (e) {
      console.warn("[finsteps] Failed to parse AST from script tag:", e);
    }
  }

  // Try data-finsteps-ast attribute
  const astAttr = element.dataset.finstepsAst;
  if (astAttr) {
    try {
      const parsed = JSON.parse(astAttr);
      if (parsed.steps && Array.isArray(parsed.steps)) {
        return { steps: parsed.steps, bindings: parsed.bindings };
      }
    } catch (e) {
      console.warn("[finsteps] Failed to parse AST from data attribute:", e);
    }
  }

  return null;
}

function parseControlsPosition(value?: string): FloatingControlsOptions["position"] | undefined {
  const valid = ["bottom-right", "bottom-left", "top-right", "top-left", "bottom-center"];
  return valid.includes(value || "") ? (value as FloatingControlsOptions["position"]) : undefined;
}

function parseControlsSize(value?: string): "compact" | "normal" | "large" | undefined {
  const valid = ["compact", "normal", "large"];
  return valid.includes(value || "") ? (value as "compact" | "normal" | "large") : undefined;
}

function parseControlsTheme(value?: string): "dark" | "light" | "auto" | undefined {
  const valid = ["dark", "light", "auto"];
  return valid.includes(value || "") ? (value as "dark" | "light" | "auto") : undefined;
}
