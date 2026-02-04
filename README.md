# finsteps

Finsteps is a Mermaid presentation runtime that lets you walk through diagram steps with camera moves, highlights, and overlay callouts.

## Docs

- [Quick Start Guide](docs/quick-start.md) - 5-minute tutorial (start here!)
- Public API contract: `docs/api/public-api.md`
- AI Model Management: `docs/ai-models.md` - Multi-provider AI integration with local Ollama support
- Examples: `docs/examples/vanilla.html`, `docs/examples/react-hook.md`, `docs/examples/revealjs.md`
- Product requirements: `docs/prd/finsteps-mermaid-presentation-framework.md`

Finsteps goal as a library is to enable you to walk through mermaid charts.

## How to debug

- Run `npm run build` to verify the TypeScript build output in `dist/`.
- Run `npm run test:unit` for unit tests and `npm run test:playwright` for browser/e2e coverage.
- For Playwright debugging, set `PWDEBUG=1` or `DEBUG=pw:api` before `npm run test:playwright`.
- For MPD parsing issues, call `formatDiagnostics(result.diagnostics)` to see parse locations and codes.

## Common failure modes

- `MPF_INVALID_PRESENT_OPTIONS`: `presentMermaid` was called without `ast` or `mpdText` + `parseMpd`.
- `MPF_MERMAID_UNAVAILABLE`: Mermaid is not available on `window.mermaid` when rendering.
- `MPF_MERMAID_RENDER_FAILED`: Mermaid render returned no SVG element.
- `MPF_OVERLAY_DESTROYED`: Overlay calls were made after `destroy()` completed.
- `MPF_OVERLAY_TARGET_MISSING`: A bubble overlay was requested without a valid target element.

## MPD Parser Package

This repo now ships a browser-compatible MPD parser package at `@mpf/mpd-parser`.

### Install

```bash
npm install @mpf/mpd-parser
```

### Usage

### AI Model Integration (Optional)

Finsteps now includes an optional AI model management system for generating content and enabling AI-powered features:

```ts
import { modelManager } from 'finsteps';

// Check available models (includes pre-configured qwen3-coder:30b via Ollama)
const models = modelManager.getAvailableModels();

// Chat with local AI model
const response = await modelManager.chat({
  model: 'qwen3-coder-30b',
  messages: [
    {
      role: 'user',
      content: 'Generate MPD code for a flowchart presentation'
    }
  ]
});

console.log(response.choices[0].message.content);
```

**Setup local AI model:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama server
ollama serve

# Pull the qwen3-coder:30b model
ollama pull qwen3-coder:30b

# Test the integration
npm run test:ollama
```

**Supported Providers:**
- **OpenAI**: GPT-4, GPT-3.5 (requires API key)
- **Anthropic**: Claude 3 Sonnet, Claude 3 Opus (requires API key)  
- **Ollama**: Local models including qwen3-coder:30b (no API key needed)

See [AI Model Documentation](docs/ai-models.md) for complete setup and usage guide.

### MPD Parser Usage

```ts
import { parseMPD, formatDiagnostics } from "@mpf/mpd-parser";

const source = `mpd 1.0\nscene intro { step one { focus node(A); } }`;
const result = parseMPD(source);

if (result.diagnostics.length) {
  console.log(formatDiagnostics(result.diagnostics));
}

console.log(result.ast);
```

### Docs

- [Grammar documentation](docs/grammar.md) - Complete MPD grammar reference with examples
- [EBNF Grammar](docs/ebnf/mpd.ebnf) - Formal grammar specification
- [Grammar summary](docs/mpd-parser/grammar.md) - Parser implementation details
- [Compatibility contract](docs/mpd-parser/compatibility-contract.md) - AST structure documentation

### JSON Schemas

- [MPD Schema](docs/schema/mpd.json) - JSON Schema for ParseResult (returned by `parseMPD()`)
- [API Schema](docs/schema/api.json) - JSON Schema for PresentationAst (used by `presentMermaid()`)

Schemas are also available via `package.json` contract under `finsteps.schema`.

## For AI Assistants

This library enables interactive presentations over Mermaid diagrams using:

- **MPD (Mermaid Presentation DSL)**: Declarative language for defining presentation steps
- **presentMermaid()**: Main entry point function
- **Controller API**: Navigation methods (next, prev, goto, reset)
- **JSON Schemas**: Machine-readable contracts for MPD and API validation

### Minimal Example Template

```javascript
import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.4.3/dist/finsteps.esm.min.js';

const mermaidText = `graph LR
  A[Start] --> B[Process] --> C[End]`;

