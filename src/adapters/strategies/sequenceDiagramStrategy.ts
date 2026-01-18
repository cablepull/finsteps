import { DiagramType } from "../diagramTypeDetector.js";
import { BaseDiagramStrategy } from "../diagramStrategies.js";

/**
 * Strategy for sequence diagrams
 * Handles participants, messages, activations, and notes
 */
export class SequenceDiagramStrategy extends BaseDiagramStrategy {
  getDiagramType(): DiagramType {
    return 'sequenceDiagram';
  }
  
  getTargetableClasses(): string[] {
    return ['participant', 'message', 'activation', 'note'];
  }
  
  getTargetableTags(): string[] {
    return ['g', 'rect', 'text'];
  }
  
  extractNodeIds(svg: SVGSVGElement): Map<string, SVGElement> {
    const nodeIdMap = new Map<string, SVGElement>();
    
    // Patterns for sequence diagram IDs
    const patterns = [
      /^participant-([A-Za-z0-9_]+)-\d+$/,  // participant-name-digit
      /^actor-([A-Za-z0-9_]+)-\d+$/,       // actor-name-digit
      /^message-([A-Za-z0-9_]+)-\d+$/,     // message-name-digit
      /^activation-([A-Za-z0-9_]+)-\d+$/,   // activation-name-digit
      /^note-([A-Za-z0-9_]+)-\d+$/,        // note-name-digit
      /^([A-Za-z0-9_]+)-\d+$/,             // name-digit (fallback)
    ];
    
    // First pass: find all elements with ids and extract node ids
    for (const el of Array.from(svg.querySelectorAll<SVGElement>("[id]"))) {
      const id = el.getAttribute("id");
      if (!id) continue;
      
      let nodeId: string | null = this.extractIdFromPatterns(id, patterns);
      
      if (nodeId && !nodeIdMap.has(nodeId)) {
        // Find the group that contains this element
        let current: Element | null = el;
        let nodeGroup: SVGElement | null = null;
        
        // Walk up the tree to find the participant/message/activation/note group
        while (current && current !== svg) {
          if (current instanceof SVGElement && current.tagName === "g") {
            const className = this.getElementClassName(current);
            if (className && (className.includes('participant') || className.includes('actor') || 
                className.includes('message') || className.includes('activation') || className.includes('note'))) {
              nodeGroup = current;
              break;
            }
          }
          current = current.parentElement;
        }
        
        // If we found a group, use it
        if (nodeGroup) {
          nodeIdMap.set(nodeId, nodeGroup);
        } else if (el.tagName === "g" && this.hasTargetableClass(el)) {
          nodeIdMap.set(nodeId, el);
        }
      }
    }
    
    return nodeIdMap;
  }
  
  getTargetSelectors(dataId: string): string[] {
    const escapedId = this.escapeSelector(dataId);
    return [
      `g.participant[data-id="${escapedId}"]`,
      `g.actor[data-id="${escapedId}"]`,
      `g.message[data-id="${escapedId}"]`,
      `g.activation[data-id="${escapedId}"]`,
      `g.note[data-id="${escapedId}"]`,
      `line[data-id="${escapedId}"]`,
      `text[data-id="${escapedId}"]`,
      `g[class*="participant"][data-id="${escapedId}"]`,
      `g[class*="actor"][data-id="${escapedId}"]`,
      `g[class*="message"][data-id="${escapedId}"]`,
      `g[class*="activation"][data-id="${escapedId}"]`,
      `g[class*="note"][data-id="${escapedId}"]`,
      `[data-id="${escapedId}"]`, // Fallback
    ];
  }
  
  findAdjacentElements(target: SVGGraphicsElement, svg: SVGSVGElement): SVGGraphicsElement[] {
    const targetDataId = target.getAttribute('data-id');
    if (!targetDataId) return [];
    
    const targetClassName = this.getElementClassName(target);
    
    // For participants: find messages connected to them
    if (targetClassName && (targetClassName.includes('participant') || targetClassName.includes('actor'))) {
      // Find all messages that reference this participant
      const allMessages = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="message"][data-id]'));
      const connectedMessages: SVGGraphicsElement[] = [];
      
      for (const message of allMessages) {
        // Check if message is visually near this participant (simplified heuristic)
        try {
          const targetBbox = target.getBBox();
          const messageBbox = message.getBBox();
          
          // Check if message intersects or is near participant
          const intersects = 
            messageBbox.x < targetBbox.x + targetBbox.width &&
            messageBbox.x + messageBbox.width > targetBbox.x &&
            messageBbox.y < targetBbox.y + targetBbox.height &&
            messageBbox.y + messageBbox.height > targetBbox.y;
          
          if (intersects) {
            connectedMessages.push(message);
          }
        } catch {
          continue;
        }
      }
      
      return connectedMessages;
    }
    
    // For messages: find the participants they connect
    if (targetClassName && targetClassName.includes('message')) {
      const allParticipants = Array.from(svg.querySelectorAll<SVGGraphicsElement>('g[class*="participant"][data-id], g[class*="actor"][data-id]'));
      const connectedParticipants: SVGGraphicsElement[] = [];
      
      try {
        const messageBbox = target.getBBox();
        
        for (const participant of allParticipants) {
          try {
            const participantBbox = participant.getBBox();
            
            // Check if message intersects or is near participant
            const intersects = 
              messageBbox.x < participantBbox.x + participantBbox.width &&
              messageBbox.x + messageBbox.width > participantBbox.x &&
              messageBbox.y < participantBbox.y + participantBbox.height &&
              messageBbox.y + messageBbox.height > participantBbox.y;
            
            if (intersects) {
              connectedParticipants.push(participant);
            }
          } catch {
            continue;
          }
        }
      } catch {
        return [];
      }
      
      return connectedParticipants;
    }
    
    // For activations: find the participant they belong to
    if (targetClassName && targetClassName.includes('activation')) {
      // Find parent participant
      let current: Element | null = target.parentElement;
      while (current && current !== svg) {
        if (current instanceof SVGGraphicsElement) {
          const className = this.getElementClassName(current);
          if (className && (className.includes('participant') || className.includes('actor'))) {
            return [current];
          }
        }
        current = current.parentElement;
      }
    }
    
    // Default: return empty array
    return [];
  }
}
