import { BaseDiagramStrategy } from "../diagramStrategies.js";
/**
 * Strategy for git graph diagrams
 * Handles commits, branches, and merges
 */
export class GitGraphStrategy extends BaseDiagramStrategy {
    getDiagramType() {
        return 'gitGraph';
    }
    getTargetableClasses() {
        return ['commit', 'branch', 'merge'];
    }
    getTargetableTags() {
        return ['g', 'circle', 'path', 'text'];
    }
    extractNodeIds(svg) {
        const nodeIdMap = new Map();
        // Patterns for git graph IDs
        const patterns = [
            /^commit-([A-Za-z0-9_]+)-\d+$/, // commit-name-digit
            /^branch-([A-Za-z0-9_]+)-\d+$/, // branch-name-digit
            /^merge-([A-Za-z0-9_]+)-\d+$/, // merge-name-digit
            /^([A-Za-z0-9_]+)-\d+$/, // name-digit (fallback)
        ];
        // First pass: find all elements with ids and extract node ids
        for (const el of Array.from(svg.querySelectorAll("[id]"))) {
            const id = el.getAttribute("id");
            if (!id)
                continue;
            let nodeId = this.extractIdFromPatterns(id, patterns);
            if (nodeId && !nodeIdMap.has(nodeId)) {
                // Find the group that contains this element
                let current = el;
                let nodeGroup = null;
                // Walk up the tree to find the commit/branch/merge group
                while (current && current !== svg) {
                    if (current instanceof SVGElement && current.tagName === "g") {
                        const className = this.getElementClassName(current);
                        if (className && (className.includes('commit') || className.includes('branch') || className.includes('merge'))) {
                            nodeGroup = current;
                            break;
                        }
                    }
                    current = current.parentElement;
                }
                // If we found a group, use it
                if (nodeGroup) {
                    nodeIdMap.set(nodeId, nodeGroup);
                }
                else if (el.tagName === "g" && this.hasTargetableClass(el)) {
                    nodeIdMap.set(nodeId, el);
                }
                else if (el.tagName === "circle" && this.hasTargetableClass(el)) {
                    // Commits are often circle elements
                    nodeIdMap.set(nodeId, el);
                }
            }
        }
        return nodeIdMap;
    }
    getTargetSelectors(dataId) {
        const escapedId = this.escapeSelector(dataId);
        return [
            `g.commit[data-id="${escapedId}"]`,
            `g.branch[data-id="${escapedId}"]`,
            `g.merge[data-id="${escapedId}"]`,
            `circle.commit[data-id="${escapedId}"]`,
            `circle.branch[data-id="${escapedId}"]`,
            `g[class*="commit"][data-id="${escapedId}"]`,
            `g[class*="branch"][data-id="${escapedId}"]`,
            `g[class*="merge"][data-id="${escapedId}"]`,
            `circle[class*="commit"][data-id="${escapedId}"]`,
            `circle[class*="branch"][data-id="${escapedId}"]`,
            `[data-id="${escapedId}"]`, // Fallback
        ];
    }
    findAdjacentElements(target, svg) {
        const targetDataId = target.getAttribute('data-id');
        if (!targetDataId)
            return [];
        const targetClassName = this.getElementClassName(target);
        // For commits: find commits on the same branch or connected branches
        if (targetClassName && targetClassName.includes('commit')) {
            // Find all branch paths/edges
            const allBranches = Array.from(svg.querySelectorAll('g[class*="branch"][data-id], path[class*="branch"], path[class*="edge"]'));
            const connectedCommits = [];
            try {
                const targetBbox = target.getBBox();
                for (const branch of allBranches) {
                    try {
                        const branchBbox = branch.getBBox();
                        // Check if branch intersects or is near this commit
                        const intersects = branchBbox.x < targetBbox.x + targetBbox.width &&
                            branchBbox.x + branchBbox.width > targetBbox.x &&
                            branchBbox.y < targetBbox.y + targetBbox.height &&
                            branchBbox.y + branchBbox.height > targetBbox.y;
                        if (intersects) {
                            // Find other commits on this branch
                            const allCommits = Array.from(svg.querySelectorAll('g[class*="commit"][data-id], circle[class*="commit"][data-id]'));
                            for (const commit of allCommits) {
                                if (commit === target)
                                    continue;
                                if (connectedCommits.includes(commit))
                                    continue;
                                try {
                                    const commitBbox = commit.getBBox();
                                    const commitIntersects = branchBbox.x < commitBbox.x + commitBbox.width &&
                                        branchBbox.x + commitBbox.width > commitBbox.x &&
                                        branchBbox.y < commitBbox.y + commitBbox.height &&
                                        branchBbox.y + commitBbox.height > commitBbox.y;
                                    if (commitIntersects) {
                                        connectedCommits.push(commit);
                                    }
                                }
                                catch {
                                    continue;
                                }
                            }
                        }
                    }
                    catch {
                        continue;
                    }
                }
            }
            catch {
                return [];
            }
            return connectedCommits;
        }
        // For branches: find commits on this branch
        if (targetClassName && targetClassName.includes('branch')) {
            const allCommits = Array.from(svg.querySelectorAll('g[class*="commit"][data-id], circle[class*="commit"][data-id]'));
            const connectedCommits = [];
            try {
                const branchBbox = target.getBBox();
                for (const commit of allCommits) {
                    try {
                        const commitBbox = commit.getBBox();
                        const intersects = branchBbox.x < commitBbox.x + commitBbox.width &&
                            branchBbox.x + branchBbox.width > commitBbox.x &&
                            branchBbox.y < commitBbox.y + commitBbox.height &&
                            branchBbox.y + commitBbox.height > commitBbox.y;
                        if (intersects) {
                            connectedCommits.push(commit);
                        }
                    }
                    catch {
                        continue;
                    }
                }
            }
            catch {
                return [];
            }
            return connectedCommits;
        }
        return [];
    }
}
//# sourceMappingURL=gitGraphStrategy.js.map