# ADR 0006: Mermaid ID to data-id Attribute Mapping

- **Status:** Accepted
- **Date:** 2025-02-14

## Context

Mermaid generates internal IDs for SVG elements (e.g., `id="flowchart-PM-0"`), but these IDs are:
- Complex and version-dependent
- Include suffixes and prefixes that make them brittle
- Not directly usable for logical node identification in presentations

Finsteps needs a stable way to target nodes using logical identifiers (e.g., `"PM"` for a "Product" node). The DSL uses `dataId` targeting (e.g., `target: { dataId: "PM" }`), but Mermaid doesn't set `data-id` attributes by default.

## Decision

Post-process the rendered Mermaid SVG to extract logical node IDs from Mermaid's generated IDs and set corresponding `data-id` attributes on node groups. This mapping enables Finsteps' `resolveTarget()` to find nodes via `dataId`.

### Implementation Details

1. **ID Extraction Pattern**: Parse Mermaid's ID patterns to extract the logical node identifier:
   - `flowchart-{nodeId}-{digit}` → `nodeId`
   - `flowchart-{digit}-{nodeId}` → `nodeId`
   - `node-{nodeId}` → `nodeId`
   - Various other Mermaid-specific patterns

2. **Target Elements**: Set `data-id` only on node groups (`<g class="node">`), not on child elements like text labels. This ensures `resolveTarget()` returns the correct group element.

3. **Post-render Processing**: Run `ensureDataIdFromMermaidIds()` after Mermaid renders the SVG but before returning the `DiagramHandle`.

4. **Fallback Support**: If `data-id` isn't found, `resolveTarget()` can still fall back to ID-based selectors, maintaining backward compatibility.

## Consequences

### Positive

- **Stable Targeting**: Logical node IDs work consistently across Mermaid versions
- **DSL Compatibility**: Enables `dataId` targeting in the DSL without requiring users to manually set attributes
- **Cleaner Code**: Presentation code uses simple identifiers like `"PM"` instead of complex Mermaid IDs
- **Version Resilience**: Works even if Mermaid changes its ID generation scheme (as long as patterns remain parseable)

### Trade-offs

- **Pattern Matching**: Relies on parsing Mermaid's ID patterns, which could break if Mermaid changes formats. However, patterns are fairly stable across versions.
- **Post-render Overhead**: Adds a processing step after Mermaid renders. Minimal performance impact.
- **Multiple Patterns**: Must maintain pattern matching for various Mermaid ID formats. Acceptable maintenance burden.

## Alternatives Considered

1. **User-provided Mapping**: Require users to manually specify ID mappings. Rejected because it adds friction and maintenance burden.

2. **Use Mermaid IDs Directly**: Target using Mermaid's full IDs. Rejected because they're brittle and complex.

3. **Modify Mermaid**: Fork Mermaid to generate `data-id` attributes. Rejected because it violates the "no forks" principle from ADR 0001.

## References

- `src/adapters/mermaidDiagram.ts`: `ensureDataIdFromMermaidIds()` function
- `src/targetResolver.ts`: `resolveTarget()` logic that uses `data-id` attributes
- ADR 0001: Design goal of not forking Mermaid
