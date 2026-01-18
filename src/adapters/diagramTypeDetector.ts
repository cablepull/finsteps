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
  // #region agent log
  if (firstLine.includes('c4component') || firstLine.includes('C4Component')) {
    const logData = {location:'diagramTypeDetector.ts:79',message:'checking C4Component',data:{firstLine:firstLine,startsWithC4Component:firstLine.startsWith('C4Component'),startsWithC4component:firstLine.startsWith('c4component')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
    console.log('[DiagramTypeDetector]', logData.message, logData.data);
    fetch('http://127.0.0.1:7242/ingest/e6be1aad-0bf5-49de-87e2-f8c8215b6261',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
  }
  // #endregion
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
