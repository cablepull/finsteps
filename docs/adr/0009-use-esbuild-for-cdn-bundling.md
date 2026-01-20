# ADR-0009: Use esbuild for CDN Bundling

## Status
accepted

## Context

The Finsteps framework needs to be distributed via CDN (jsDelivr) for easy integration in HTML pages, CodePen examples, and other environments where npm packages aren't available. Currently, the framework is built with TypeScript compiler (`tsc`) which outputs multiple ES module files in `dist/`. 

For CDN distribution, users need:
1. A single-file bundle that includes all framework code
2. Minified version for production use
3. ES module format for modern browser support
4. Mermaid kept as external dependency (users load it separately)

Alternatives considered:
- **Rollup**: Popular bundler, but more configuration required
- **Webpack**: Heavyweight, primarily for apps rather than libraries
- **Vite**: Good for apps, but esbuild is simpler for library bundling
- **esbuild**: Fast, zero-config for simple use cases, written in Go with native performance

## Decision

We will use **esbuild** to create bundled CDN distributions:

1. Create unminified bundle: `dist/finsteps.esm.js` (for debugging)
2. Create minified bundle: `dist/finsteps.esm.min.js` (for production)
3. Keep `mermaid` as external dependency (users must load it separately via CDN)
4. Output ES modules format (`--format=esm`) for browser compatibility
5. Target ES2020 to match TypeScript compiler target

The bundled files will be created via npm scripts:
- `bundle`: Creates unminified bundle
- `bundle:min`: Creates minified bundle  
- `build:cdn`: Runs TypeScript build + both bundles

## Consequences

### Positive
- **Fast builds**: esbuild is extremely fast (written in Go)
- **Simple configuration**: Minimal config needed for basic bundling
- **Single-file distribution**: Easy to load via CDN with one import
- **Smaller bundle**: Tree-shaking eliminates unused code
- **Developer experience**: Unminified bundle for easier debugging

### Negative
- **Additional dependency**: Adds esbuild to devDependencies
- **Build complexity**: Multiple build outputs to maintain
- **Bundle size**: Cannot tree-shake mermaid (kept external, users load separately)

### Neutral
- **Distribution choice**: Users can still use module imports (`dist/index.js`) or bundled CDN version
- **Git ignore**: Bundled files in `dist/` are gitignored, but available in GitHub releases/tags for jsDelivr
- **CI/CD**: GitHub Pages workflow will include bundles in `docs/dist/`

## Implementation Notes

**esbuild command flags:**
- `--bundle`: Bundle all imports into single file
- `--format=esm`: ES module output
- `--platform=browser`: Browser-targeted build
- `--target=es2020`: Matches TypeScript compiler target
- `--external:mermaid`: Keep mermaid external (users load separately)
- `--minify`: Minify output (for production bundle)
- `--outfile`: Output file path

**Distribution:**
- Bundled files available via jsDelivr: `https://cdn.jsdelivr.net/gh/cablepull/finsteps@vX.X.X/dist/finsteps.esm.min.js`
- Also available on GitHub Pages: `https://cablepull.github.io/finsteps/dist/finsteps.esm.min.js`

**Usage example:**
```html
<script type="module">
  import { presentMermaid } from 'https://cdn.jsdelivr.net/gh/cablepull/finsteps@v0.3.0/dist/finsteps.esm.min.js';
  // Mermaid must be loaded separately
</script>
```

## Related
- Supports: CDN distribution requirement for framework accessibility
- Related to: ADR-0001 (Mermaid Presentation DSL) - external mermaid dependency

## Date
2025-01-20