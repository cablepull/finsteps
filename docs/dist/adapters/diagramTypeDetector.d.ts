/**
 * Supported Mermaid diagram types
 */
export type DiagramType = 'flowchart' | 'sequenceDiagram' | 'classDiagram' | 'stateDiagram' | 'stateDiagram-v2' | 'erDiagram' | 'gantt' | 'pie' | 'journey' | 'gitGraph' | 'timeline' | 'quadrantChart' | 'requirement' | 'c4Context' | 'c4Container' | 'c4Component' | 'block' | 'unknown';
/**
 * Detects the Mermaid diagram type from the source text
 * @param mermaidText - The Mermaid diagram source text
 * @returns The detected diagram type, or 'unknown' if not recognized
 */
export declare function detectDiagramType(mermaidText: string): DiagramType;
//# sourceMappingURL=diagramTypeDetector.d.ts.map