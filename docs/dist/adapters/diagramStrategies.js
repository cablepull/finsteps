/**
 * Base class for diagram strategies with common helper methods
 */
export class BaseDiagramStrategy {
    /**
     * Helper: Extract node ID from Mermaid's generated ID using patterns
     */
    extractIdFromPatterns(id, patterns) {
        for (const pattern of patterns) {
            const match = id.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    /**
     * Helper: Get element's class name as a string
     */
    getElementClassName(el) {
        if (typeof el.className === 'string') {
            return el.className;
        }
        return el.className.baseVal;
    }
    /**
     * Helper: Check if element has any of the targetable classes
     */
    hasTargetableClass(el) {
        const className = this.getElementClassName(el);
        const targetableClasses = this.getTargetableClasses();
        return targetableClasses.some(targetClass => className.includes(targetClass));
    }
    /**
     * Helper: Escape a CSS selector value
     */
    escapeSelector(value) {
        if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
            return CSS.escape(value);
        }
        return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    }
}
//# sourceMappingURL=diagramStrategies.js.map