/**
 * Detects the Mermaid diagram type from the source text
 * @param mermaidText - The Mermaid diagram source text
 * @returns The detected diagram type, or 'unknown' if not recognized
 */
export function detectDiagramType(mermaidText) {
    const trimmed = mermaidText.trim();
    const lines = trimmed.split('\n').map(l => l.trim());
    // Skip frontmatter if present
    let firstRelevantLine = 0;
    if (lines[0] === '---') {
        for (let i = 1; i < lines.length; i++) {
            if (lines[i] === '---') {
                // Skip empty lines after frontmatter
                let nextIdx = i + 1;
                while (nextIdx < lines.length && lines[nextIdx] === '') {
                    nextIdx++;
                }
                firstRelevantLine = nextIdx;
                break;
            }
        }
    }
    const firstLine = (lines[firstRelevantLine] || '').toLowerCase();
    // Check for explicit diagram type declarations
    if (firstLine.startsWith('flowchart')) {
        return 'flowchart';
    }
    if (firstLine.startsWith('sequenceDiagram') || firstLine.startsWith('sequencediagram')) {
        return 'sequenceDiagram';
    }
    if (firstLine.startsWith('classDiagram') || firstLine.startsWith('classdiagram')) {
        return 'classDiagram';
    }
    if (firstLine.startsWith('stateDiagram-v2') || firstLine.startsWith('statediagram-v2')) {
        return 'stateDiagram-v2';
    }
    if (firstLine.startsWith('stateDiagram') || firstLine.startsWith('statediagram')) {
        return 'stateDiagram';
    }
    if (firstLine.startsWith('erDiagram') || firstLine.startsWith('erdiagram')) {
        return 'erDiagram';
    }
    if (firstLine.startsWith('gantt')) {
        return 'gantt';
    }
    if (firstLine.startsWith('pie')) {
        return 'pie';
    }
    if (firstLine.startsWith('journey')) {
        return 'journey';
    }
    if (firstLine.startsWith('gitGraph') || firstLine.startsWith('gitgraph')) {
        return 'gitGraph';
    }
    if (firstLine.startsWith('timeline')) {
        return 'timeline';
    }
    if (firstLine.startsWith('quadrantChart') || firstLine.startsWith('quadrantchart')) {
        return 'quadrantChart';
    }
    if (firstLine.startsWith('requirement')) {
        return 'requirement';
    }
    if (firstLine.startsWith('C4Context') || firstLine.startsWith('c4context')) {
        return 'c4Context';
    }
    if (firstLine.startsWith('C4Container') || firstLine.startsWith('c4container')) {
        return 'c4Container';
    }
    if (firstLine.startsWith('C4Component') || firstLine.startsWith('c4component')) {
        return 'c4Component';
    }
    if (firstLine.startsWith('block-beta') || firstLine.startsWith('blockBeta') || firstLine.startsWith('blockbeta')) {
        return 'block';
    }
    if (firstLine.startsWith('blockDiagram') || firstLine.startsWith('blockdiagram')) {
        return 'block'; // Legacy alias support
    }
    // Additional Mermaid syntaxes (Mermaid 10+)
    if (firstLine.startsWith('mindmap')) {
        return 'mindmap';
    }
    if (firstLine.startsWith('kanban')) {
        return 'kanban';
    }
    if (firstLine.startsWith('packet')) {
        return 'packet';
    }
    if (firstLine.startsWith('radar')) {
        return 'radar';
    }
    // Mermaid commonly uses sankey-beta/treemap-beta/xychart-beta
    if (firstLine.startsWith('sankey') || firstLine.startsWith('sankey-beta') || firstLine.startsWith('sankeybeta')) {
        return 'sankey';
    }
    if (firstLine.startsWith('treemap') || firstLine.startsWith('treemap-beta') || firstLine.startsWith('treemapbeta')) {
        return 'treemap';
    }
    if (firstLine.startsWith('xychart') || firstLine.startsWith('xychart-beta') || firstLine.startsWith('xychartbeta') || firstLine.startsWith('xy')) {
        return 'xychart';
    }
    // ZenUML is typically declared as "zenuml" in Mermaid
    if (firstLine.startsWith('zenuml')) {
        return 'zenuml';
    }
    // Fallback: check for common patterns
    if (trimmed.includes('graph') || trimmed.includes('-->') || trimmed.includes('---')) {
        return 'flowchart';
    }
    return 'unknown';
}
//# sourceMappingURL=diagramTypeDetector.js.map