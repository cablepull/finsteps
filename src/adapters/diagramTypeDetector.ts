/**
 * Supported Mermaid diagram types
 */
export type DiagramType = 
  | 'flowchart' 
  | 'sequenceDiagram' 
  | 'classDiagram' 
  | 'stateDiagram' 
  | 'stateDiagram-v2' 
  | 'erDiagram' 
  | 'gantt' 
  | 'pie' 
  | 'journey' 
  | 'gitGraph' 
  | 'timeline' 
  | 'quadrantChart' 
  | 'requirement' 
  | 'c4Context' 
  | 'c4Container' 
  | 'c4Component' 
  | 'block'
  | 'unknown';

/**
 * Detects the Mermaid diagram type from the source text
 * @param mermaidText - The Mermaid diagram source text
 * @returns The detected diagram type, or 'unknown' if not recognized
 */
export function detectDiagramType(mermaidText: string): DiagramType {
  const trimmed = mermaidText.trim();
  const firstLine = trimmed.split('\n')[0].trim().toLowerCase();
  
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
  
  // Fallback: check for common patterns
  if (trimmed.includes('graph') || trimmed.includes('-->') || trimmed.includes('---')) {
    return 'flowchart';
  }
  
  return 'unknown';
}