const mpdText = `mpd 1.0
scene default {
  step overview {
    camera reset();
    overlay bubble(target: dataId("A"), text: "Welcome!");
  }
  step detail {
    camera fit(target: dataId("B"), padding: 60, duration: 500);
    style highlight(target: dataId("B"));
    overlay bubble(target: dataId("B"), text: "Details here");
  }
}`;

const controller = await presentMermaid({
  mermaidText,
  mpdText,
  mountEl: document.getElementById('diagram'),
  options: { parseMpd: parseMPD }
});

// Navigate programmatically
controller.next();  // Go to next step
controller.prev();  // Go to previous step
controller.goto('detail');  // Jump to specific step
```

### MPD Syntax Reference

**Program structure:**
```mpd
mpd 1.0
scene <name> {
  step <id> {
    camera <action>(<args>);
    overlay bubble(target: dataId("<nodeId>"), text: "<message>");
    style highlight(target: dataId("<nodeId>"));
  }
}
```

**Common actions:**
- `camera fit(target: dataId("A"), padding: 60, duration: 500)` - Focus camera on target
- `camera reset()` - Reset camera to full view
- `overlay bubble(target: dataId("A"), text: "Message")` - Show bubble callout
- `style highlight(target: dataId("A"))` - Highlight element
- `nav.next()`, `nav.prev()`, `nav.goto(id: "step1")` - Navigation actions

**Target expressions:**
- `dataId("A")` - Target by data-id attribute (most common)
- `node("A")` - Target by Mermaid node ID
- `css(".selector")` - Target by CSS selector
- `union(target1, target2)` - Multiple targets

**Keyboard bindings:**
```mpd
binding {
  on key "ArrowRight" {
    do nav.next();
  }
  on key "ArrowLeft" {
    do nav.prev();
  }
}
```

### Validation

Use `parseMPD()` to validate MPD syntax before suggesting code:

```javascript
import { parseMPD, formatDiagnostics } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.4.3/dist/finsteps.esm.min.js';

const result = parseMPD(mpdText);
if (result.diagnostics.length > 0) {
  const errors = result.diagnostics.filter(d => d.severity === "error");
  if (errors.length > 0) {
    console.error(formatDiagnostics(result.diagnostics));
    // Regenerate with corrections
  }
}
```

### Resources

- [JSON Schema for MPD](docs/schema/mpd.json) - Validate ParseResult structure
- [JSON Schema for API](docs/schema/api.json) - Validate PresentationAst structure
- [Complete Grammar Documentation](docs/grammar.md) - Full MPD syntax reference
- [EBNF Grammar](docs/ebnf/mpd.ebnf) - Formal grammar specification
- [Quick Start Guide](docs/quick-start.md) - Progressive tutorial

### Tips for AI Assistants

When generating Finsteps code:

1. **Always provide both Mermaid and MPD**: Users need both the diagram and the presentation script
2. **Use dataId for targets**: Most reliable targeting method - matches what's rendered in SVG
3. **Validate MPD before suggesting**: Use `parseMPD()` to check syntax
4. **Include navigation**: Add keyboard bindings (ArrowRight/ArrowLeft) for better UX
5. **Check error messages**: If errors occur, check `error.suggestions` array for helpful hints

## CDN Usage (jsDelivr)

Finsteps is available via [jsDelivr CDN](https://www.jsdelivr.com/) for easy integration in HTML pages, CodePen, and other environments without npm.

### Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="diagram"></div>
  
  <script type="module">
    import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@latest/dist/finsteps.esm.min.js';
    
    const mermaidText = `graph LR
      A[Start] --> B[End]`;
    
    const mpdText = `mpd 1.0
scene intro {
  step one {
    focus node(A);
    do camera.fit(node(A));
  }
}`;
    
    const controller = await presentMermaid({
      mermaidText,
      mpdText,
      mountEl: document.getElementById('diagram'),
      options: { parseMpd }
    });
  </script>
</body>
</html>
```

### CDN URLs

**Latest version:**
```javascript
import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@latest/dist/finsteps.esm.min.js';
```

**Specific version:**
```javascript
import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.4.2/dist/finsteps.esm.min.js';
```

**Unminified (for debugging):**
```javascript
import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@latest/dist/finsteps.esm.js';
```

### Important Notes

- **Mermaid is required**: You must load Mermaid.js separately before using Finsteps. See the example above.
- **ES modules**: The CDN bundle uses ES module syntax (`import`/`export`), so use `<script type="module">` tags.
- **Version pinning**: For production, pin to a specific version (e.g., `@v0.3.0`) rather than `@latest`.

### GitHub Pages Alternative

The bundled files are also available via GitHub Pages:
```javascript
import { presentMermaid, parseMPD } from 'https://cablepull.github.io/finsteps/dist/finsteps.esm.min.js';
```
