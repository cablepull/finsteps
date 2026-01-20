# finsteps

Finsteps is a Mermaid presentation runtime that lets you walk through diagram steps with camera moves, highlights, and overlay callouts.

## Docs

- Public API contract: `docs/api/public-api.md`
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

- [Grammar summary](docs/mpd-parser/grammar.md)
- [Compatibility contract](docs/mpd-parser/compatibility-contract.md)

## CDN Usage (jsDelivr)

Finsteps is available via [jsDelivr CDN](https://www.jsdelivr.com/) for easy integration in HTML pages, CodePen, and other environments without npm.

### Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
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
import { presentMermaid, parseMPD } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.3.0/dist/finsteps.esm.min.js';
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
