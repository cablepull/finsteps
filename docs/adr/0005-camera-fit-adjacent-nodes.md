# ADR 0005: Camera Fit Includes Adjacent Nodes by Default

- **Status:** Accepted
- **Date:** 2025-02-14

## Context

When focusing on a single node with `camera.fit`, the resulting viewBox often shows only that node, cutting off its connected neighbors. This provides insufficient context - users can't see the relationships between nodes (parent/child connections via edges). For effective walkthroughs, it's important to show both the target node and its immediate context.

Manually specifying padding helps, but doesn't guarantee adjacent nodes are included, especially for nodes that are far apart in the diagram layout.

## Decision

Modify `camera.fit()` to automatically detect and include first-level adjacent nodes (nodes connected to the target via edges) in the calculated viewBox. The bounding box calculation uses a union of the target node's bbox and all adjacent nodes' bboxes.

### Implementation Details

1. **Adjacent Node Detection**: `findAdjacentNodes()` function:
   - Finds all edge paths in the SVG
   - Detects edges connected to the target node by proximity/intersection
   - Finds other nodes connected to those edges
   - Returns array of adjacent node elements

2. **Union Bounding Box**: Calculate bounding box for each adjacent node (accounting for transforms), then compute the union of all bounding boxes:
   ```typescript
   unionBbox = union(targetBbox, adjacentNode1Bbox, adjacentNode2Bbox, ...)
   ```

3. **Transform Handling**: Properly account for `translate()` transforms on both target and adjacent nodes when calculating bounding boxes, ensuring coordinates are in SVG user space.

4. **Default Behavior**: This is always the default behavior for `camera.fit()`. There's no opt-out mechanism, as including context is almost always desirable.

## Consequences

### Positive

- **Better Context**: Users see relationships between nodes, not just isolated elements
- **Improved Walkthroughs**: Presentations flow better when adjacent nodes are visible
- **Reduced Manual Configuration**: No need to manually calculate padding or specify multiple targets
- **Automatic**: Works without additional configuration

### Trade-offs

- **Potential Over-zooming**: If a node has many adjacent nodes spread across the diagram, the viewBox may become very large. However, this is generally preferable to cutting off relationships.
- **Performance**: Edge detection and bbox calculations add some overhead. Acceptable given the improved UX.
- **Heuristic-based**: Edge detection uses proximity heuristics that may not always be perfect, but works well in practice for Mermaid flowcharts.

## Alternatives Considered

1. **Manual Multi-target**: Require users to specify all nodes to include. Rejected because it's verbose and error-prone.

2. **Opt-in Flag**: Add a `includeAdjacent: true` option. Rejected because including context is almost always desired, and opt-in adds friction.

3. **Fixed Padding Multiplier**: Use a larger default padding. Rejected because it doesn't guarantee adjacent nodes are included, especially for distant nodes.

## References

- `src/adapters/basicCamera.ts`: `findAdjacentNodes()` function and union bbox calculation
- `examples/walkthrough/index.html`: Walkthrough example demonstrating adjacent node inclusion
