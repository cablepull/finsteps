import { MPFError } from "../errors.js";
import { DiagramAdapter, DiagramHandle, TargetDescriptor } from "../types.js";
import { resolveTarget } from "../targetResolver.js";
import { detectDiagramType } from "./diagramTypeDetector.js";
import { DiagramStrategy } from "./diagramStrategies.js";
import { strategyRegistry } from "./diagramStrategyRegistry.js";
import { FlowchartStrategy } from "./strategies/flowchartStrategy.js";
import { GanttStrategy } from "./strategies/ganttStrategy.js";
import { SequenceDiagramStrategy } from "./strategies/sequenceDiagramStrategy.js";
import { ClassDiagramStrategy } from "./strategies/classDiagramStrategy.js";
import { StateDiagramStrategy } from "./strategies/stateDiagramStrategy.js";
import { ERDiagramStrategy } from "./strategies/erDiagramStrategy.js";
import { PieChartStrategy } from "./strategies/pieChartStrategy.js";
import { JourneyStrategy } from "./strategies/journeyStrategy.js";
import { GitGraphStrategy } from "./strategies/gitGraphStrategy.js";
import { TimelineStrategy } from "./strategies/timelineStrategy.js";
import { QuadrantChartStrategy } from "./strategies/quadrantChartStrategy.js";
import { RequirementStrategy } from "./strategies/requirementStrategy.js";
import { C4Strategy } from "./strategies/c4Strategy.js";
import { BlockDiagramStrategy } from "./strategies/blockDiagramStrategy.js";

// Register default strategies
strategyRegistry.register('flowchart', new FlowchartStrategy());
strategyRegistry.register('gantt', new GanttStrategy());
strategyRegistry.register('sequenceDiagram', new SequenceDiagramStrategy());
strategyRegistry.register('classDiagram', new ClassDiagramStrategy());
strategyRegistry.register('stateDiagram', new StateDiagramStrategy());
strategyRegistry.register('stateDiagram-v2', new StateDiagramStrategy());
strategyRegistry.register('erDiagram', new ERDiagramStrategy());
strategyRegistry.register('pie', new PieChartStrategy());
strategyRegistry.register('journey', new JourneyStrategy());
strategyRegistry.register('gitGraph', new GitGraphStrategy());
// Experimental types
strategyRegistry.register('timeline', new TimelineStrategy());
strategyRegistry.register('quadrantChart', new QuadrantChartStrategy());
strategyRegistry.register('requirement', new RequirementStrategy());
strategyRegistry.register('c4Context', new C4Strategy('c4Context'));
strategyRegistry.register('c4Container', new C4Strategy('c4Container'));
strategyRegistry.register('c4Component', new C4Strategy('c4Component'));
strategyRegistry.register('block', new BlockDiagramStrategy());
// Set flowchart as default fallback
strategyRegistry.setDefault(new FlowchartStrategy());

/**
 * Mermaid puts node ids in the element's `id` (e.g. flowchart-PM-0, flowchart-ENG-0).
 * We copy the node id into data-id so that target: { dataId: "PM" } works.
 */
