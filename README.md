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
