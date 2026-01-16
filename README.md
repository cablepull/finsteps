# finsteps

Finsteps goal as a library is to enable you to walk through mermaid charts.

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