function ensureDataIdFromMermaidIds(svg: SVGSVGElement, strategy: DiagramStrategy, mermaidText?: string): void {
  // Use strategy to extract node IDs
  let nodeIdMap = strategy.extractNodeIds(svg);
  
  
  
  // For C4 diagrams, if extraction failed or incomplete, try extracting aliases from text and finding elements by ID
  const diagramType = strategy.getDiagramType();
  
  
  const aliases = mermaidText ? extractC4AliasesFromText(mermaidText) : new Set<string>();
  
  // For class diagrams, extract class names from text
  let classAliases: Set<string> = new Set<string>();
  if (diagramType === 'classDiagram' && mermaidText) {
    // Extract class names from class diagram syntax: class ClassName { ... }
    const classPattern = /class\s+([A-Za-z0-9_]+)\s*[<{]/g;
    let classMatch;
    while ((classMatch = classPattern.exec(mermaidText)) !== null) {
      classAliases.add(classMatch[1]);
    }
    // Also check for class declarations without braces: class ClassName
    const classSimplePattern = /class\s+([A-Za-z0-9_]+)(?:\s|$)/g;
    classSimplePattern.lastIndex = 0;
    while ((classMatch = classSimplePattern.exec(mermaidText)) !== null) {
      classAliases.add(classMatch[1]);
    }
    
  }
  
  // For ER diagrams, extract entity names from text
  let erAliases: Set<string> = new Set<string>();
  if (diagramType === 'erDiagram' && mermaidText) {
    // Extract entity names from ER diagram syntax: ENTITY_NAME { ... }
    // Entities are defined either with relationships (ENTITY1 ||--o{ ENTITY2) or with braces (ENTITY { ... })
    const erPattern = /([A-Z][A-Z0-9_]+)\s*\{/g;
    let erMatch;
    while ((erMatch = erPattern.exec(mermaidText)) !== null) {
      erAliases.add(erMatch[1]);
    }
    // Also extract from relationship syntax: ENTITY1 ||--o{ ENTITY2
    const relPattern = /([A-Z][A-Z0-9_]+)\s*[|o]+--[|o]+/g;
    relPattern.lastIndex = 0;
    while ((erMatch = relPattern.exec(mermaidText)) !== null) {
      erAliases.add(erMatch[1]);
    }
    // Extract from the other side of relationships: ||--o{ ENTITY2
    const relPattern2 = /[|o]+--[|o]+\s*([A-Z][A-Z0-9_]+)/g;
    relPattern2.lastIndex = 0;
    while ((erMatch = relPattern2.exec(mermaidText)) !== null) {
      erAliases.add(erMatch[1]);
    }
    
  }
  
  // For git graph diagrams, extract branch names and commit IDs from text
  let gitAliases: Set<string> = new Set<string>();
  if (diagramType === 'gitGraph' && mermaidText) {
    // Extract branch names: branch branchName
    const branchPattern = /branch\s+([A-Za-z0-9_]+)/g;
    let branchMatch;
    while ((branchMatch = branchPattern.exec(mermaidText)) !== null) {
      gitAliases.add(branchMatch[1]);
    }
    // Extract checkout statements to find implicit branches: checkout branchName
    // "main" is often the default branch and may not be explicitly declared
    const checkoutPattern = /checkout\s+([A-Za-z0-9_]+)/g;
    checkoutPattern.lastIndex = 0;
    while ((branchMatch = checkoutPattern.exec(mermaidText)) !== null) {
      gitAliases.add(branchMatch[1]);
    }
    // Extract commit IDs: commit id: "commitId"
    const commitPattern = /commit\s+id:\s*"([^"]+)"/g;
    commitPattern.lastIndex = 0;
    while ((branchMatch = commitPattern.exec(mermaidText)) !== null) {
      gitAliases.add(branchMatch[1]);
    }
    // Handle merge operations: merge branchName
    // For git graphs, "merge" should map to the commit after the merge operation
    // e.g., "merge feature" followed by "commit id: \"Release\"" means "merge" -> "Release"
    const mergePattern = /merge\s+([A-Za-z0-9_]+)/g;
    mergePattern.lastIndex = 0;
    while ((branchMatch = mergePattern.exec(mermaidText)) !== null) {
      gitAliases.add(branchMatch[1]);
      // Note: We'll map "merge" to the commit after merge in the third pass
      // For now, just add "merge" to the aliases set
    }
    // Also add "merge" as a special keyword for the merge commit
    // This will map to commits that are the result of merges
    gitAliases.add('merge');
    
  }
  
  // For journey diagrams, extract step names from text
  let journeyAliases: Set<string> = new Set<string>();
  if (diagramType === 'journey' && mermaidText) {
    // Extract step names: Step Name: score: actor
    // Pattern matches: "  Landing Page: 5: User"
    // Note: We need to match lines that start with whitespace, contain a step name, colon, digit, colon
    // But avoid matching "title" or "section" lines
    const lines = mermaidText.split('\n');
    for (const line of lines) {
      // Match lines that look like: "  Step Name: 5: User"
      // But not: "  title ..." or "  section ..."
      if (line.trim().startsWith('title') || line.trim().startsWith('section')) {
        continue;
      }
      const stepMatch = line.match(/^\s+([^:]+):\s*\d+:/);
      if (stepMatch && stepMatch[1]) {
        const stepName = stepMatch[1].trim();
        if (stepName && !stepName.includes('\n')) {
          journeyAliases.add(stepName);
        }
      }
    }
    
  }
  
  // For pie chart diagrams, extract slice names from text
  let pieAliases: Set<string> = new Set<string>();
  if (diagramType === 'pie' && mermaidText) {
    // Extract slice names: "Slice Name" : value
    // Pattern matches: "Desktop" : 45 or "Mobile" : 35
    const slicePattern = /"([^"]+)"\s*:\s*\d+\.?\d*/g;
    let sliceMatch: RegExpExecArray | null;
    slicePattern.lastIndex = 0;
    while ((sliceMatch = slicePattern.exec(mermaidText)) !== null) {
      const sliceName = sliceMatch[1].trim();
      if (sliceName) {
        pieAliases.add(sliceName);
      }
    }
    
  }
  
  // For quadrant chart diagrams, extract item names from text
  let quadrantAliases: Set<string> = new Set<string>();
  if (diagramType === 'quadrantChart' && mermaidText) {
    // Extract item names: "Item Name": [x, y] or Item Name: [x, y] or "Item Name": x,y or Item Name: x,y
    // Pattern matches: "Leader": [0.8, 0.8] or Leader: [0.8, 0.8] or "Leader": 0.8, 0.8
    const itemPattern = /"?([^":\n]+)"?\s*:\s*\[?[\d.]+\s*,\s*[\d.]+\]?/g;
    let itemMatch: RegExpExecArray | null;
    itemPattern.lastIndex = 0;
    while ((itemMatch = itemPattern.exec(mermaidText)) !== null) {
      const itemName = itemMatch[1].trim();
      if (itemName) {
        quadrantAliases.add(itemName);
      }
    }
    
  }
  
  // For requirement diagrams, extract requirement and element names from text
  let requirementAliases: Set<string> = new Set<string>();
  if (diagramType === 'requirement' && mermaidText) {
    // Extract requirement names: requirement req1 { ... }
    const requirementPattern = /requirement\s+([A-Za-z0-9_]+)\s*\{/g;
    let requirementMatch: RegExpExecArray | null;
    requirementPattern.lastIndex = 0;
    while ((requirementMatch = requirementPattern.exec(mermaidText)) !== null) {
      const reqName = requirementMatch[1].trim();
      if (reqName) {
        requirementAliases.add(reqName);
      }
    }
    
    // Extract element names: element func1 { ... }
    const elementPattern = /element\s+([A-Za-z0-9_]+)\s*\{/g;
    let elementMatch: RegExpExecArray | null;
    elementPattern.lastIndex = 0;
    while ((elementMatch = elementPattern.exec(mermaidText)) !== null) {
      const elemName = elementMatch[1].trim();
      if (elemName) {
        requirementAliases.add(elemName);
      }
    }
    
  }
  
  // For sequence diagrams, extract participant names from text
  let sequenceAliases: Set<string> = new Set<string>();
  if (diagramType === 'sequenceDiagram' && mermaidText) {
    // Extract participant names: participant Name or actor Name
    const participantPattern = /(?:participant|actor)\s+([A-Za-z0-9_]+)/g;
    let participantMatch: RegExpExecArray | null;
    participantPattern.lastIndex = 0;
    while ((participantMatch = participantPattern.exec(mermaidText)) !== null) {
      const partName = participantMatch[1].trim();
      if (partName) {
        sequenceAliases.add(partName);
      }
    }
    
    // Extract message labels from text: Source->>Target: Message Label
    // These can also be used as targets (e.g., "Place Order", "Charge Card")
    const messagePattern = /(?:->>|->|-->>|-->)\s*[A-Za-z0-9_]+\s*:\s*([^\n]+)/g;
    let messageMatch: RegExpExecArray | null;
    messagePattern.lastIndex = 0;
    while ((messageMatch = messagePattern.exec(mermaidText)) !== null) {
      const messageLabel = messageMatch[1].trim();
      if (messageLabel) {
        sequenceAliases.add(messageLabel);
      }
    }
    
  }
  
  // For timeline diagrams, extract section names from text
  let timelineAliases: Set<string> = new Set<string>();
  if (diagramType === 'timeline' && mermaidText) {
    // Extract section names: section Name
    const sectionPattern = /section\s+([^\n]+)/g;
    let sectionMatch: RegExpExecArray | null;
    sectionPattern.lastIndex = 0;
    while ((sectionMatch = sectionPattern.exec(mermaidText)) !== null) {
      const sectionName = sectionMatch[1].trim();
      if (sectionName) {
        timelineAliases.add(sectionName);
      }
    }
    
  }
  
  const shouldUseFallback = mermaidText && (
    ((diagramType === 'c4Component' || diagramType === 'c4Container' || diagramType === 'c4Context') && 
     (nodeIdMap.size === 0 || nodeIdMap.size < aliases.size)) ||
    (diagramType === 'classDiagram' && (nodeIdMap.size === 0 || nodeIdMap.size < classAliases.size)) ||
    (diagramType === 'erDiagram' && (nodeIdMap.size === 0 || nodeIdMap.size < erAliases.size)) ||
    (diagramType === 'gitGraph' && (nodeIdMap.size === 0 || nodeIdMap.size < gitAliases.size)) ||
    (diagramType === 'journey' && (nodeIdMap.size === 0 || nodeIdMap.size < journeyAliases.size)) ||
    (diagramType === 'pie' && (nodeIdMap.size === 0 || nodeIdMap.size < pieAliases.size)) ||
    (diagramType === 'quadrantChart' && (nodeIdMap.size === 0 || nodeIdMap.size < quadrantAliases.size)) ||
    (diagramType === 'requirement' && (nodeIdMap.size === 0 || nodeIdMap.size < requirementAliases.size)) ||
    (diagramType === 'sequenceDiagram' && (nodeIdMap.size === 0 || nodeIdMap.size < sequenceAliases.size)) ||
    (diagramType === 'timeline' && (nodeIdMap.size === 0 || nodeIdMap.size < timelineAliases.size))
  );
  
  
  if (shouldUseFallback) {
    
    // Extract all boundaries once (for Container and Context diagrams)
    const boundaryChildren: Record<string, string[]> = {};
    if (diagramType === 'c4Container' || diagramType === 'c4Context') {
      const boundaryPattern = /(?:Container_Boundary|System_Boundary)\s*\(\s*([A-Za-z0-9_]+)\s*,[\s\S]*?\{([\s\S]*?)\}/g;
      let boundaryMatch;
      boundaryPattern.lastIndex = 0;
      while ((boundaryMatch = boundaryPattern.exec(mermaidText)) !== null) {
        const boundaryAlias = boundaryMatch[1];
        const boundaryContent = boundaryMatch[2];
        // Extract child aliases from the boundary content
        const childPatterns = [
          /Container\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
          /Component\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
        ];
        const children: string[] = [];
        for (const childPattern of childPatterns) {
          childPattern.lastIndex = 0;
          let childMatch;
          while ((childMatch = childPattern.exec(boundaryContent)) !== null) {
            children.push(childMatch[1]);
          }
        }
        if (children.length > 0) {
          boundaryChildren[boundaryAlias] = children;
        }
      }
      
    }
    
    // First pass: find all non-boundary aliases by text search
    // Try to find elements by searching for text content containing the alias
    // C4 diagrams don't use alias names as IDs; instead, we need to find groups containing the text
    // For class diagrams, find classes by their names in the text content
    // For ER diagrams, find entities by their names in the text content
    // For git graph diagrams, find branches and commits by their names in the text content
    // For journey, pie, and quadrant diagrams, find steps/slices/items by their names in the text content
    const allAliases = diagramType === 'classDiagram' ? classAliases : 
                       diagramType === 'erDiagram' ? erAliases :
                       diagramType === 'gitGraph' ? gitAliases :
                       diagramType === 'journey' ? journeyAliases :
                       diagramType === 'pie' ? pieAliases :
                       diagramType === 'quadrantChart' ? quadrantAliases :
                       diagramType === 'requirement' ? requirementAliases :
                       diagramType === 'sequenceDiagram' ? sequenceAliases :
                       diagramType === 'timeline' ? timelineAliases : aliases;
    
    // For ER, git graph, journey, pie, quadrant, requirement, and sequence diagrams, sort aliases so longer/more specific names come first
    // This prevents shorter names from matching elements that belong to longer names
    // e.g., ORDER_ITEM should be matched before PRODUCT to avoid PRODUCT matching ORDERITEM
    const sortedAliases = (diagramType === 'erDiagram' || diagramType === 'gitGraph' || diagramType === 'journey' || diagramType === 'pie' || diagramType === 'quadrantChart' || diagramType === 'requirement' || diagramType === 'sequenceDiagram') ? 
      Array.from(allAliases as Set<string>).sort((a: string, b: string) => {
        // Sort by length (longer first), then alphabetically
        if (b.length !== a.length) return b.length - a.length;
        return a.localeCompare(b);
      }) : Array.from(allAliases as Set<string>);
    
    for (const alias of sortedAliases as string[]) {
      if (nodeIdMap.has(alias)) continue;
      
      // Skip boundaries in first pass (will process in second pass)
      if (boundaryChildren[alias]) continue;
      
      // Search for text elements containing the alias (case-insensitive)
      const aliasLower = alias.toLowerCase();
      const allElements = Array.from(svg.querySelectorAll('*'));
      const textElements = allElements.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        
        // For ER diagrams, match entity names strictly (exact word match, case-insensitive)
        if (diagramType === 'erDiagram') {
          // Match if text contains the entity name as a word (case-insensitive)
          // ER entity names are typically uppercase, but we match case-insensitively
          // Handle both with and without underscores (ORDER_ITEM vs ORDERITEM)
          const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // First try exact match with underscores
          const entityNamePattern = new RegExp(`\\b${aliasEscaped.replace(/_/g, '\\_')}\\b`, 'i');
          if (entityNamePattern.test(text)) {
            return true;
          }
          // Also try without underscores - but be more strict: must be at word boundary or start/end
          const aliasNoUnderscore = alias.replace(/_/g, '');
          const aliasNoUnderscoreLower = aliasNoUnderscore.toLowerCase();
          // Check if text starts or ends with the alias (without underscores)
          if (text.trim().startsWith(aliasNoUnderscoreLower) || text.trim().endsWith(aliasNoUnderscoreLower)) {
            return true;
          }
          // Check for word boundary match (without underscores)
          const entityNamePatternNoUnderscore = new RegExp(`\\b${aliasNoUnderscoreLower}\\b`, 'i');
          if (entityNamePatternNoUnderscore.test(text)) {
            return true;
          }
          // Also check if it's at the start or end of text (with underscores)
          if (text.trim().startsWith(aliasLower) || text.trim().endsWith(aliasLower)) {
            return true;
          }
        }
        
        // For git graph diagrams, match branch names and commit IDs strictly (exact word match, case-insensitive)
        if (diagramType === 'gitGraph') {
          // Match if text contains the branch/commit name as a word (case-insensitive)
          // Git graph branch names and commit IDs are typically lowercase, but we match case-insensitively
          const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Try exact word match
          const gitNamePattern = new RegExp(`\\b${aliasEscaped}\\b`, 'i');
          if (gitNamePattern.test(text)) {
            return true;
          }
          // Also check if it's at the start or end of text
          if (text.trim().startsWith(aliasLower) || text.trim().endsWith(aliasLower)) {
            return true;
          }
        }
        
        // For journey diagrams, match step names (may be multi-word like "Landing Page")
        if (diagramType === 'journey') {
          // Match if text contains the step name (case-insensitive)
          // Journey step names are typically title case, e.g., "Landing Page", "Signup Form"
          const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Try exact phrase match (for multi-word names)
          const journeyNamePattern = new RegExp(aliasEscaped.replace(/\s+/g, '\\s+'), 'i');
          if (journeyNamePattern.test(text)) {
            return true;
          }
          // Also try word boundary match (handles cases where step name appears as a phrase)
          const journeyWordPattern = new RegExp(`\\b${aliasEscaped.replace(/\s+/g, '\\s+')}\\b`, 'i');
          if (journeyWordPattern.test(text)) {
            return true;
          }
          // Also check if it's at the start or end of text
          if (text.trim().startsWith(aliasLower) || text.trim().endsWith(aliasLower)) {
            return true;
          }
        }
        
        // For timeline diagrams, match section names (may be multi-word like "Major Versions")
        // Mermaid timeline sections may have normalized whitespace, so we need to normalize both
        if (diagramType === 'timeline') {
          // Normalize whitespace in both text and alias (replace multiple spaces with single space)
          const normalizedText = text.replace(/\s+/g, ' ').trim().toLowerCase();
          const normalizedAlias = aliasLower.replace(/\s+/g, ' ').trim();
          // Match if normalized text contains normalized alias
          if (normalizedText.includes(normalizedAlias)) {
            return true;
          }
          // Also try exact phrase match with normalized whitespace
          const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const timelineNamePattern = new RegExp(aliasEscaped.replace(/\s+/g, '\\s+'), 'i');
          if (timelineNamePattern.test(text)) {
            return true;
          }
          // Also check if normalized text starts or ends with normalized alias
          if (normalizedText.startsWith(normalizedAlias) || normalizedText.endsWith(normalizedAlias)) {
            return true;
          }
        }
        
        // For class diagrams, match class names more strictly (exact word match)
        if (diagramType === 'classDiagram') {
          // Match if text contains the class name as a word (case-insensitive)
          // Check for exact word match: class name should be surrounded by word boundaries or spaces
          const classNamePattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (classNamePattern.test(text)) {
            return true;
          }
          // Also check if it's at the start or end of text
          if (text.trim().startsWith(aliasLower) || text.trim().endsWith(aliasLower)) {
            return true;
          }
        }
        
        // Check if text contains alias (handling variations like "Controller" for "controller")
        // Also handle SystemDb which uses "<<system_db>>" format
        const dbPattern = aliasLower === 'db' ? /<<system_db>>/i : null;
        if (dbPattern && dbPattern.test(text)) {
          return true;
        }
        
        // Direct alias match
        if (text.includes(aliasLower) && 
            (text.startsWith(aliasLower) || text.includes(' ' + aliasLower) || text.includes(aliasLower + ' ') || text.includes('<<' + aliasLower) || text.includes(aliasLower + '>>'))) {
          return true;
        }
        
        // Handle multi-word aliases where alias might be concatenated (e.g., "webapp" -> "Web Application")
        // Try splitting alias into words if it looks concatenated (contains lowercase followed by uppercase)
        const camelCaseWords = alias.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        if (camelCaseWords !== aliasLower && camelCaseWords.includes(' ')) {
          // Check if all words from the camelCase split appear in the text
          const words = camelCaseWords.split(' ');
          if (words.length > 1 && words.every(word => text.includes(word))) {
            // Check if words appear together (not just individually)
            const joinedWords = words.join('');
            if (text.includes(joinedWords) || words.every((word, idx) => {
              if (idx === 0) return text.includes(word);
              const prevWord = words[idx - 1];
              return text.includes(prevWord + ' ' + word) || text.includes(prevWord + word);
            })) {
              return true;
            }
          }
        }
        
        // Handle all-lowercase concatenated aliases (e.g., "webapp" -> "web application")
        // Try to split the alias into common words and check if they appear together
        // Common patterns: webapp -> web app, webapp -> web application
        if (aliasLower.length > 3) {
          // Try common word splits (this is a heuristic, not perfect)
          const commonWordEndings = ['app', 'api', 'ui', 'db', 'service', 'system', 'user'];
          for (const ending of commonWordEndings) {
            if (aliasLower.endsWith(ending) && aliasLower.length > ending.length) {
              const prefix = aliasLower.slice(0, -ending.length);
              // Check if both prefix and ending (or full word containing ending) appear in text
              if (text.includes(prefix) && (text.includes(ending) || text.includes(ending + 'lication') || text.includes(ending + 'i'))) {
                // Check if they appear together or close to each other
                if (text.includes(prefix + ' ' + ending) || text.includes(prefix + ending) || 
                    (text.includes(prefix) && text.includes(ending + 'lication'))) {
                  return true;
                }
              }
            }
          }
        }
        
        return false;
      });
      
      
      // For each text element, walk up to find the containing group
      let found = false;
      for (const textEl of textElements) {
        let current: Element | null = textEl;
        let nodeGroup: SVGElement | null = null;
        
        // Special handling for pie charts: if we find text in a legend, find the corresponding path slice
        if (diagramType === 'pie') {
          // Walk up to find if this text is in a legend
          let legendGroup: SVGElement | null = null;
          let temp: Element | null = textEl;
          while (temp && temp !== svg) {
            if (temp instanceof SVGElement && temp.tagName === "g") {
              const className = typeof temp.className === 'string' ? temp.className : (temp.className as unknown as SVGAnimatedString).baseVal;
              if (className && className.includes('legend')) {
                legendGroup = temp;
                break;
              }
            }
            temp = temp.parentElement;
          }
          
          // If we found a legend group, try to find the corresponding pie slice path
          if (legendGroup) {
            // Find all path elements in the SVG (these are the pie slices)
            const allPaths = Array.from(svg.querySelectorAll<SVGPathElement>('path'));
            // Try to find a path that might correspond to this legend item
            // For pie charts, we can match by looking for paths near the legend or by slice order
            // Since pie slices don't have direct text, we'll use the slice order
            // Find all legend groups to determine order
            const allLegendGroups = Array.from(svg.querySelectorAll<SVGGElement>('g')).filter(g => {
              const cn = typeof g.className === 'string' ? g.className : (g.className as unknown as SVGAnimatedString).baseVal;
              return cn && cn.includes('legend');
            });
            const legendIndex = legendGroup ? allLegendGroups.indexOf(legendGroup as SVGGElement) : -1;
            
            // Get all path elements (pie slices) - they should be in the same order as legends
            const slicePaths = allPaths.filter(p => {
              // Pie slice paths have a 'd' attribute (SVG path data)
              const d = p.getAttribute('d');
              return d && d.includes('M') && (d.includes('A') || d.includes('L')); // Path data for arcs
            });
            
            if (legendIndex >= 0 && legendIndex < slicePaths.length) {
              // Found the corresponding slice path
              const slicePath = slicePaths[legendIndex];
              if (slicePath instanceof SVGGraphicsElement) {
                const aliasStr = String(alias);
                if (!nodeIdMap.has(aliasStr)) {
                  nodeIdMap.set(aliasStr, slicePath);
                  found = true;
                  
                  
                  continue; // Skip the normal text-based group finding
                }
              }
            }
          }
        }
        
        // Special handling for sequence diagrams: message labels are often direct text children
        // Need to find the associated message line/path or use the text element itself
        if (diagramType === 'sequenceDiagram') {
          // For sequence diagrams, message labels might be direct text children of SVG
          // Check if text element has "messageText" class
          if (textEl instanceof SVGElement) {
            const textClassName = typeof textEl.className === 'string' ? textEl.className : (textEl.className as unknown as SVGAnimatedString).baseVal;
            if (textClassName && textClassName.includes('message')) {
              // For sequence diagrams, message labels can be text elements themselves
              // Try to find a nearby message line/path or use the text element
              let messageElement: SVGElement | null = null;
              
              try {
                if (textEl instanceof SVGGraphicsElement) {
                  const textBbox = textEl.getBBox();
                  // Find nearby line or path elements (message arrows)
                  const allElements = Array.from(svg.querySelectorAll<SVGGraphicsElement>('line, path'));
                  for (const el of allElements) {
                    try {
                      const elBbox = el.getBBox();
                      // Check if element is near the text (within reasonable distance)
                      const distance = Math.sqrt(
                        Math.pow((textBbox.x + textBbox.width/2) - (elBbox.x + elBbox.width/2), 2) +
                        Math.pow((textBbox.y + textBbox.height/2) - (elBbox.y + elBbox.height/2), 2)
                      );
                      // For sequence diagrams, message labels are typically near message lines
                      if (distance < 150) {
                        // Find the parent group of this line/path
                        let parent: Element | null = el.parentElement;
                        while (parent && parent !== svg) {
                          if (parent instanceof SVGElement && parent.tagName === "g") {
                            const parentClassName = typeof parent.className === 'string' ? parent.className : (parent.className as unknown as SVGAnimatedString).baseVal;
                            if (parentClassName && (parentClassName.includes('message') || parent.contains(textEl))) {
                              messageElement = parent;
                              break;
                            }
                          }
                          parent = parent.parentElement;
                        }
                        if (messageElement) break;
                        // If no group found, use the line/path element itself
                        messageElement = el;
                        break;
                      }
                    } catch {
                      continue;
                    }
                  }
                }
              } catch {
                // getBBox failed, continue with text element
              }
              
              // Walk up to find a group with "message" class
              let temp: Element | null = textEl;
              while (temp && temp !== svg && !messageElement) {
                if (temp instanceof SVGElement && temp.tagName === "g") {
                  const className = typeof temp.className === 'string' ? temp.className : (temp.className as unknown as SVGAnimatedString).baseVal;
                  if (className && className.includes('message')) {
                    messageElement = temp;
                    break;
                  }
                }
                temp = temp.parentElement;
              }
              
              // If we found a message element/group, use it; otherwise use the text element itself
              if (messageElement) {
                nodeGroup = messageElement;
              } else if (textEl instanceof SVGGraphicsElement) {
                nodeGroup = textEl;
              }
              
              if (nodeGroup) {
                found = true;
                const aliasStr = String(alias);
                
                // Check if this alias is already mapped to a different element
                let existingElement: SVGElement | null = null;
                for (const [existingId, existingEl] of nodeIdMap.entries()) {
                  if (existingId === aliasStr) {
                    existingElement = existingEl;
                    break;
                  }
                }
                
                // If replacing, remove the old mapping
                if (existingElement && existingElement !== nodeGroup) {
                  nodeIdMap.delete(aliasStr);
                }
                
                // Set the mapping to the message element/text
                if (!nodeIdMap.has(aliasStr)) {
                  nodeIdMap.set(aliasStr, nodeGroup);
                  
                }
                
                continue; // Skip the normal text-based group finding
              }
            }
          }
        }
        
        // Special handling for quadrant charts: find the immediate data-point parent
        if (diagramType === 'quadrantChart') {
          // Walk up to find the immediate parent group with "data-point" class
          let temp: Element | null = textEl;
          while (temp && temp !== svg) {
            if (temp instanceof SVGElement && temp.tagName === "g") {
              const className = typeof temp.className === 'string' ? temp.className : (temp.className as unknown as SVGAnimatedString).baseVal;
              // Look for a group with "data-point" class (single point, not container)
              if (className && className.includes('data-point') && !className.includes('data-points') && !className.includes('main')) {
                // Check if this group contains a circle (it's a data point)
                if (temp.querySelector('circle')) {
                  nodeGroup = temp;
                  found = true;
                  
                  const aliasStr = String(alias);
                  
                  // Check if this alias is already mapped to a different element (especially a parent container)
                  // If so, replace it with the correct data-point element
                  let existingElement: SVGElement | null = null;
                  for (const [existingId, existingEl] of nodeIdMap.entries()) {
                    if (existingId === aliasStr) {
                      existingElement = existingEl;
                      break;
                    }
                  }
                  
                  // If this alias is already mapped to a parent container (main, data-points), replace it
                  if (existingElement) {
                    const existingClassName = typeof existingElement.className === 'string' ? existingElement.className : (existingElement.className as unknown as SVGAnimatedString).baseVal;
                    if (existingClassName && (existingClassName.includes('main') || existingClassName.includes('data-points'))) {
                      // Remove the old mapping to the parent container
                      nodeIdMap.delete(aliasStr);
                      
                    }
                  }
                  
                  // For quadrant charts, also check if this group is already mapped to a different alias
                  let existingAlias: string | null = null;
                  for (const [existingId, existingEl] of nodeIdMap.entries()) {
                    if (existingEl === nodeGroup) {
                      existingAlias = existingId;
                      break;
                    }
                  }
                  // If already mapped, only replace if current alias is longer (more specific)
                  if (existingAlias && aliasStr.length <= existingAlias.length) {
                    // Skip this match, keep the existing one
                    found = false;
                    break;
                  }
                  // If replacing, remove the old mapping
                  if (existingAlias) {
                    nodeIdMap.delete(existingAlias);
                  }
                  
                  // Set the mapping to the correct data-point element
                  nodeIdMap.set(aliasStr, nodeGroup);
                  
                  
                  break; // Found the specific data-point, stop searching
                }
              }
            }
            temp = temp.parentElement;
          }
          
          // If we found a data-point, skip the normal group finding
          if (found && nodeGroup) {
            continue; // Move to next text element
          }
        }
        
        // Walk up the tree to find a group element that contains this text
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            // Accept any group that contains the text element
            // We'll prefer groups that seem to be C4 elements (have certain classes or contain shapes)
            const className = current instanceof SVGElement ? (typeof current.className === 'string' ? current.className : (current.className as unknown as SVGAnimatedString).baseVal) : '';
            const hasShapes = current.querySelector('rect, circle, ellipse, polygon, path');
            
            // For pie charts, skip legend groups (we want the actual slice paths, not legend items)
            if (diagramType === 'pie' && className && className.includes('legend')) {
              current = current.parentElement;
              continue;
            }
            
            // For quadrant charts, skip parent containers (main, data-points) entirely
            // They contain all points and shouldn't be used as targets
            if (diagramType === 'quadrantChart' && className && (className.includes('main') || className.includes('data-points'))) {
              // This is a parent container - skip it and continue to find the specific child
              current = current.parentElement;
              continue;
            }
            
            // For quadrant charts, prefer groups with point/quadrant classes or containing circles
            // But avoid parent containers that have multiple data-point children (they contain all points)
            if (diagramType === 'quadrantChart' && className && (className.includes('point') || className.includes('quadrant') || className.includes('data'))) {
              // For quadrant charts, prefer groups with "data-point" class (single point, not container)
              if (className && className.includes('data-point') && !className.includes('data-points')) {
                nodeGroup = current;
                // If it contains a circle (data point), prefer this one and stop
                if (current.querySelector('circle')) break;
              } else if (!nodeGroup) {
                // Fallback: use this group if we haven't found a better one yet (but only if not a parent container)
                if (!className.includes('main') && !className.includes('data-points')) {
                  nodeGroup = current;
                  if (current.querySelector('circle')) break;
                }
              }
            }
            
            // Accept groups that:
            // 1. Have C4-related classes, OR
            // 2. Have git graph-related classes (branchLabel, commit, etc.), OR
            // 3. Have journey-related classes (step, task, section), OR
            // 4. Have pie chart-related classes (slice, segment, etc.), OR
            // 5. Contain shapes (likely the main element group), OR
            // 6. Are parent groups containing the text (fallback)
            if (className && (className.includes('c4') || className.includes('element') || 
                className.includes('component') || className.includes('container') ||
                className.includes('relationship') || className.includes('boundary') ||
                className.includes('branch') || className.includes('commit') || className.includes('merge') ||
                className.includes('branchLabel') || className.includes('label') ||
                className.includes('step') || className.includes('task') || className.includes('section') ||
                className.includes('journey') || className.includes('slice') || className.includes('segment') ||
                className.includes('pie') || className.includes('quadrant') || className.includes('point') ||
                className.includes('timeline') || className.includes('event')) ||
                hasShapes || !nodeGroup) {
              nodeGroup = current;
              // If it has shapes or is a branchLabel/label/step/task/slice/point/quadrant (for git graphs/journey/pie/quadrant), prefer this one
              if (hasShapes || (className && (className.includes('branchLabel') || className.includes('label') || 
                  className.includes('step') || className.includes('task') || className.includes('slice') ||
                  className.includes('point') || className.includes('quadrant')))) break;
            }
          }
          current = current.parentElement;
        }
        
        if (nodeGroup) {
          const aliasStr = String(alias);
          
          // For quadrant charts, check if this alias is already mapped to a parent container
          // If so, don't set it again - the special handling should have already fixed it
          if (diagramType === 'quadrantChart') {
            const existingElement = nodeIdMap.get(aliasStr);
            if (existingElement) {
              const existingClassName = typeof existingElement.className === 'string' ? existingElement.className : (existingElement.className as unknown as SVGAnimatedString).baseVal;
              // If it's already mapped to a parent container (main, data-points), skip this match
              // The special handling should replace it, but if it didn't, we shouldn't use the wrong element
              if (existingClassName && (existingClassName.includes('main') || existingClassName.includes('data-points'))) {
                // Skip this match - the special handling should handle it, or we'll handle it in a second pass
                continue;
              }
              // If it's already correctly mapped to a data-point, skip
              if (existingClassName && existingClassName.includes('data-point') && !existingClassName.includes('data-points')) {
                continue;
              }
            }
          }
          
          // For ER, git graph, journey, pie, and quadrant diagrams, check if this group is already mapped to a different alias
          // If so, prefer the longer/more specific alias (e.g., ORDER_ITEM over PRODUCT)
          if (diagramType === 'erDiagram' || diagramType === 'gitGraph' || diagramType === 'journey' || diagramType === 'pie' || diagramType === 'quadrantChart') {
            let existingAlias: string | null = null;
            for (const [existingId, existingEl] of nodeIdMap.entries()) {
              if (existingEl === nodeGroup) {
                existingAlias = existingId;
                break;
              }
            }
            // If already mapped, only replace if current alias is longer (more specific)
            if (existingAlias && aliasStr.length <= existingAlias.length) {
              continue; // Skip this match, keep the existing one
            }
            // If replacing, remove the old mapping
            if (existingAlias) {
              nodeIdMap.delete(existingAlias);
            }
          }
          
          if (!nodeIdMap.has(aliasStr)) {
            nodeIdMap.set(aliasStr, nodeGroup);
            found = true;
          }
          break;
        }
      }
      
      
    }
    
    // Second pass: process boundaries (after all child elements have been found)
    for (const [boundaryAlias, childAliases] of Object.entries(boundaryChildren)) {
      if (nodeIdMap.has(boundaryAlias)) continue; // Already found
      
      
      // Find all child elements (they should already be found and have data-id set)
      const childElements: SVGElement[] = [];
      for (const childAlias of childAliases) {
        // First check nodeIdMap (should be found in first pass)
        if (nodeIdMap.has(childAlias)) {
          childElements.push(nodeIdMap.get(childAlias)!);
        } else {
          // Otherwise, try to find by data-id attribute
          const childEl = svg.querySelector(`[data-id="${childAlias}"]`);
          if (childEl && childEl instanceof SVGElement) {
            childElements.push(childEl);
          }
        }
      }
      
      
      // Find common ancestor groups that contain ALL child elements
      if (childElements.length >= Math.min(2, childAliases.length)) {
        // Check all groups in the SVG to find ones that contain all children
        const allGroups = Array.from(svg.querySelectorAll<SVGElement>('g'));
        const ancestorCandidates: SVGElement[] = [];
        
        for (const group of allGroups) {
          // Check if this group contains ALL child elements
          let containsAll = true;
          for (const childEl of childElements) {
            if (!group.contains(childEl)) {
              containsAll = false;
              break;
            }
          }
          
          if (containsAll) {
            ancestorCandidates.push(group);
          }
        }
        
        
        // Prefer the most specific (deepest) ancestor, but prefer ones with shapes or boundary classes
        let selectedGroup: SVGElement | null = null;
        
        // If no ancestor candidates found, check if SVG root contains all children
        if (ancestorCandidates.length === 0) {
          let svgContainsAll = true;
          for (const childEl of childElements) {
            if (!svg.contains(childEl)) {
              svgContainsAll = false;
              break;
            }
          }
          if (svgContainsAll) {
            // Use SVG root as the boundary (fallback if no parent group exists)
            selectedGroup = svg;
          }
        } else {
          for (const candidate of ancestorCandidates) {
            const className = candidate instanceof SVGElement ? (typeof candidate.className === 'string' ? candidate.className : (candidate.className as unknown as SVGAnimatedString).baseVal) : '';
            const hasShapes = !!candidate.querySelector('rect, circle, ellipse, polygon, path');
            
            // Prefer groups with shapes or boundary/container/system classes
            if (hasShapes || className.includes('boundary') || className.includes('container') || className.includes('system')) {
              selectedGroup = candidate;
              break;
            }
            
            // Otherwise, take the first (outermost) ancestor as fallback
            if (!selectedGroup) {
              selectedGroup = candidate;
            }
          }
        }
        
        if (selectedGroup && !nodeIdMap.has(boundaryAlias)) {
          nodeIdMap.set(boundaryAlias, selectedGroup);
        }
      }
    }
  }
  
  // Third pass: set data-id attributes on the extracted elements
  // Also handle special mappings (e.g., "merge" in git graphs maps to merge commit)
  const mergeToCommitMap: Map<string, string> = new Map();
  if (diagramType === 'gitGraph' && mermaidText) {
    // Map "merge" to the commit after merge operations
    const mergePattern = /merge\s+([A-Za-z0-9_]+)/g;
    const mergeLines = mermaidText.split('\n');
    mergePattern.lastIndex = 0;
    // Find the first merge operation and map "merge" to its commit
    let mergeMatch: RegExpExecArray | null;
    while ((mergeMatch = mergePattern.exec(mermaidText)) !== null) {
      const mergeLineIdx = mergeLines.findIndex(line => line.includes(mergeMatch![0]));
      if (mergeLineIdx >= 0 && mergeLineIdx < mergeLines.length - 1) {
        const nextLine = mergeLines[mergeLineIdx + 1];
        const commitAfterMerge = nextLine.match(/commit\s+id:\s*"([^"]+)"/);
        if (commitAfterMerge && commitAfterMerge[1] && nodeIdMap.has(commitAfterMerge[1])) {
          // Map "merge" to the commit after the merge operation (typically the first merge)
          if (!mergeToCommitMap.has('merge')) {
            mergeToCommitMap.set('merge', commitAfterMerge[1]);
          }
        }
      }
    }
  }
  
  for (const [nodeId, el] of nodeIdMap) {
    el.setAttribute("data-id", nodeId);
  }
  
  // Set data-id for special mappings (e.g., "merge" in git graphs)
  for (const [specialAlias, mappedNodeId] of mergeToCommitMap.entries()) {
    const mappedEl = nodeIdMap.get(mappedNodeId);
    if (mappedEl) {
      // Map "merge" to the merge commit element
      nodeIdMap.set(specialAlias, mappedEl);
      mappedEl.setAttribute("data-id", specialAlias);
    }
  }
    
    // Set data-id for special mappings (e.g., "merge" in git graphs)
    for (const [specialAlias, mappedNodeId] of mergeToCommitMap.entries()) {
      const mappedEl = nodeIdMap.get(mappedNodeId);
      if (mappedEl) {
        // Set data-id="merge" on the element mapped to the merge commit
        // This allows targeting "merge" to find the merge commit
        mappedEl.setAttribute("data-id-merge", specialAlias);
        // Also check if we should create a separate mapping or use the same element
        // For now, we'll also set data-id="merge" if it's not already set
        if (!nodeIdMap.has(specialAlias)) {
          nodeIdMap.set(specialAlias, mappedEl);
          mappedEl.setAttribute("data-id", specialAlias);
        }
      }
    }
    
}

const createDiagramHandle = (container: HTMLElement, svg: SVGSVGElement, strategy: DiagramStrategy): DiagramHandle => {
  return {
    getRoot: () => svg,
    getContainer: () => container,
    resolveTarget: (target: TargetDescriptor) => resolveTarget({ getRoot: () => svg, getStrategy: () => strategy } as DiagramHandle, target),
    getStrategy: () => strategy,
    destroy: () => {
      container.innerHTML = "";
    }
  };
};

function extractC4AliasesFromText(mermaidText: string): Set<string> {
  const aliases = new Set<string>();
  // Extract aliases from C4 syntax: Component(alias, ...), Container(alias, ...), Person(alias, ...), System(alias, ...), etc.
  const c4Patterns = [
    /Component\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /Container\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /Person\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /System\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /System_Ext\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /SystemDb\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /Container_Boundary\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
    /System_Boundary\s*\(\s*([A-Za-z0-9_]+)\s*,/g,
  ];
  
  for (const pattern of c4Patterns) {
    // Reset regex lastIndex to avoid issues with global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(mermaidText)) !== null) {
      aliases.add(match[1]);
    }
  }
  
  return aliases;
}

export const createMermaidDiagramAdapter = (): DiagramAdapter => {
  return {
    async render({ mountEl, mermaidText }) {
      const mermaid = (window as Window & { mermaid?: { render: Function; run?: Function } }).mermaid;
      if (!mermaid || typeof mermaid.render !== "function") {
        throw new MPFError("Mermaid is not available on window.mermaid", "MPF_MERMAID_UNAVAILABLE");
      }
      const renderId = `finsteps-${Math.random().toString(36).slice(2, 8)}`;
      let renderResult;
      try {
        renderResult = await mermaid.render(renderId, mermaidText);
      } catch (error) {
        throw new MPFError(`Failed to render Mermaid diagram: ${error}`, "MPF_MERMAID_RENDER_FAILED");
      }
      const { svg } = renderResult;
      mountEl.innerHTML = "";
      const container = document.createElement("div");
      container.className = "finsteps-diagram";
      container.tabIndex = 0;
      container.setAttribute("role", "application");
      container.innerHTML = svg;
      mountEl.appendChild(container);
      const svgElement = container.querySelector("svg");
      if (!svgElement) {
        throw new MPFError(
          "Mermaid render did not return an SVG element",
          "MPF_MERMAID_RENDER_FAILED"
        );
      }
      const diagramType = detectDiagramType(mermaidText);
      const strategy = strategyRegistry.getOrDefault(diagramType);
      ensureDataIdFromMermaidIds(svgElement, strategy, mermaidText);
      
      // Ensure SVG has width/height attributes for proper rendering with viewBox
      // Remove any existing width/height so viewBox can control scaling
      // When using viewBox, we want the SVG to scale to container size
      // Setting width/height to 100% allows viewBox to control the aspect ratio
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");
      svgElement.setAttribute("width", "100%");
      svgElement.setAttribute("height", "100%");
      // Also ensure preserveAspectRatio is set for proper scaling
      if (!svgElement.getAttribute("preserveAspectRatio")) {
        svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
      
      // Ensure SVG has a proper viewBox if Mermaid didn't set one
      const existingViewBox = svgElement.getAttribute("viewBox");
      let initialViewBox = existingViewBox;
      if (!existingViewBox || existingViewBox === "0 0 0 0") {
        // Calculate initial viewBox from content
        const rootGroup = svgElement.querySelector("g");
        if (rootGroup) {
          try {
            const bbox = rootGroup.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
              const padding = 40;
              initialViewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`;
              svgElement.setAttribute("viewBox", initialViewBox);
            }
          } catch {
            // getBBox failed, try using width/height attributes
            const width = svgElement.getAttribute("width");
            const height = svgElement.getAttribute("height");
            if (width && height) {
              const w = parseFloat(width) || 1000;
              const h = parseFloat(height) || 1000;
              initialViewBox = `0 0 ${w} ${h}`;
              svgElement.setAttribute("viewBox", initialViewBox);
            }
          }
        }
      }
      
      // Store the initial viewBox for fitAll() to use later
      if (initialViewBox) {
        svgElement.setAttribute("data-initial-viewbox", initialViewBox);
      }
      
      return createDiagramHandle(container, svgElement, strategy);
    }
  };
};
